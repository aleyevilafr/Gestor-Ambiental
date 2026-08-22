from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories import reports
from app.schemas.report import ComplianceReportResponse, ReportObligation, ReportOrganization, ReportSummary

def compliance_report(db: Session, user: User) -> ComplianceReportResponse:
    org = reports.organization(db, user.organization_id); values = reports.summary(db, user.organization_id); total = values["total_active"]
    return ComplianceReportResponse(organization=ReportOrganization(id=org.id, name=org.name, rut=org.rut), generated_at=datetime.now(timezone.utc), summary=ReportSummary(total_obligations=total, compliant=values["compliant"], in_progress=values["in_progress"], pending=values["pending"], overdue=values["overdue"], compliance_percentage=round(values["compliant"] / total * 100, 2) if total else 0), obligations=[ReportObligation(id=item.Obligation.id, title=item.Obligation.title, matter=item.Obligation.matter, regulatory_source=item.Obligation.regulatory_source, article=item.Obligation.article, deadline=item.Obligation.deadline, frequency=item.Obligation.frequency, compliance_status=item.Obligation.compliance_status, responsible=item.name, controls_count=item.controls_count, evidences_count=item.evidences_count) for item in reports.obligations(db, user.organization_id)])
