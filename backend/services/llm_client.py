from langchain_google_genai import ChatGoogleGenerativeAI
from config import Config


model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key= Config.GOOGLE_API_KEY)

