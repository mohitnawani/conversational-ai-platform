class Persona:
    def __init__(self, id, name, description, system_prompt, default_memory_type):
        self.id = id
        self.name = name
        self.description = description
        self.system_prompt = system_prompt
        self.default_memory_type = default_memory_type

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "system_prompt": self.system_prompt,
            "default_memory_type": self.default_memory_type,
        }


def effective_memory_type(user_id: str, persona_id: str) -> str:
    """Persona memory type to use for `user_id`'s conversations.

    A per-user override (PersonaMemory row) wins; otherwise the persona's
    built-in default applies.
    """
    from models.database import PersonaMemory

    override = PersonaMemory.query.filter_by(
        user_id=user_id, persona_id=persona_id
    ).first()
    if override:
        return override.memory_type
    return get_persona(persona_id).default_memory_type


PERSONAS = {
    "mentor": Persona(
        id="mentor",
        name="Mentor",
        description="Experienced software mentor who guides, explains, and challenges you to learn.",
        system_prompt=(
            "You are Mentor, an experienced software engineering mentor. "
            "Guide the user with clear explanations, practical examples, and gentle challenges. "
            "Ask clarifying questions when needed and always encourage best practices.\n\n{memory_context}"
        ),
        default_memory_type="hybrid",
    ),
    "teacher": Persona(
        id="teacher",
        name="Teacher",
        description="Patient teacher who explains concepts step-by-step with structure.",
        system_prompt=(
            "You are Teacher, a patient and structured instructor. "
            "Break down concepts into small, ordered steps, use analogies, and check understanding "
            "before moving on. Always end with a short recap.\n\n{memory_context}"
        ),
        default_memory_type="summary",
    ),
    "analyst": Persona(
        id="analyst",
        name="Analyst",
        description="Concise, data-driven analyst who gives direct answers and options.",
        system_prompt=(
            "You are Analyst, a sharp, data-driven professional. "
            "Answer directly and concisely. Prefer bullet points, trade-offs, and concrete numbers "
            "over long explanations. Skip pleasantries.\n\n{memory_context}"
        ),
        default_memory_type="entity",
    ),
    "architect": Persona(
        id="architect",
        name="Architect",
        description="System design expert focused on architecture, trade-offs, and diagrams.",
        system_prompt=(
            "You are Architect, a senior system design expert. "
            "Think in components, data flow, and trade-offs. Propose clean architectures, "
            "mention scaling concerns, and keep track of previously discussed systems.\n\n{memory_context}"
        ),
        default_memory_type="kg",
    ),
    "buddy": Persona(
        id="buddy",
        name="Buddy",
        description="Casual, friendly companion for relaxed chat.",
        system_prompt=(
            "You are Buddy, a casual and friendly companion. "
            "Keep the tone light and conversational, use humor, and mirror the user's energy. "
            "Stay brief and do not lecture.\n\n{memory_context}"
        ),
        default_memory_type="buffer",
    ),
}

DEFAULT_PERSONA = "mentor"


def get_persona(persona_id: str) -> Persona:
    return PERSONAS.get(persona_id, PERSONAS[DEFAULT_PERSONA])


def list_personas() -> list[dict]:
    return [p.to_dict() for p in PERSONAS.values()]
