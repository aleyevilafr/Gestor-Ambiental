from datetime import datetime
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.evidence import EvidenceType


class UploadedByUserResponse(BaseModel):
    id: UUID
    name: str
    email: str


class EvidenceResponse(BaseModel):
    id: UUID
    obligation_id: UUID
    control_id: UUID | None
    name: str
    description: str | None
    evidence_type: EvidenceType
    file_url: str | None
    external_url: str | None
    uploaded_by_user_id: UUID
    uploaded_by_user: UploadedByUserResponse
    created_at: datetime


class CreateEvidenceRequest(BaseModel):
    control_id: UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    evidence_type: EvidenceType
    file_url: str | None = Field(default=None, max_length=2048)
    external_url: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def validate_location(self) -> "CreateEvidenceRequest":
        value = self.external_url if self.evidence_type == EvidenceType.EXTERNAL_LINK else self.file_url
        if not value:
            required = "external_url" if self.evidence_type == EvidenceType.EXTERNAL_LINK else "file_url"
            raise ValueError(f"{required} es obligatorio para el tipo de evidencia seleccionado.")
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("La URL de evidencia debe ser una URL HTTP(S) válida.")
        if self.evidence_type == EvidenceType.EXTERNAL_LINK and self.file_url:
            raise ValueError("FILE y EXTERNAL_LINK no pueden enviar URL simultáneamente.")
        if self.evidence_type == EvidenceType.FILE and self.external_url:
            raise ValueError("FILE y EXTERNAL_LINK no pueden enviar URL simultáneamente.")
        return self
