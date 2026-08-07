import json
from models.database import db, Entity
from services.llm_client import model, extract_text
from langchain_core.prompts import ChatPromptTemplate

extraction_prompt = ChatPromptTemplate.from_template(
    "Extract all entities (people, organizations, projects, dates, products) mentioned "
    "in this message. For each, give a short factual description based ONLY on what's "
    "stated. Respond ONLY with valid JSON, no other text, in this exact format:\n"
    '[{{"name": "...", "type": "person|org|project|date|other", "description": "..."}}]\n'
    "If no entities are mentioned, respond with: []\n\n"
    "Message: {message}"
)

def _parse_extraction(raw) -> list[dict]:
    raw = extract_text(raw).strip()

    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()

    try:
        extracted = json.loads(raw)
        return extracted if isinstance(extracted, list) else []
    except json.JSONDecodeError:
        return []


def extract_entities(message_text: str) -> list[dict]:
    chain = extraction_prompt | model
    result = chain.invoke({"message": message_text})
    # Gemini can return content as a list of blocks instead of a plain string.
    # Convert it before parsing so SQLAlchemy never receives the raw list.
    return _parse_extraction(result.content)


async def aextract_entities(message_text: str) -> list[dict]:
    """Async entity extraction — no DB access, safe to run concurrently."""
    chain = extraction_prompt | model
    result = await chain.ainvoke({"message": message_text})
    return _parse_extraction(result.content)


def _normalize_name(name: str) -> str:
    return " ".join(name.split()).lower()


def save_entities(conversation_id: str, extracted: list[dict]):
    """Persist already-extracted entities, merging into existing rows."""
    seen = set()
    for item in extracted:
        name = item.get("name", "").strip()
        if not name:
            continue

        key = _normalize_name(name)
        if key in seen:  # same entity listed twice in one message
            continue
        seen.add(key)

        existing = Entity.query.filter(
            Entity.conversation_id == conversation_id,
            db.func.lower(Entity.name) == name.lower(),
        ).first()

        if existing:
            existing.description = item.get("description", existing.description)
            existing.entity_type = item.get("type", existing.entity_type)
        else:
            db.session.add(Entity(
                conversation_id=conversation_id,
                name=name,
                entity_type=item.get("type", "other"),
                description=item.get("description", ""),
            ))

    db.session.commit()


def update_entities(conversation_id: str, message_text: str):
    save_entities(conversation_id, extract_entities(message_text))


def dedupe_entities(conversation_id: str) -> int:
    """Merge existing duplicate rows (case/whitespace variants) into one. Run once."""
    entities = Entity.query.filter_by(conversation_id=conversation_id) \
        .order_by(Entity.created_at).all()

    keepers, removed = {}, 0
    for e in entities:
        key = _normalize_name(e.name)
        if key in keepers:
            keeper = keepers[key]
            if e.description and not keeper.description:
                keeper.description = e.description
            if e.entity_type and keeper.entity_type in (None, "other"):
                keeper.entity_type = e.entity_type
            db.session.delete(e)
            removed += 1
        else:
            keepers[key] = e

    db.session.commit()
    return removed


def get_entity_context(conversation_id: str) -> str:
    entities = Entity.query.filter_by(conversation_id=conversation_id).all()
    if not entities:
        return ""

    lines = [f"- {e.name} ({e.entity_type}): {e.description}" for e in entities]
    return "Known entities:\n" + "\n".join(lines)
