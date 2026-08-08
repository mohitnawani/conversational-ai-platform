from langchain_google_genai import ChatGoogleGenerativeAI
from config import Config


model = ChatGoogleGenerativeAI(model="gemini-3.5-flash", api_key=Config.GOOGLE_API_KEY)


def extract_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("text"):
                parts.append(block["text"])
        return "".join(parts)
    return str(content)
