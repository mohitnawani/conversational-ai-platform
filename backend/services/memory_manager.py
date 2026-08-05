from services.buffer_memory import BufferMemory
from services import summary_memory, entity_memory, kg_memory


class MemoryStrategy:
    def update(self, conversation_id, user_text, source_message_id=None):
        raise NotImplementedError

    def get_history(self, conversation_id):
        raise NotImplementedError

    def get_memory_text(self, conversation_id):
        return ""


class BufferStrategy(MemoryStrategy):
    def update(self, conversation_id, user_text, source_message_id=None):
        pass

    def get_history(self, conversation_id):
        return BufferMemory().get_context(conversation_id)


class SummaryStrategy(MemoryStrategy):
    def update(self, conversation_id, user_text, source_message_id=None):
        summary_memory.maybe_summarize(conversation_id)

    def get_history(self, conversation_id):
        return summary_memory.get_context(conversation_id)["recent_messages"]

    def get_memory_text(self, conversation_id):
        ctx = summary_memory.get_context(conversation_id)
        return f"Conversation summary so far: {ctx['summary']}" if ctx["summary"] else ""


class EntityStrategy(MemoryStrategy):
    def update(self, conversation_id, user_text, source_message_id=None):
        entity_memory.update_entities(conversation_id, user_text)

    def get_history(self, conversation_id):
        return BufferMemory().get_context(conversation_id)

    def get_memory_text(self, conversation_id):
        return entity_memory.get_entity_context(conversation_id)


class KGStrategy(MemoryStrategy):
    def update(self, conversation_id, user_text, source_message_id=None):
        kg_memory.update_graph(conversation_id, user_text, source_message_id)

    def get_history(self, conversation_id):
        return BufferMemory().get_context(conversation_id)

    def get_memory_text(self, conversation_id):
        return kg_memory.get_graph_context(conversation_id)

class HybridStrategy(MemoryStrategy):
    def update(self, conversation_id, user_text, source_message_id=None):
        summary_memory.maybe_summarize(conversation_id)
        entity_memory.update_entities(conversation_id, user_text)

    def get_history(self, conversation_id):
        return summary_memory.get_context(conversation_id)["recent_messages"]

    def get_memory_text(self, conversation_id):
        ctx = summary_memory.get_context(conversation_id)
        parts = []
        if ctx["summary"]:
            parts.append(f"Conversation summary so far: {ctx['summary']}")
        entity_text = entity_memory.get_entity_context(conversation_id)
        if entity_text:
            parts.append(entity_text)
        return "\n\n".join(parts)

STRATEGIES = {
    "buffer": BufferStrategy,
    "summary": SummaryStrategy,
    "entity": EntityStrategy,
    "kg": KGStrategy,
    "hybrid": HybridStrategy,
}


def get_memory_strategy(memory_type: str) -> MemoryStrategy:
    strategy_cls = STRATEGIES.get(memory_type, BufferStrategy)
    return strategy_cls()