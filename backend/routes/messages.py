import asyncio
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import db, Conversation, Message
from services.context_manager import count_tokens
from services.buffer_memory import BufferMemory
from services.chain_builder import run_conversation
from services.memory_manager import get_memory_strategy
from services.chain_builder import run_sequential_chain
from services.chain_builder import run_parallel_chain, stream_parallel

from services.chain_builder import run_branching_chain
from services.personas import get_persona

msg_bp = Blueprint("messages", __name__)


def _get_owned_conversation(conv_id: str):
    conv = Conversation.query.get_or_404(conv_id)
    if conv.user_id != get_jwt_identity():
        return None
    return conv


def _auto_title(conv, text: str):
    """Name an untitled chat from its first question (truncated)."""
    if conv.title in (None, "", "New Conversation") and text:
        cleaned = " ".join(text.split())
        conv.title = cleaned[:60] + ("…" if len(cleaned) > 60 else "")


def _touch(conv: Conversation):
    """Bump last-activity so the sidebar shows when it was last replied to."""
    conv.updated_at = datetime.utcnow()

# normal chain implementation
@msg_bp.route("/<conv_id>/message", methods=["POST"])
@jwt_required()
def send_message(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = data.get("message", "")

    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=user_text,
        token_count=count_tokens(user_text),
    )
    db.session.add(user_msg)
    _auto_title(conv, user_text)
    _touch(conv)
    db.session.commit()

    strategy = get_memory_strategy(conv.memory_type)
    strategy.update(conv_id, user_text, source_message_id=user_msg.id)
    history = strategy.get_history(conv_id)
    memory_context = strategy.get_memory_text(conv_id)
    persona = get_persona(conv.persona)
    reply_text = run_conversation(user_text, history, memory_context, system_prompt=persona.system_prompt)

    ai_msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content=reply_text,
        token_count=count_tokens(reply_text),
    )
    
    db.session.add(ai_msg)
    _touch(conv)
    db.session.commit()

    return jsonify({
        "user_message": user_msg.to_dict(),
        "ai_message": ai_msg.to_dict(),
        "conversation": conv.to_dict(),
    })

@msg_bp.route("/<conv_id>/message/stream", methods=["POST"])
@jwt_required()
def send_message_stream(conv_id):
    """SSE-streamed reply.

    Wire format (text/event-stream):
      event: user_message  data: {...saved user Message...}
      event: token         data: {"delta": "text chunk"}
      event: done          data: {...saved assistant Message...}
      event: error         data: {"error": "..."}
    Listen with fetch() + ReadableStream (EventSource only supports GET).
    """
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = (data.get("message") or "").strip()
    if not user_text:
        return jsonify({"error": "empty message"}), 400

    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=user_text,
        token_count=count_tokens(user_text),
    )
    db.session.add(user_msg)
    _auto_title(conv, user_text)
    _touch(conv)
    db.session.commit()

    strategy = get_memory_strategy(conv.memory_type)
    history = strategy.get_history(conv_id)
    memory_context = strategy.get_memory_text(conv_id)
    persona = get_persona(conv.persona)

    def event(name: str, payload) -> str:
        return f"event: {name}\ndata: {json.dumps(payload)}\n\n"

    # Snapshot while the request session is still alive — the streamed
    # response runs after teardown, where lazy loads (conv.messages) fail.
    conv_snapshot = conv.to_dict()

    def generate():
        yield event("user_message", user_msg.to_dict())
        yield event("conversation", conv_snapshot)

        # Pipeline: reply streams while entity/kg/summary extraction runs
        # concurrently (per the conversation's memory type).
        stream = stream_parallel(
            conv_id,
            user_text,
            history,
            memory_context,
            system_prompt=persona.system_prompt,
            memory_type=conv.memory_type,
            source_message_id=user_msg.id,
        )
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        parts = []
        try:
            while True:
                chunk = loop.run_until_complete(stream.__anext__())
                parts.append(chunk)
                yield event("token", {"delta": chunk})
        except StopAsyncIteration:
            pass
        except Exception as exc:
            db.session.rollback()
            yield event("error", {"error": str(exc)})
            return
        finally:
            loop.close()

        reply = "".join(parts)
        ai_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=reply,
            token_count=count_tokens(reply),
        )
        db.session.add(ai_msg)
        bound_conv = db.session.merge(conv)  # re-attach so updated_at persists
        _touch(bound_conv)
        db.session.commit()
        yield event("done", ai_msg.to_dict())

    resp = Response(stream_with_context(generate()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    resp.headers["Connection"] = "keep-alive"
    return resp

# sequential chain implementation 
@msg_bp.route("/<conv_id>/message/sequential", methods=["POST"])
@jwt_required()
def send_message_sequential(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = data.get("message", "")

    user_msg = Message(conversation_id=conv_id, role="user", content=user_text, token_count=count_tokens(user_text))
    db.session.add(user_msg)
    db.session.commit()

    history = BufferMemory().get_context(conv_id)
    persona = get_persona(conv.persona)
    reply_text, intent = run_sequential_chain(conv_id, user_text, history, system_prompt=persona.system_prompt)

    ai_msg = Message(conversation_id=conv_id, role="assistant", content=reply_text, token_count=count_tokens(reply_text))
    db.session.add(ai_msg)
    db.session.commit()

    return jsonify({"user_message": user_msg.to_dict(), "ai_message": ai_msg.to_dict(), "detected_intent": intent})

# parallel chain implementation
@msg_bp.route("/<conv_id>/message/parallel", methods=["POST"])
@jwt_required()
def send_message_parallel(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = data.get("message", "")

    user_msg = Message(conversation_id=conv_id, role="user", content=user_text, token_count=count_tokens(user_text))
    db.session.add(user_msg)
    db.session.commit()

    history = BufferMemory().get_context(conv_id)
    persona = get_persona(conv.persona)
    reply = run_parallel_chain(
        conv_id,
        user_text,
        history,
        system_prompt=persona.system_prompt,
        memory_type=conv.memory_type,
        source_message_id=user_msg.id,
    )

    ai_msg = Message(conversation_id=conv_id, role="assistant", content=reply, token_count=count_tokens(reply))
    db.session.add(ai_msg)
    db.session.commit()

    return jsonify({
        "user_message": user_msg.to_dict(),
        "ai_message": ai_msg.to_dict(),
        "memory_type": conv.memory_type,
    })



@msg_bp.route("/<conv_id>/message/branching", methods=["POST"])
@jwt_required()
def send_message_branching(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = data.get("message", "")

    user_msg = Message(conversation_id=conv_id, role="user", content=user_text, token_count=count_tokens(user_text))
    db.session.add(user_msg)
    db.session.commit()

    history = BufferMemory().get_context(conv_id)
    persona = get_persona(conv.persona)
    reply_text, route = run_branching_chain(conv_id, user_text, history, system_prompt=persona.system_prompt)

    ai_msg = Message(conversation_id=conv_id, role="assistant", content=reply_text, token_count=count_tokens(reply_text))
    db.session.add(ai_msg)
    db.session.commit()

    return jsonify({"user_message": user_msg.to_dict(), "ai_message": ai_msg.to_dict(), "route_taken": route})