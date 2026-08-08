import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import (
    db, Conversation, Message, Entity, KGTriple, ConversationSummary, PersonaMemory, UserPersona,
)
from services.personas import get_persona, list_personas as get_all_personas, effective_memory_type
from services.memory_manager import STRATEGIES
from services.memory_backfill import ensure_backfill

logger = logging.getLogger(__name__)

conv_bp = Blueprint("conversations", __name__)


def _current_user_id() -> str:
    return get_jwt_identity()


def _get_owned_conversation(conv_id: str) -> Conversation:
    conv = Conversation.query.get_or_404(conv_id)
    current_user_id = _current_user_id()

    # Conversations created before user ownership was introduced have a NULL
    # owner.  A user can recover one only by opening its unguessable UUID URL;
    # once recovered it is permanently attached to that user and will appear
    # in their chat list on every subsequent refresh.
    if conv.user_id is None:
        conv.user_id = current_user_id
        db.session.commit()

    if conv.user_id != current_user_id:
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
        memory_type=data.get("memory_type")
        or effective_memory_type(_current_user_id(), persona.id),
        persona=persona.id,
    )
    db.session.add(conv)
    db.session.commit()
    return jsonify(conv.to_dict()), 201


@conv_bp.route("/personas", methods=["GET"])
def list_personas():
    return jsonify(get_all_personas())


@conv_bp.route("/personas/custom", methods=["GET"])
@jwt_required()
def list_custom_personas():
    personas = UserPersona.query.filter_by(user_id=_current_user_id()) \
        .order_by(UserPersona.created_at.asc()).all()
    return jsonify([persona.to_dict() for persona in personas])


@conv_bp.route("/personas/custom", methods=["POST"])
@jwt_required()
def create_custom_persona():
    data = request.get_json() or {}
    name = str(data.get("name", "")).strip()
    system_prompt = str(data.get("system", "")).strip()
    icon = data.get("icon", 0)

    if not name:
        return jsonify({"error": "persona name is required"}), 400
    if len(name) > 80:
        return jsonify({"error": "persona name must be 80 characters or fewer"}), 400
    if len(system_prompt) > 4000:
        return jsonify({"error": "system instructions must be 4000 characters or fewer"}), 400
    if not isinstance(icon, int) or not 0 <= icon <= 5:
        return jsonify({"error": "invalid persona icon"}), 400

    persona = UserPersona(
        user_id=_current_user_id(),
        name=name,
        system_prompt=system_prompt,
        icon=icon,
    )
    db.session.add(persona)
    db.session.commit()
    return jsonify(persona.to_dict()), 201


@conv_bp.route("/personas/memory", methods=["GET"])
@jwt_required()
def list_persona_memory_overrides():
    """All of the current user's per-persona memory overrides."""
    rows = PersonaMemory.query.filter_by(user_id=_current_user_id()).all()
    return jsonify({r.persona_id: r.memory_type for r in rows})


@conv_bp.route("/personas/<persona_id>/memory", methods=["PUT"])
@jwt_required()
def set_persona_memory(persona_id):
    persona = get_persona(persona_id)
    data = request.get_json() or {}
    memory_type = data.get("memory_type", "")
    if memory_type not in STRATEGIES:
        return jsonify({"error": f"unknown memory type: {memory_type}"}), 400
    row = PersonaMemory.query.filter_by(
        user_id=_current_user_id(), persona_id=persona.id
    ).first()
    if not row:
        row = PersonaMemory(user_id=_current_user_id(), persona_id=persona.id)
        db.session.add(row)
    row.memory_type = memory_type
    db.session.commit()
    return jsonify({persona.id: memory_type})


@conv_bp.route("/personas/<persona_id>/memory", methods=["DELETE"])
@jwt_required()
def reset_persona_memory(persona_id):
    persona = get_persona(persona_id)
    row = PersonaMemory.query.filter_by(
        user_id=_current_user_id(), persona_id=persona.id
    ).first()
    if row:
        db.session.delete(row)
        db.session.commit()
    return "", 204


@conv_bp.route("/<conv_id>", methods=["GET"])
@jwt_required()
def get_conversation(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    messages = (
        Message.query.filter_by(conversation_id=conv_id)
        .order_by(Message.created_at.asc(), Message.id)
        .all()
    )
    return jsonify({**conv.to_dict(), "messages": [m.to_dict() for m in messages]})


@conv_bp.route("/<conv_id>", methods=["PUT"])
@jwt_required()
def update_conversation(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    data = request.get_json() or {}
    changed_memory_type = False
    if "title" in data:
        conv.title = data["title"]
    if "memory_type" in data:
        conv.memory_type = data["memory_type"]
        changed_memory_type = True
    if "persona" in data:
        # Switching persona mid-chat adopts that persona's memory:
        # the user's saved preference for it, otherwise its built-in default.
        conv.persona = get_persona(data["persona"]).id
        if "memory_type" not in data:
            conv.memory_type = effective_memory_type(_current_user_id(), conv.persona)
        changed_memory_type = True
    db.session.commit()

    # If the strategy switch needs a structured index (entity/KG), replay the
    # existing history into it in the background — once per strategy.
    if changed_memory_type:
        ensure_backfill(conv.id, conv.memory_type)

    return jsonify(conv.to_dict())


@conv_bp.route("/<conv_id>", methods=["DELETE"])
@jwt_required()
def delete_conversation(conv_id):
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404
    try:
        db.session.delete(conv)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("delete conversation %s failed: %s", conv_id, exc)
        return jsonify({"error": "Failed to delete this conversation. Please try again."}), 500
    return "", 204


@conv_bp.route("/<conv_id>/memory", methods=["GET"])
@jwt_required()
def get_memory_insights(conv_id):
    """Everything the memory layer currently knows about this thread:
    entities, knowledge-graph triples, rolling summary, token counts.
    """
    conv = _get_owned_conversation(conv_id)
    if not conv:
        return jsonify({"error": "conversation not found"}), 404

    entities = [
        {
            "id": e.id,
            "name": e.name,
            "type": e.entity_type or "other",
            "description": e.description or "",
        }
        for e in Entity.query.filter_by(conversation_id=conv_id)
        .order_by(Entity.name.asc())
        .all()
    ]

    node_ids: dict[str, str] = {}
    nodes: list[dict] = []
    edges: list[dict] = []

    for t in KGTriple.query.filter_by(conversation_id=conv_id).all():
        for name in (t.subject, t.object):
            key = name.strip().lower()
            if key not in node_ids:
                node_ids[key] = f"n{len(nodes)}"
                nodes.append({"id": node_ids[key], "label": name})
        edges.append(
            {
                "source": node_ids[t.subject.strip().lower()],
                "target": node_ids[t.object.strip().lower()],
                "predicate": t.predicate,
            }
        )

    latest = (
        ConversationSummary.query.filter_by(conversation_id=conv_id)
        .order_by(ConversationSummary.created_at.desc())
        .first()
    )

    messages = conv.messages
    user_tokens = sum(m.token_count or 0 for m in messages if m.role == "user")
    assistant_tokens = sum(m.token_count or 0 for m in messages if m.role == "assistant")

    return jsonify(
        {
            "memory_type": conv.memory_type,
            "entities": entities,
            "graph": {"nodes": nodes, "edges": edges},
            "summary": (
                {
                    "text": latest.summary_text,
                    "created_at": latest.created_at.isoformat(),
                }
                if latest
                else None
            ),
            "tokens": {
                "total": user_tokens + assistant_tokens,
                "user": user_tokens,
                "assistant": assistant_tokens,
                "messages": len(messages),
            },
        }
    )
