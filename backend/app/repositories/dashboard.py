from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import case, select, text
from sqlalchemy.orm import Session, joinedload

from app.models.obligation import ComplianceStatus, Obligation


NEAR_DEADLINE_DAYS = 30


def compliance_summary(db: Session, organization_id: UUID) -> dict[str, int]:
    row = db.execute(text("SELECT * FROM get_organization_compliance_summary(:organization_id)"), {"organization_id": organization_id}).mappings().one()
    return {key: int(row[key] or 0) for key in ("total_active", "pending", "in_progress", "compliant", "overdue")}


def attention_obligations(db: Session, organization_id: UUID, today: date) -> list[Obligation]:
    near_deadline = today + timedelta(days=NEAR_DEADLINE_DAYS)
    priority = case((Obligation.compliance_status == ComplianceStatus.OVERDUE, 0), else_=1)
    statement = select(Obligation).options(joinedload(Obligation.responsible_user)).where(
        Obligation.organization_id == organization_id,
        Obligation.is_active.is_(True),
        (Obligation.compliance_status == ComplianceStatus.OVERDUE) | ((Obligation.compliance_status.in_([ComplianceStatus.PENDING, ComplianceStatus.IN_PROGRESS])) & (Obligation.deadline.is_not(None)) & (Obligation.deadline >= today) & (Obligation.deadline <= near_deadline)),
    ).order_by(priority, Obligation.deadline.asc().nulls_last()).limit(5)
    return list(db.scalars(statement))


def upcoming_obligations(db: Session, organization_id: UUID, today: date) -> list[Obligation]:
    statement = select(Obligation).options(joinedload(Obligation.responsible_user)).where(
        Obligation.organization_id == organization_id,
        Obligation.is_active.is_(True),
        Obligation.deadline.is_not(None),
        Obligation.deadline >= today,
    ).order_by(Obligation.deadline.asc()).limit(5)
    return list(db.scalars(statement))
