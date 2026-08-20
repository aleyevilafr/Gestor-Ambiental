from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.role import RoleCode


def validate_display_text(value: str) -> str:
    normalized = value.strip()
    if not normalized or any(ord(character) < 32 for character in normalized):
        raise ValueError("El texto contiene caracteres no válidos.")
    return normalized


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: RoleCode
    is_active: bool
    created_at: datetime


class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: RoleCode

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return validate_display_text(value)


class UpdateUserRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    role: RoleCode | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        return validate_display_text(value) if value is not None else value


class UpdateUserStatusRequest(BaseModel):
    is_active: bool
