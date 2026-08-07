import threading

from flask import current_app
from models.database import db, MemoryBackfill, Message
from services import entity_memory, kg_memory

NEEDS_ENTITY = {"entity", "hybrid"}
NEEDS_KG = {"kg"}


def ensure_backfill(conversation_id: str, memory_type: str):
    """Replay a conversation's existing history through the extraction model
    of the newly selected memory strategy.

    Runs in a background thread so the persona/memory switch stays instant.
    Idempotent: each strategy backfills at most once per conversation, so
    switching buffer -> kg -> buffer -> kg only extracts the first time.

    "Replay" is only relevant for entity/KG (summary already folds the full
    history on its first run). Buffer needs nothing.
    """
    needs_entity = memory_type in NEEDS_ENTITY
    needs_kg = memory_type in NEEDS_KG
    if not needs_entity and not needs_kg:
        return

    row = MemoryBackfill.query.get(conversation_id)
    if not row:
        row = MemoryBackfill(conversation_id=conversation_id)
        db.session.add(row)
        db.session.commit()
        db.session.refresh(row)

    if needs_entity and not row.entity_done:
        row.entity_done = True
        db.session.commit()
        threading.Thread(
            target=_backfill_job, args=(conversation_id, "entity"), daemon=True
        ).start()

    if needs_kg and not row.kg_done:
        row.kg_done = True
        db.session.commit()
        threading.Thread(
            target=_backfill_job, args=(conversation_id, "kg"), daemon=True
        ).start()


def _backfill_job(conversation_id: str, kind: str):
    # Flask-SQLAlchemy sessions are tied to the app context, so the worker
    # must re-enter it before touching the DB. Extraction is best-effort:
    # a bad message must never kill the whole backfill.
    with current_app.app_context():
        messages = (
            Message.query.filter_by(conversation_id=conversation_id, role="user")
            .order_by(Message.created_at.asc())
            .all()
        )
        for msg in messages:
            try:
                if kind == "entity":
                    entity_memory.update_entities(conversation_id, msg.content)
                else:
                    kg_memory.update_graph(conversation_id, msg.content, msg.id)
            except Exception:
                continue