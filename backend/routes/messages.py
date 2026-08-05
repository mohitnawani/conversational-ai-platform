from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import db, Conversation, Message
from services.context_manager import count_tokens
from services.buffer_memory import BufferMemory
from services import summary_memory
from services import entity_memory
from services.chain_builder import run_conversation
from services import kg_memory
from services.memory_manager import get_memory_strategy
from services.chain_builder import run_sequential_chain
from services.chain_builder import run_parallel_chain

from services.chain_builder import run_branching_chain
from services.personas import get_persona

msg_bp = Blueprint("messages", __name__)


def _get_owned_conversation(conv_id: str):
    conv = Conversation.query.get_or_404(conv_id)
    if conv.user_id != get_jwt_identity():
        return None
    return conv

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
    db.session.commit()

    return jsonify({"user_message": user_msg.to_dict(), "ai_message": ai_msg.to_dict()})

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
    result = run_parallel_chain(conv_id, user_text, history, system_prompt=persona.system_prompt)

    ai_msg = Message(conversation_id=conv_id, role="assistant", content=result["reply"], token_count=count_tokens(result["reply"]))
    db.session.add(ai_msg)
    db.session.commit()

    return jsonify({
        "user_message": user_msg.to_dict(),
        "ai_message": ai_msg.to_dict(),
        "entity_context": result["entity_context"],
        "kg_context": result["kg_context"],
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