from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.models.obligation import ComplianceStatus

class ResponsibleUserResponse(BaseModel):
    id: UUID
    name: str
    email: str

class ObligationResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    matter: str
    regulatory_source: str
    article: str | None
    deadline: date | None
    frequency: str | None
    compliance_status: ComplianceStatus
    responsible_user_id: UUID | None
    responsible_user: ResponsibleUserResponse | None
    created_by_user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

class CreateObligationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    matter: str = Field(min_length=1, max_length=100)
    regulatory_source: str = Field(min_length=1, max_length=255)
    article: str | None = Field(default=None, max_length=100)
    deadline: date | None = None
    frequency: str | None = Field(default=None, max_length=100)
    compliance_status: ComplianceStatus = ComplianceStatus.PENDING
    responsible_user_id: UUID | None = None
    @field_validator('title','matter','regulatory_source')
    @classmethod
    def clean(cls, value: str) -> str:
        value = value.strip()
        if not value or any(ord(c) < 32 for c in value): raise ValueError('El texto contiene caracteres no válidos.')
        return value

class UpdateObligationRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    matter: str | None = Field(default=None, min_length=1, max_length=100)
    regulatory_source: str | None = Field(default=None, min_length=1, max_length=255)
    article: str | None = Field(default=None, max_length=100)
    deadline: date | None = None
    frequency: str | None = Field(default=None, max_length=100)
    responsible_user_id: UUID | None = None

    @field_validator('title', 'matter', 'regulatory_source')
    @classmethod
    def clean_optional(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value or any(ord(char) < 32 for char in value):
            raise ValueError('El texto contiene caracteres no válidos.')
        return value

class UpdateObligationStatusRequest(BaseModel):
    compliance_status: ComplianceStatus
