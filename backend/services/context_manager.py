import tiktoken

ENCODING = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str)->int:
    return len(ENCODING.encode(text))


def count_message_tokens(messages: list[dict]) -> int:
    return sum(count_tokens(m["content"]) + 4 for m in messages)


class TokenBudget:
    """Allocates a fixed total budget across prompt sections."""

    def __init__(
        self, total=4000, system=500, memory=1000, recent=1500, generation=1000
    ):
        self.total = total
        self.system = system
        self.memory = memory
        self.recent = recent
        self.generation = generation

    def fit_recent_messages(self, messages: list[dict]) -> list[dict]:
        """Keep newest messages that fit in the 'recent' budget, oldest-first order preserved."""
        selected = []
        used = 0
        for msg in reversed(messages):
            t = count_tokens(msg["content"])
            if used + t > self.recent:
                break
            selected.insert(0, msg)
            used += t
        return selected

    def usage_report(self, system_prompt, memory_text, recent_messages):
        used = {
            "system": count_tokens(system_prompt),
            "memory": count_tokens(memory_text or ""),
            "recent": count_message_tokens(recent_messages),
        }
        used["total"] = used["system"] + used["memory"] + used["recent"]
        used["budget"] = self.total - self.generation
        used["percent"] = round(used["total"] / used["budget"] * 100, 1)
        return used
