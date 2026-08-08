import re
from pydantic import BaseModel, EmailStr, Field, field_validator

PASSWORD_PATTERNS = [
    (r"[a-z]", "at least one lowercase letter"),
    (r"[A-Z]", "at least one uppercase letter"),
    (r"[0-9]", "at least one digit"),
]


class RegisterSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"[a-zA-Z\s'-]+", v):
            raise ValueError("name can only contain letters, spaces, hyphens, and apostrophes")
        return v

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        for pattern, msg in PASSWORD_PATTERNS:
            if not re.search(pattern, v):
                raise ValueError(f"password must contain {msg}")
        return v


class LoginSchema(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=1, max_length=128)