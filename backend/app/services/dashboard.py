from datetime import date

from sqlalchemy.orm import Session

from app.models.obligation import Obligation
from app.models.user import User
from app.repositories.dashboard import attention_obligations, compliance_summary, upcoming_obligations
from app.schemas.dashboard import DashboardObligationResponse, DashboardSummaryResponse


def serialize_obligation(obligation: Obligation) -> DashboardObligationResponse:
    return DashboardObligationResponse(id=obligation.id, title=obligation.title, matter=obligation.matter, deadline=obligation.deadline, compliance_status=obligation.compliance_status, responsible_name=obligation.responsible_user.name if obligation.responsible_user else None)


def get_summary(db: Session, user: User, today: date | None = None) -> DashboardSummaryResponse:
    current_day = today or date.today()
    summary = compliance_summary(db, user.organization_id)
    total = summary["total_active"]
    percentage = round((summary["compliant"] / total) * 100, 2) if total else 0
    return DashboardSummaryResponse(total_obligations=total, compliant=summary["compliant"], in_progress=summary["in_progress"], pending=summary["pending"], overdue=summary["overdue"], compliance_percentage=percentage, attention_obligations=[serialize_obligation(item) for item in attention_obligations(db, user.organization_id, current_day)], upcoming_obligations=[serialize_obligation(item) for item in upcoming_obligations(db, user.organization_id, current_day)])
