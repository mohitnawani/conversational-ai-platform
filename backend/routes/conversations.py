from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import db, Conversation
from services.personas import get_persona, list_personas as get_all_personas

conv_bp = Blueprint("conversations", __name__)


def _current_user_id() -> str:
    return get_jwt_identity()


def _get_owned_conversation(conv_id: str) -> Conversation:
    conv = Conversation.query.get_or_404(conv_id)
    if conv.user_id != _current_user_id():
        return None
    return conv


@conv_bp.route("", methods=["GET"])
@jwt_required()
def list_conversations():
    convs = Conversation.query.filter_by(user_id=_current_user_id()) \
        .order_by(Conversation.updated_at.desc()).all()
    return jsonify([c.to_dict() for c in convs])


@conv_bp.route("", methods=["POST"])
@jwt_required()
def create_conversation():
    data = request.get_json() or {}
    persona_id = data.get("persona", "mentor")
    persona = get_persona(persona_id)
    conv = Conversation(
        user_id=_current_user_id(),
        title=data.get("title", "New Conversation"),
        memory_type=data.get("memory_type", persona.default_memory_type),
        persona=persona.id,
    )
    db.session.add(conv)
    db.session.commit()
    return jsonify(conv.to_dict()), 201


@conv_bp.route("/personas", methods=["GET"])
def list_personas():
    return jsonify(get_all_personas())


@conv_bp.route("/<conv_id>", methods=["GET"])
@jwt_required()
def get_conversation(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    return jsonify({**conv.to_dict(), "messages": [m.to_dict() for m in conv.messages]})


@conv_bp.route("/<conv_id>", methods=["PUT"])
@jwt_required()
def update_conversation(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    if "title" in data:
        conv.title = data["title"]
    if "memory_type" in data:
        conv.memory_type = data["memory_type"]
    if "persona" in data:
        conv.persona = get_persona(data["persona"]).id
        if "memory_type" not in data:
            conv.memory_type = get_persona(data["persona"]).default_memory_type
    db.session.commit()
    return jsonify(conv.to_dict())


@conv_bp.route("/<conv_id>", methods=["DELETE"])
@jwt_required()
def delete_conversation(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    db.session.delete(conv)
    db.session.commit()
    return "", 204