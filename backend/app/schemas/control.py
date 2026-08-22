from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.control import ControlStatus


class ControlResponse(BaseModel):
    id: UUID
    obligation_id: UUID
    title: str
    description: str | None
    due_date: date | None
    status: ControlStatus
    created_at: datetime
    updated_at: datetime


class CreateControlRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    due_date: date | None = None
    status: ControlStatus = ControlStatus.PENDING

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El título es obligatorio.")
        return value


class UpdateControlRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value


class UpdateControlStatusRequest(BaseModel):
    status: ControlStatus
