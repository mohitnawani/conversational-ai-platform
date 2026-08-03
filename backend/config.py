import os
from dotenv import load_dotenv

load_dotenv()
class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///memory.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")