from uuid import UUID
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session
from app.models.control import Control
from app.models.evidence import Evidence
from app.models.obligation import ComplianceStatus, Obligation
from app.models.organization import Organization
from app.models.user import User
from app.repositories.dashboard import compliance_summary

def organization(db: Session, organization_id: UUID) -> Organization:
    return db.scalar(select(Organization).where(Organization.id == organization_id))
def obligations(db: Session, organization_id: UUID, user_id: UUID | None = None):
    controls = select(func.count(Control.id)).where(Control.obligation_id == Obligation.id).correlate(Obligation).scalar_subquery()
    evidences = select(func.count(Evidence.id)).where(Evidence.obligation_id == Obligation.id).correlate(Obligation).scalar_subquery()
    filters=[Obligation.organization_id == organization_id, Obligation.is_active.is_(True)]
    if user_id: filters.append(Obligation.responsible_user_id == user_id)
    priority=case((Obligation.compliance_status == ComplianceStatus.OVERDUE,0),(Obligation.compliance_status == ComplianceStatus.PENDING,2),(Obligation.compliance_status == ComplianceStatus.IN_PROGRESS,3),else_=4)
    return db.execute(select(Obligation, User.name, controls.label("controls_count"), evidences.label("evidences_count")).outerjoin(User, Obligation.responsible_user_id == User.id).where(*filters).order_by(priority,Obligation.deadline.asc().nulls_last(),Obligation.title.asc())).all()
def summary(db: Session, organization_id: UUID): return compliance_summary(db, organization_id)
