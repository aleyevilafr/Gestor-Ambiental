from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models.control import Control
from app.models.evidence import Evidence
from app.models.obligation import Obligation
from app.models.organization import Organization
from app.models.user import User
from app.repositories.dashboard import compliance_summary

def organization(db: Session, organization_id: UUID) -> Organization:
    return db.scalar(select(Organization).where(Organization.id == organization_id))
def obligations(db: Session, organization_id: UUID):
    controls = select(func.count(Control.id)).where(Control.obligation_id == Obligation.id).correlate(Obligation).scalar_subquery()
    evidences = select(func.count(Evidence.id)).where(Evidence.obligation_id == Obligation.id).correlate(Obligation).scalar_subquery()
    return db.execute(select(Obligation, User.name, controls.label("controls_count"), evidences.label("evidences_count")).outerjoin(User, Obligation.responsible_user_id == User.id).where(Obligation.organization_id == organization_id, Obligation.is_active.is_(True)).order_by(Obligation.deadline.asc().nulls_last(), Obligation.title.asc())).all()
def summary(db: Session, organization_id: UUID): return compliance_summary(db, organization_id)
