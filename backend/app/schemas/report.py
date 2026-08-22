from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel
from app.models.obligation import ComplianceStatus

class ReportOrganization(BaseModel): id: UUID; name: str; rut: str
class ReportSummary(BaseModel): total_obligations: int; compliant: int; in_progress: int; pending: int; overdue: int; compliance_percentage: float
class ReportObligation(BaseModel):
    id: UUID; title: str; matter: str; regulatory_source: str; article: str | None; deadline: date | None; frequency: str | None; compliance_status: ComplianceStatus; responsible: str | None; controls_count: int; evidences_count: int
class ComplianceReportResponse(BaseModel): organization: ReportOrganization; generated_at: datetime; summary: ReportSummary; obligations: list[ReportObligation]
