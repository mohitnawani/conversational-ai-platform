from datetime import datetime
from models.database import db, Message, ConversationSummary
from services.llm_client import model, extract_text
from langchain_core.prompts import ChatPromptTemplate

SUMMARY_TRIGGER_EVERY_N = 5

summary_prompt = ChatPromptTemplate.from_template(
    "You are summarizing a conversation for long-term memory. "
    "Combine the previous summary (if any) with the new messages into one "
    "concise, information-dense paragraph. Preserve names, facts, decisions, and preferences.\n\n"
    "Previous summary:\n{previous_summary}\n\n"
    "New messages:\n{new_messages}\n\n"
    "Updated summary:"
)

def _get_latest_summary(conversation_id):
    return (
        ConversationSummary.query
        .filter_by(conversation_id=conversation_id)
        .order_by(ConversationSummary.created_at.desc())
        .first()
    )

def maybe_summarize(conversation_id: str):
    """Sync rolling-summary: build then persist. Used by non-parallel paths."""
    build = asummarize_inputs(conversation_id)
    if build is None:
        return None

    chain = summary_prompt | model
    result = chain.invoke(
        {"previous_summary": build["previous_summary"], "new_messages": build["formatted"]}
    )
    return save_summary(conversation_id, extract_text(result.content), build["messages_covered_until"])


def _pending_messages(conversation_id: str):
    latest = _get_latest_summary(conversation_id)
    since = latest.messages_covered_until if latest else datetime.min
    return (
        Message.query
        .filter(Message.conversation_id == conversation_id, Message.created_at > since)
        .order_by(Message.created_at.asc())
        .all()
    )


def asummarize_inputs(conversation_id: str):
    """Snapshot of what a summary build should cover (DB read, no LLM).

    Returns None when the trigger hasn't been met yet, else a dict with
    previous_summary / formatted / messages_covered_until.
    """
    new_messages = _pending_messages(conversation_id)
    if len(new_messages) < SUMMARY_TRIGGER_EVERY_N:
        return None

    latest = _get_latest_summary(conversation_id)
    return {
        "previous_summary": latest.summary_text if latest else "(none)",
        "formatted": "\n".join(f"{m.role}: {m.content}" for m in new_messages),
        "messages_covered_until": new_messages[-1].created_at,
    }


def save_summary(conversation_id: str, summary_text: str, messages_covered_until):
    """Persist a rolling summary row (pure DB write)."""
    new_summary = ConversationSummary(
        conversation_id=conversation_id,
        summary_text=summary_text,
        messages_covered_until=messages_covered_until,
    )
    db.session.add(new_summary)
    db.session.commit()
    return new_summary


async def asummarize(conversation_id: str):
    """Async rolling-summary build — LLM call only, no DB write.

    Returns (summary_text, messages_covered_until) when the trigger is met,
    otherwise None. Caller persists via save_summary().
    """
    build = asummarize_inputs(conversation_id)
    if build is None:
        return None

    chain = summary_prompt | model
    result = await chain.ainvoke(
        {"previous_summary": build["previous_summary"], "new_messages": build["formatted"]}
    )
    return {
        "text": extract_text(result.content),
        "messages_covered_until": build["messages_covered_until"],
    }


def get_context(conversation_id: str) -> dict:
    latest = _get_latest_summary(conversation_id)
    since = latest.messages_covered_until if latest else datetime.min

    recent = (
        Message.query
        .filter(Message.conversation_id == conversation_id, Message.created_at > since)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "summary": latest.summary_text if latest else None,
        "recent_messages": [{"role": m.role, "content": m.content} for m in recent],
    }