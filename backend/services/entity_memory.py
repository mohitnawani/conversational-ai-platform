import json
from models.database import db, Entity
from services.llm_client import model
from langchain_core.prompts import ChatPromptTemplate

extraction_prompt = ChatPromptTemplate.from_template(
    "Extract all entities (people, organizations, projects, dates, products) mentioned "
    "in this message. For each, give a short factual description based ONLY on what's "
    "stated. Respond ONLY with valid JSON, no other text, in this exact format:\n"
    '[{{"name": "...", "type": "person|org|project|date|other", "description": "..."}}]\n'
    "If no entities are mentioned, respond with: []\n\n"
    "Message: {message}"
)

def extract_entities(message_text: str) -> list[dict]:
    chain = extraction_prompt | model
    result = chain.invoke({"message": message_text})
    raw = result.content.strip()

    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def update_entities(conversation_id: str, message_text: str):
    extracted = extract_entities(message_text)

    for item in extracted:
        name = item.get("name", "").strip()
        if not name:
            continue

        existing = Entity.query.filter_by(
            conversation_id=conversation_id, name=name
        ).first()

        if existing:
            existing.description = item.get("description", existing.description)
            existing.entity_type = item.get("type", existing.entity_type)
        else:
            new_entity = Entity(
                conversation_id=conversation_id,
                name=name,
                entity_type=item.get("type", "other"),
                description=item.get("description", ""),
            )
            db.session.add(new_entity)

    db.session.commit()


def get_entity_context(conversation_id: str) -> str:
    entities = Entity.query.filter_by(conversation_id=conversation_id).all()
    if not entities:
        return ""

    lines = [f"- {e.name} ({e.entity_type}): {e.description}" for e in entities]
    return "Known entities:\n" + "\n".join(lines)