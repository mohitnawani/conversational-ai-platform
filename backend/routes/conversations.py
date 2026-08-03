from flask import Blueprint, request, jsonify
from models.database import db, Conversation

conv_bp = Blueprint("conversations", __name__)

@conv_bp.route("", methods=["POST"])
def create_conversation():
    data = request.get_json() or {}
    conv = Conversation(
        title=data.get("title", "New Conversation"),
        memory_type=data.get("memory_type", "buffer"),
    )
    db.session.add(conv)
    db.session.commit()
    return jsonify(conv.to_dict()), 201

@conv_bp.route("", methods=["GET"])
def list_conversations():
    convs = Conversation.query.order_by(Conversation.updated_at.desc()).all()
    return jsonify([c.to_dict() for c in convs])

@conv_bp.route("/<conv_id>", methods=["GET"])
def get_conversation(conv_id):
    conv = Conversation.query.get_or_404(conv_id)
    return jsonify({**conv.to_dict(), "messages": [m.to_dict() for m in conv.messages]})

@conv_bp.route("/<conv_id>", methods=["PUT"])
def update_conversation(conv_id):
    conv = Conversation.query.get_or_404(conv_id)
    data = request.get_json() or {}
    if "title" in data:
        conv.title = data["title"]
    if "memory_type" in data:
        conv.memory_type = data["memory_type"]
    db.session.commit()
    return jsonify(conv.to_dict())

@conv_bp.route("/<conv_id>", methods=["DELETE"])
def delete_conversation(conv_id):
    conv = Conversation.query.get_or_404(conv_id)
    db.session.delete(conv)
    db.session.commit()
    return "", 204