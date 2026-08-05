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
    latest = _get_latest_summary(conversation_id)
    since = latest.messages_covered_until if latest else datetime.min

    new_messages = (
        Message.query
        .filter(Message.conversation_id == conversation_id, Message.created_at > since)
        .order_by(Message.created_at.asc())
        .all()
    )

    if len(new_messages) < SUMMARY_TRIGGER_EVERY_N:
        return None

    formatted = "\n".join(f"{m.role}: {m.content}" for m in new_messages)
    previous_text = latest.summary_text if latest else "(none)"

    chain = summary_prompt | model
    result = chain.invoke({"previous_summary": previous_text, "new_messages": formatted})

    new_summary = ConversationSummary(
        conversation_id=conversation_id,
        summary_text=extract_text(result.content),
        messages_covered_until=new_messages[-1].created_at,
    )
    db.session.add(new_summary)
    db.session.commit()
    return new_summary


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