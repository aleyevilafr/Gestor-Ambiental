import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EvidenceType(str, enum.Enum):
    FILE = "FILE"
    EXTERNAL_LINK = "EXTERNAL_LINK"


class Evidence(Base):
    __tablename__ = "evidences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    obligation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("obligations.id"), nullable=False, index=True)
    control_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("controls.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_type: Mapped[EvidenceType] = mapped_column(Enum(EvidenceType, name="evidence_type"), nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    obligation: Mapped["Obligation"] = relationship(back_populates="evidences")
    control: Mapped["Control | None"] = relationship(back_populates="evidences")
    uploaded_by_user: Mapped["User"] = relationship(back_populates="uploaded_evidences")
