import json
from models.database import db, KGTriple
from services.llm_client import model
from langchain_core.prompts import ChatPromptTemplate

kg_extraction_prompt = ChatPromptTemplate.from_template(
    "Extract meaningful relationship triples (subject, predicate, object) from this message. "
    "Only extract triples that express a real, specific relationship — skip generic or "
    "trivial ones like ('user', 'said', 'hello'). "
    "Respond ONLY with valid JSON, no other text, in this exact format:\n"
    '[{{"subject": "...", "predicate": "...", "object": "..."}}]\n'
    "If no meaningful triples exist, respond with: []\n\n"
    "Message: {message}"
)

def extract_triples(message_text: str) -> list[dict]:
    chain = kg_extraction_prompt | model
    result = chain.invoke({"message": message_text})
    raw = result.content.strip()

    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def update_graph(conversation_id: str, message_text: str, source_message_id: str = None):
    extracted = extract_triples(message_text)

    for item in extracted:
        subj = item.get("subject", "").strip()
        pred = item.get("predicate", "").strip()
        obj = item.get("object", "").strip()
        if not (subj and pred and obj):
            continue

        existing = KGTriple.query.filter_by(
            conversation_id=conversation_id, subject=subj, predicate=pred, object=obj
        ).first()
        if existing:
            continue

        triple = KGTriple(
            conversation_id=conversation_id,
            subject=subj,
            predicate=pred,
            object=obj,
            source_message_id=source_message_id,
        )
        db.session.add(triple)

    db.session.commit()


def get_graph_context(conversation_id: str) -> str:
    triples = KGTriple.query.filter_by(conversation_id=conversation_id).all()
    if not triples:
        return ""

    lines = [f"- {t.subject} {t.predicate} {t.object}" for t in triples]
    return "Known relationships:\n" + "\n".join(lines)