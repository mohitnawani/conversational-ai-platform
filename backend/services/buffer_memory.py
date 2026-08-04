from models.database import Message
from services.context_manager import TokenBudget

class BufferMemory:
    def __init__(self, budget: TokenBudget = None):
        self.budget = budget or TokenBudget()

    def get_context(self, conversation_id: str) -> list[dict]:
        messages = (
            Message.query
            .filter_by(conversation_id=conversation_id)
            .order_by(Message.created_at.asc())
            .all()
        )
        as_dicts = [{"role": m.role, "content": m.content} for m in messages]
        return self.budget.fit_recent_messages(as_dicts)