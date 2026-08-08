import asyncio
import json
import threading
import time
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

# Serialize writes per conversation: two requests racing on the same thread
# can interleave user/AI inserts so the stored order reads back wrong
# (e.g. 2,3,1) and the bad order persists after refresh.
_conv_locks: dict[str, threading.Lock] = {}
_conv_locks_guard = threading.Lock()


def _lock_for(conv_id: str) -> threading.Lock:
    with _conv_locks_guard:
        lock = _conv_locks.get(conv_id)
        if lock is None:
            lock = threading.Lock()
            _conv_locks[conv_id] = lock
        return lock


def _friendly_llm_error(exc: Exception) -> str:
    """Map raw provider exceptions (raw Google JSON, stack noise) to a line a
    user can act on. The full traceback is still logged server-side."""
    print(f"[llm] provider error: {type(exc).__name__}: {exc}", flush=True)
    raw = str(exc)
    lowered = raw.lower()
    if "429" in raw or "resource_exhausted" in lowered or "rate" in lowered or "quota" in lowered:
        return "The AI service is busy right now. Please wait a moment and try again."
    if ("token limit" in lowered or "maximum context" in lowered or "too many tokens" in lowered
            or "too long" in lowered or "exceeds the" in lowered
            or "exceeds the limit" in lowered):
        return "This message is too long for the AI model. Please shorten it and try again."
    if "404" in raw or "no longer available" in lowered or "not found" in lowered and "model" in lowered:
        return "The AI model is unavailable right now. Please try again later."
    if "401" in raw or "403" in raw or "api key" in lowered or "authentication" in lowered:
        return "AI service authentication failed. Please check the server configuration."
    if "timeout" in lowered or "timed out" in lowered or "deadline" in lowered:
        return "The AI took too long to respond. Please try again."
    return "Something went wrong while generating the reply. Please try again."


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


def _system_prompt_for_request(data: dict, conversation: Conversation) -> str:
    """Use a browser-created persona for this reply, when supplied safely."""
    custom_prompt = data.get("system_prompt")
    if isinstance(custom_prompt, str) and custom_prompt.strip():
        # Bound the input so a persona cannot turn a request into an oversized
        # prompt. Custom personas themselves remain in browser storage.
        return custom_prompt.strip()[:4000]
    return get_persona(conversation.persona).system_prompt

# normal chain implementation
@msg_bp.route("/<conv_id>/message", methods=["POST"])
@jwt_required()
def send_message(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = data.get("message", "")

    with _lock_for(conv_id):
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

        try:
            strategy = get_memory_strategy(conv.memory_type)
            # Memory extraction also calls the model — it must be inside the
            # guard too, or a quota/model error here becomes a raw 500.
            strategy.update(conv_id, user_text, source_message_id=user_msg.id)
            history = strategy.get_history(conv_id)
            memory_context = strategy.get_memory_text(conv_id)
            reply_text = run_conversation(
                user_text, history, memory_context,
                system_prompt=_system_prompt_for_request(data, conv),
            )
        except Exception as exc:
            db.session.rollback()
            return jsonify({"error": _friendly_llm_error(exc)}), 502

        # Empty replies become invisible bubbles on the client — reject them
        # explicitly instead of saving a blank turn.
        if not reply_text.strip():
            return jsonify({
                "error": "The AI didn't return a reply. Please try again.",
            }), 502

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
    """SSE-streamed reply — Gemini tokens go to the browser one by one.

    Wire format (text/event-stream):
      event: user_message  data: {...saved user Message...}
      event: conversation  data: {...conversation snapshot...}
      event: token         data: {"delta": "chunk"}
      event: done          data: {...saved assistant Message...}
      event: error         data: {"error": "..."}
    While the model is thinking, bare `: ping` comments keep the connection
    alive (frontend ignores anything that isn't an event: line; EventSource
    only supports GET, so the browser listens with fetch + ReadableStream).
    """
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = (data.get("message") or "").strip()
    if not user_text:
        return jsonify({"error": "empty message"}), 400

    # Hold the per-conversation lock for the whole exchange (user insert ->
    # LLM -> ai insert). Fast consecutive sends would otherwise interleave
    # and persist the wrong turn order (e.g. 2,3,1).
    lock = _lock_for(conv_id)
    lock.acquire()
    try:
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
        system_prompt = _system_prompt_for_request(data, conv)

        def event(name: str, payload) -> str:
            return f"event: {name}\ndata: {json.dumps(payload)}\n\n"

        # Snapshot while the request session is still alive — the streamed
        # response runs after teardown, where lazy loads (conv.messages) fail.
        conv_snapshot = conv.to_dict()
        # Commit cadence for the token stream: persist a batch of Gemini
        # chunks before those tokens reach the browser, so the reply column
        # in the DB is always as far along as the text on screen — a refresh
        # or crash can never leave a visible answer unpersisted.
        token_batch = 8
        token_batch_seconds = 0.35

        def generate():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                yield event("user_message", user_msg.to_dict())
                yield event("conversation", conv_snapshot)

                # Placeholder row: gives the streaming reply a stable id;
                # every batch commit below grows `content` incrementally.
                ai_msg = Message(
                    conversation_id=conv_id,
                    role="assistant",
                    content="",
                    token_count=0,
                )
                db.session.add(ai_msg)
                db.session.flush()

                stream = stream_parallel(
                    conv_id,
                    user_text,
                    history,
                    memory_context,
                    system_prompt=system_prompt,
                    memory_type=conv.memory_type,
                    source_message_id=user_msg.id,
                )
                parts: list[str] = []
                pending: list[str] = []
                last_commit = time.time()
                try:
                    while True:
                        try:
                            chunk = loop.run_until_complete(
                                asyncio.wait_for(stream.__anext__(), 15)
                            )
                        except asyncio.TimeoutError:
                            # Model is still thinking with no output yet: an
                            # SSE comment (handled nowhere by the frontend)
                            # keeps gunicorn's silence timeout from killing
                            # the worker mid-reply.
                            yield ": ping\n\n"
                            continue
                        parts.append(chunk)
                        pending.append(chunk)
                        if (
                            len(pending) >= token_batch
                            or time.time() - last_commit >= token_batch_seconds
                        ):
                            ai_msg.content = "".join(parts)
                            db.session.commit()
                            last_commit = time.time()
                            for c in pending:
                                yield event("token", {"delta": c})
                            pending = []
                except StopAsyncIteration:
                    pass
                except Exception as exc:
                    db.session.rollback()
                    yield event("error", {"error": _friendly_llm_error(exc)})
                    return
                finally:
                    loop.close()

                # An empty reply (model returned no text) must never become an
                # empty bubble: remove the placeholder row (whitespace-only
                # batches may already be committed) and surface a friendly
                # error instead of a silent blank message.
                if not "".join(parts).strip():
                    db.session.query(Message).filter(Message.id == ai_msg.id).delete()
                    db.session.commit()
                    yield event("error", {
                        "error": "The AI didn't return a reply. Please try again.",
                    })
                    return

                # Tail flush, then mark the reply durable before `done` so the
                # browser never shows more than what survives a refresh.
                ai_msg.content = "".join(parts)
                ai_msg.token_count = count_tokens(ai_msg.content)
                # Re-fetch, not merge: merging the detached conversation would
                # trigger the delete-orphan cascade and sweep just-inserted
                # messages away.
                bound_conv = db.session.get(Conversation, conv_id)
                _touch(bound_conv)
                db.session.commit()
                for c in pending:
                    yield event("token", {"delta": c})
                yield event("done", ai_msg.to_dict())
            finally:
                lock.release()

        resp = Response(stream_with_context(generate()), mimetype="text/event-stream")
        resp.headers["Cache-Control"] = "no-cache"
        resp.headers["X-Accel-Buffering"] = "no"
        resp.headers["Connection"] = "keep-alive"
        return resp
    except Exception:
        lock.release()
        raise

# sequential chain implementation 
@msg_bp.route("/<conv_id>/message/sequential", methods=["POST"])
@jwt_required()
def send_message_sequential(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    user_text = data.get("message", "")

    with _lock_for(conv_id):
        user_msg = Message(conversation_id=conv_id, role="user", content=user_text, token_count=count_tokens(user_text))
        db.session.add(user_msg)
        db.session.commit()

        history = BufferMemory().get_context(conv_id)
        persona = get_persona(conv.persona)
        try:
            reply_text, intent = run_sequential_chain(conv_id, user_text, history, system_prompt=persona.system_prompt)
        except Exception as exc:
            db.session.rollback()
            return jsonify({"error": _friendly_llm_error(exc)}), 502

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

    with _lock_for(conv_id):
        user_msg = Message(conversation_id=conv_id, role="user", content=user_text, token_count=count_tokens(user_text))
        db.session.add(user_msg)
        db.session.commit()

        history = BufferMemory().get_context(conv_id)
        persona = get_persona(conv.persona)
        try:
            reply = run_parallel_chain(
                conv_id,
                user_text,
                history,
                system_prompt=persona.system_prompt,
                memory_type=conv.memory_type,
                source_message_id=user_msg.id,
            )
        except Exception as exc:
            db.session.rollback()
            return jsonify({"error": _friendly_llm_error(exc)}), 502

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

    with _lock_for(conv_id):
        user_msg = Message(conversation_id=conv_id, role="user", content=user_text, token_count=count_tokens(user_text))
        db.session.add(user_msg)
        db.session.commit()

        history = BufferMemory().get_context(conv_id)
        persona = get_persona(conv.persona)
        try:
            reply_text, route = run_branching_chain(conv_id, user_text, history, system_prompt=persona.system_prompt)
        except Exception as exc:
            db.session.rollback()
            return jsonify({"error": _friendly_llm_error(exc)}), 502

        ai_msg = Message(conversation_id=conv_id, role="assistant", content=reply_text, token_count=count_tokens(reply_text))
        db.session.add(ai_msg)
        db.session.commit()

        return jsonify({"user_message": user_msg.to_dict(), "ai_message": ai_msg.to_dict(), "route_taken": route})
