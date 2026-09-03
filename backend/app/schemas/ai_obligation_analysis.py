from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator


class AIObligationProposal(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    matter: str | None = Field(default=None, max_length=100)
    regulatory_source: str | None = Field(default=None, max_length=255)
    article: str | None = Field(default=None, max_length=100)
    deadline: date | None = None
    frequency: str | None = Field(default=None, max_length=100)
    confidence: float | None = Field(default=None, ge=0, le=1)
    source_excerpt: str | None = Field(default=None, max_length=1200)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El título es obligatorio.")
        return value

    @field_validator("description", "matter", "regulatory_source", "article", "frequency", "source_excerpt", mode="before")
    @classmethod
    def empty_strings_to_none(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class AIObligationAnalysisRawResponse(BaseModel):
    proposals: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    warnings: list[str] = Field(default_factory=list, max_length=20)


class AIObligationAnalysisResponse(BaseModel):
    document_name: str
    proposals: list[AIObligationProposal] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
