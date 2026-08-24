from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import RoleCode
from app.services.dashboard import get_summary
from app.repositories import reports
from app.schemas.report import ComplianceReportResponse, ReportObligation, ReportOrganization, ReportSummary

def compliance_report(db: Session, user: User) -> ComplianceReportResponse:
    org = reports.organization(db, user.organization_id); summary=get_summary(db,user); scope=user.id if user.role.code==RoleCode.RESPONSIBLE else None
    return ComplianceReportResponse(organization=ReportOrganization(id=org.id, name=org.name, rut=org.rut), generated_at=datetime.now(timezone.utc), summary=ReportSummary(total_obligations=summary.total_obligations,active=summary.active,compliant=summary.compliant,in_progress=summary.in_progress,pending=summary.pending,overdue=summary.overdue,due_soon=summary.due_soon,unassigned=summary.unassigned,compliance_percentage=summary.compliance_percentage), obligations=[ReportObligation(id=item.Obligation.id, title=item.Obligation.title, matter=item.Obligation.matter, regulatory_source=item.Obligation.regulatory_source, article=item.Obligation.article, deadline=item.Obligation.deadline, frequency=item.Obligation.frequency, compliance_status=item.Obligation.compliance_status, responsible=item.name, controls_count=item.controls_count, evidences_count=item.evidences_count) for item in reports.obligations(db, user.organization_id,scope)])
