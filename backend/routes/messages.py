from flask import Blueprint, request, jsonify
from models.database import db, Conversation, Message
from services.context_manager import count_tokens
from services.buffer_memory import BufferMemory
from services import summary_memory
from services import entity_memory
from services.chain_builder import run_conversation

msg_bp = Blueprint("messages", __name__)

@msg_bp.route("/<conv_id>/message", methods=["POST"])
def send_message(conv_id):
    conv = Conversation.query.get_or_404(conv_id)
    data = request.get_json() or {}
    user_text = data.get("message", "")

    user_msg = Message(
        conversation_id=conv_id, role="user", content=user_text,
        token_count=count_tokens(user_text),
    )
    db.session.add(user_msg)
    db.session.commit()

    if conv.memory_type == "summary":
        summary_memory.maybe_summarize(conv_id)
        ctx = summary_memory.get_context(conv_id)
        history = ctx["recent_messages"]
        memory_context = f"Conversation summary so far: {ctx['summary']}" if ctx["summary"] else ""

    elif conv.memory_type == "entity":
        entity_memory.update_entities(conv_id, user_text)
        memory_context = entity_memory.get_entity_context(conv_id)
        history = BufferMemory().get_context(conv_id)  # still send recent raw messages too

    else:  # default: buffer
        history = BufferMemory().get_context(conv_id)
        memory_context = ""

    reply_text = run_conversation(user_text, history, memory_context)

    ai_msg = Message(
        conversation_id=conv_id, role="assistant", content=reply_text,
        token_count=count_tokens(reply_text),
    )
    db.session.add(ai_msg)
    db.session.commit()

    return jsonify({"user_message": user_msg.to_dict(), "ai_message": ai_msg.to_dict()})    