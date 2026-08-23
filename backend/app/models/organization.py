import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CompanyType(str, enum.Enum):
    SPA = "SPA"
    LIMITADA = "LIMITADA"
    SA_CERRADA = "SA_CERRADA"
    SA_ABIERTA = "SA_ABIERTA"
    EIRL = "EIRL"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rut: Mapped[str] = mapped_column(String(20), nullable=False)
    company_type: Mapped[CompanyType] = mapped_column(Enum(CompanyType, name="company_type"), nullable=False, default=CompanyType.UNKNOWN, server_default=CompanyType.UNKNOWN.value)
    business_purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    obligations: Mapped[list["Obligation"]] = relationship(back_populates="organization")
