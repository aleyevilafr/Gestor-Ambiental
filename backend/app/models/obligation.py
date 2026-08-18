import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ComplianceStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLIANT = "COMPLIANT"
    OVERDUE = "OVERDUE"


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    matter: Mapped[str] = mapped_column(String(100), nullable=False)
    regulatory_source: Mapped[str] = mapped_column(String(255), nullable=False)
    article: Mapped[str | None] = mapped_column(String(100), nullable=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    compliance_status: Mapped[ComplianceStatus] = mapped_column(
        Enum(ComplianceStatus, name="compliance_status"),
        default=ComplianceStatus.PENDING,
        server_default=ComplianceStatus.PENDING.value,
        nullable=False,
    )
    responsible_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="obligations")
    responsible_user: Mapped["User | None"] = relationship(
        foreign_keys=[responsible_user_id], back_populates="responsible_obligations"
    )
    created_by_user: Mapped["User"] = relationship(
        foreign_keys=[created_by_user_id], back_populates="created_obligations"
    )
