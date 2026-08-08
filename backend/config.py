import os
from dotenv import load_dotenv

load_dotenv()

def _env(name, default=None):
    """os.getenv that ignores BOM/invisible chars in dotenv key names."""
    value = os.getenv(name)
    if value is not None:
        return value
    for key, val in os.environ.items():
        if key.lstrip("\ufeff\u200b") == name:
            return val
    return default


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///memory.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_API_KEY = _env("GOOGLE_API_KEY")
    JWT_SECRET_KEY = _env("JWT_SECRET_KEY", "dev-secret-change-me-0123456789abcdef")
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = _env("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24 * 7
    REDIS_URL = _env("REDIS_URL", "redis://localhost:6379/0")
    CORS_ORIGINS = [
        o.strip()
        for o in _env("CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]