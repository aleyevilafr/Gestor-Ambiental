from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.role import RoleCode


class RegisterRequest(BaseModel):
    organization_name: str = Field(min_length=1, max_length=255)
    rut: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("organization_name", "name")
    @classmethod
    def validate_display_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized or any(ord(character) < 32 for character in normalized):
            raise ValueError("El texto contiene caracteres no válidos.")
        return normalized


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    rut: str


class AuthenticatedUserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: RoleCode
    organization: OrganizationResponse
