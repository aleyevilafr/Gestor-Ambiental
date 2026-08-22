from datetime import date
from uuid import UUID

from pydantic import BaseModel

from app.models.obligation import ComplianceStatus


class DashboardObligationResponse(BaseModel):
    id: UUID
    title: str
    matter: str
    deadline: date | None
    compliance_status: ComplianceStatus
    responsible_name: str | None


class DashboardSummaryResponse(BaseModel):
    total_obligations: int
    compliant: int
    in_progress: int
    pending: int
    overdue: int
    compliance_percentage: float
    attention_obligations: list[DashboardObligationResponse]
    upcoming_obligations: list[DashboardObligationResponse]
