from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from services.llm_client import model, extract_text

from langchain_core.prompts import ChatPromptTemplate
from services.llm_client import model
from services import entity_memory, kg_memory, summary_memory
import asyncio

DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant. {memory_context}"

def build_simple_chain(system_prompt: str = DEFAULT_SYSTEM_PROMPT):
    prompt = ChatPromptTemplate(
        [
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ]
    )
    return prompt | model

def run_conversation(user_input: str, history: list[dict], memory_context: str = "", system_prompt: str = DEFAULT_SYSTEM_PROMPT):
    chain = build_simple_chain(system_prompt)
    lc_history = [(m["role"] if m["role"] != "assistant" else "ai", m["content"]) for m in history]
    response = chain.invoke({
        "input": user_input,
        "history": lc_history,
        "memory_context": memory_context,
    })
    return extract_text(response.content)


# sequential chain implementation

classify_prompt = ChatPromptTemplate.from_template(
    "Classify this message into exactly one category: question, instruction, or small_talk. "
    "Respond with ONLY the single category word, nothing else.\n\nMessage: {message}"
)

def classify_intent(message: str) -> str:
    chain = classify_prompt | model
    result = chain.invoke({"message": message})
    category = extract_text(result.content).strip().lower()
    if category not in ("question", "instruction", "small_talk"):
        category = "question"  # safe fallback
    return category

# --- Step 2: Enrich context based on intent ---
def enrich_context(conversation_id: str, intent: str, base_memory_context: str) -> str:
    if intent == "question":
        # factual questions benefit from entity + kg context on top of whatever memory mode gave us
        entity_ctx = entity_memory.get_entity_context(conversation_id)
        kg_ctx = kg_memory.get_graph_context(conversation_id)
        extras = "\n".join(filter(None, [entity_ctx, kg_ctx]))
        return "\n".join(filter(None, [base_memory_context, extras]))
    return base_memory_context  # small_talk / instruction: keep it minimal

# --- Step 3 & 4: Generate response, then update memory ---
def run_sequential_chain(conversation_id: str, user_input: str, history: list[dict], base_memory_context: str = "", system_prompt: str = DEFAULT_SYSTEM_PROMPT):
    intent = classify_intent(user_input)                              # Step 1
    enriched_context = enrich_context(conversation_id, intent, base_memory_context)  # Step 2

    reply = run_conversation(user_input, history, enriched_context, system_prompt=system_prompt)   # Step 3

    # Step 4: update memory regardless of mode, so entity/kg facts accumulate over time
    entity_memory.update_entities(conversation_id, user_input)
    kg_memory.update_graph(conversation_id, user_input)

    return reply, intent


# //parallel chain implementation

async def _generate_reply_async(user_input, history, memory_context, system_prompt):
    return run_conversation(user_input, history, memory_context, system_prompt=system_prompt)

async def _extract_entities_async(conversation_id, user_input):
    entity_memory.update_entities(conversation_id, user_input)
    return entity_memory.get_entity_context(conversation_id)

async def _update_graph_async(conversation_id, user_input):
    kg_memory.update_graph(conversation_id, user_input)
    return kg_memory.get_graph_context(conversation_id)


async def _run_parallel_async(conversation_id, user_input, history, memory_context="", system_prompt=DEFAULT_SYSTEM_PROMPT):
    reply, entity_ctx, kg_ctx = await asyncio.gather(
        _generate_reply_async(user_input, history, memory_context, system_prompt),
        _extract_entities_async(conversation_id, user_input),
        _update_graph_async(conversation_id, user_input),
    )
    return {
        "reply": reply,
        "entity_context": entity_ctx,
        "kg_context": kg_ctx,
    }


def run_parallel_chain(conversation_id: str, user_input: str, history: list[dict], memory_context: str = "", system_prompt: str = DEFAULT_SYSTEM_PROMPT):
    """Sync wrapper — call this from a normal Flask route."""
    return asyncio.run(_run_parallel_async(conversation_id, user_input, history, memory_context, system_prompt))

# branching chain implementation

route_classify_prompt = ChatPromptTemplate.from_template(
    "Classify this message into exactly one category: "
    "factual_recall (asking about specific known facts/entities), "
    "analysis (asking for a summary, opinion, or broad understanding), "
    "or small_talk (greetings, thanks, casual chat). "
    "Respond with ONLY the category name.\n\nMessage: {message}"
)

def classify_route(message: str) -> str:
    chain = route_classify_prompt | model
    result = chain.invoke({"message": message})

    content = result.content

    # Handle both string and list responses
    if isinstance(content, str):
        route = content.strip().lower()
    elif isinstance(content, list) and len(content) > 0:
        first = content[0]
        if isinstance(first, dict):
            route = first.get("text", "").strip().lower()
        else:
            route = str(first).strip().lower()
    else:
        route = "analysis"

    if route not in ("factual_recall", "analysis", "small_talk"):
        route = "analysis"  # safe fallback

    return route


def run_branching_chain(conversation_id: str, user_input: str, history: list[dict], system_prompt: str = DEFAULT_SYSTEM_PROMPT):
    route = classify_route(user_input)

    if route == "factual_recall":
        entity_ctx = entity_memory.get_entity_context(conversation_id)
        kg_ctx = kg_memory.get_graph_context(conversation_id)
        memory_context = "\n".join(filter(None, [entity_ctx, kg_ctx]))

    elif route == "analysis":
        ctx = summary_memory.get_context(conversation_id)
        memory_context = f"Conversation summary so far: {ctx['summary']}" if ctx["summary"] else ""

    else:  # small_talk
        memory_context = ""  # skip memory lookup entirely — fast path

    reply = run_conversation(user_input, history, memory_context, system_prompt=system_prompt)
    return reply, route