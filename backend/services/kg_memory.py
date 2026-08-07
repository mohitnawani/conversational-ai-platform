import json
from models.database import db, KGTriple
from services.llm_client import model, extract_text
from langchain_core.prompts import ChatPromptTemplate

kg_extraction_prompt = ChatPromptTemplate.from_template(
    "Extract meaningful relationship triples (subject, predicate, object) from this message. "
    "Only extract triples that express a real, specific relationship — skip generic or "
    "trivial ones like ('user', 'said', 'hello'). "
    "CRITICAL: use a fixed, consistent snake_case vocabulary for predicates — never "
    "free-form sentence fragments like 'is the student of'. Examples: studies_at, works_at, "
    "is_building, uses, manages, reports_to, located_in, founded_by. "
    "If no fixed predicate fits, invent a short snake_case verb phrase (e.g. is_student_of). "
    "Keep subject and object as proper names exactly as written in the message. "
    "Respond ONLY with valid JSON, no other text, in this exact format:\n"
    '[{{"subject": "...", "predicate": "...", "object": "..."}}]\n'
    "If no meaningful triples exist, respond with: []\n\n"
    "Message: {message}"
)

def extract_triples(message_text: str) -> list[dict]:
    chain = kg_extraction_prompt | model
    result = chain.invoke({"message": message_text})
    return _parse_triples(result.content)


async def aextract_triples(message_text: str) -> list[dict]:
    """Async triple extraction — no DB access, safe to run concurrently."""
    chain = kg_extraction_prompt | model
    result = await chain.ainvoke({"message": message_text})
    return _parse_triples(result.content)


def _parse_triples(raw) -> list[dict]:
    # Gemini can return content as a list of blocks instead of a plain string.
    raw = extract_text(raw).strip()

    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()

    try:
        extracted = json.loads(raw)
        return extracted if isinstance(extracted, list) else []
    except json.JSONDecodeError:
        return []


import re

def _normalize(s: str, strip_articles: bool = False) -> str:
    s = " ".join(s.split()).lower()
    if strip_articles:
        s = re.sub(r"\b(a|an|the)\b", " ", s)
        s = " ".join(s.split())
    return s


def _triple_key(subject: str, predicate: str, obj: str) -> tuple:
    return (
        _normalize(subject),
        _normalize(predicate, strip_articles=True),
        _normalize(obj),
    )


def save_triples(conversation_id: str, triples: list[dict], source_message_id: str = None):
    """Persist already-extracted triples, skipping exact duplicates."""
    for item in triples:
        subj = item.get("subject", "").strip()
        pred = item.get("predicate", "").strip()
        obj = item.get("object", "").strip()
        if not (subj and pred and obj):
            continue

        existing = KGTriple.query.filter(
            KGTriple.conversation_id == conversation_id,
            db.func.lower(KGTriple.subject) == subj.lower(),
            db.func.lower(KGTriple.predicate) == pred.lower(),
            db.func.lower(KGTriple.object) == obj.lower(),
        ).first()
        if existing:
            continue

        db.session.add(KGTriple(
            conversation_id=conversation_id,
            subject=subj,
            predicate=pred,
            object=obj,
            source_message_id=source_message_id,
        ))

    db.session.commit()


def update_graph(conversation_id: str, message_text: str, source_message_id: str = None):
    save_triples(conversation_id, extract_triples(message_text), source_message_id)


def dedupe_triples(conversation_id: str) -> int:
    """Merge existing duplicate triples (case/whitespace/article variants). Run once."""
    triples = KGTriple.query.filter_by(conversation_id=conversation_id) \
        .order_by(KGTriple.created_at).all()

    seen, removed = {}, 0
    for t in triples:
        key = _triple_key(t.subject, t.predicate, t.object)
        if key in seen:
            db.session.delete(t)
            removed += 1
        else:
            seen[key] = t

    db.session.commit()
    return removed


def get_graph_context(conversation_id: str) -> str:
    triples = KGTriple.query.filter_by(conversation_id=conversation_id).all()
    if not triples:
        return ""

    lines = [f"- {t.subject} {t.predicate} {t.object}" for t in triples]
    return "Known relationships:\n" + "\n".join(lines)
