from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.role import RoleCode


class RegisterRequest(BaseModel):
    organization_name: str = Field(min_length=1, max_length=255)
    rut: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


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
