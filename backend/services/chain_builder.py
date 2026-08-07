from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from services.llm_client import model, extract_text
from models.database import db

from langchain_core.prompts import ChatPromptTemplate
from services.llm_client import model
from services import entity_memory, kg_memory, summary_memory
import asyncio
import logging

logger = logging.getLogger(__name__)

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


def stream_conversation(user_input: str, history: list[dict], memory_context: str = "", system_prompt: str = DEFAULT_SYSTEM_PROMPT):
    """Same chain as run_conversation, but yields text chunks as the model streams.

    Yields only non-empty text fragments; concatenating them in order gives the
    full assistant reply (used by the SSE message/stream endpoint).
    """
    chain = build_simple_chain(system_prompt)
    lc_history = [(m["role"] if m["role"] != "assistant" else "ai", m["content"]) for m in history]
    for chunk in chain.stream({
        "input": user_input,
        "history": lc_history,
        "memory_context": memory_context,
    }):
        text = extract_text(chunk.content)
        if text:
            yield text


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


# parallel chain implementation

def parallel_writers(memory_type: str) -> list:
    """Which memory stores receive an extraction write for this memory type."""
    if memory_type == "hybrid":
        return ["entity", "kg", "summary"]
    if memory_type == "entity":
        return ["entity"]
    if memory_type == "kg":
        return ["kg"]
    if memory_type == "summary":
        return ["summary"]
    return []


def _lc_history(history: list[dict]) -> list[tuple]:
    return [(m["role"] if m["role"] != "assistant" else "ai", m["content"]) for m in history]


async def stream_parallel(
    conversation_id: str,
    user_input: str,
    history: list[dict],
    memory_context: str = "",
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    memory_type: str = "buffer",
    source_message_id: str = None,
):
    """Stream the reply while memory writers run concurrently.

    Yields reply text chunks as the model streams. Entity / KG / summary
    extraction (LLM calls only) are started as asyncio tasks alongside the
    reply; their DB writes are applied sequentially once the stream finishes,
    so the shared SQLAlchemy session stays single-threaded.
    """
    writers = parallel_writers(memory_type)

    tasks = []
    if "entity" in writers:
        tasks.append(asyncio.create_task(entity_memory.aextract_entities(user_input)))
    if "kg" in writers:
        tasks.append(asyncio.create_task(kg_memory.aextract_triples(user_input)))
    if "summary" in writers:
        tasks.append(asyncio.create_task(summary_memory.asummarize(conversation_id)))

    chain = build_simple_chain(system_prompt)
    try:
        async for chunk in chain.astream({
            "input": user_input,
            "history": _lc_history(history),
            "memory_context": memory_context,
        }):
            text = extract_text(chunk.content)
            if text:
                yield text
    finally:
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result, kind in zip(results, writers):
                if isinstance(result, BaseException):
                    logger.warning("%s memory extraction failed: %s", kind, result)
                    continue
                try:
                    if kind == "entity":
                        entity_memory.save_entities(conversation_id, result)
                    elif kind == "kg":
                        kg_memory.save_triples(conversation_id, result, source_message_id)
                    elif kind == "summary" and result:
                        summary_memory.save_summary(
                            conversation_id,
                            result["text"],
                            result["messages_covered_until"],
                        )
                except Exception:
                    # Memory enrichment is optional.  Never let a failed
                    # entity/KG/summary write discard an otherwise complete
                    # assistant reply before the message endpoint saves it.
                    db.session.rollback()
                    logger.exception("Failed to save %s memory", kind)


async def run_parallel_pipeline(
    conversation_id: str,
    user_input: str,
    history: list[dict],
    memory_context: str = "",
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    memory_type: str = "buffer",
    source_message_id: str = None,
) -> str:
    """Non-streaming variant — return the full reply after the parallel writes land."""
    return "".join([
        chunk
        async for chunk in stream_parallel(
            conversation_id,
            user_input,
            history,
            memory_context,
            system_prompt,
            memory_type,
            source_message_id,
        )
    ])


def run_parallel_chain(
    conversation_id: str,
    user_input: str,
    history: list[dict],
    memory_context: str = "",
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    memory_type: str = "buffer",
    source_message_id: str = None,
):
    """Sync wrapper — call this from a normal Flask route."""
    return asyncio.run(
        run_parallel_pipeline(
            conversation_id,
            user_input,
            history,
            memory_context,
            system_prompt,
            memory_type,
            source_message_id,
        )
    )

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
