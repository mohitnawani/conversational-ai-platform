from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from services.llm_client import model

prompt = ChatPromptTemplate(
    [
        ("system", "You are a helpful assistant. {memory_context}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ]
)

def build_simple_chain():
    return prompt | model

def run_conversation(user_input: str, history: list[dict], memory_context: str = ""):
    chain = build_simple_chain()
    lc_history = [(m["role"] if m["role"] != "assistant" else "ai", m["content"]) for m in history]
    response = chain.invoke({
        "input": user_input,
        "history": lc_history,
        "memory_context": memory_context,
    })
    return response.content