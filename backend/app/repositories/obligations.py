from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.models.obligation import Obligation, ComplianceStatus
from app.models.user import User

def list_for_org(db: Session, org: UUID, responsible: UUID | None, state: ComplianceStatus | None, matter: str | None, search: str | None, archived: bool):
    q=select(Obligation).options(joinedload(Obligation.responsible_user)).where(Obligation.organization_id==org)
    if not archived:q=q.where(Obligation.is_active.is_(True))
    if responsible:q=q.where(Obligation.responsible_user_id==responsible)
    if state:q=q.where(Obligation.compliance_status==state)
    if matter:q=q.where(Obligation.matter.ilike(f'%{matter}%'))
    if search:q=q.where(Obligation.title.ilike(f'%{search}%'))
    return list(db.scalars(q.order_by(Obligation.created_at.desc())))
def get_for_org(db: Session, org: UUID, id: UUID):
    return db.scalar(select(Obligation).options(joinedload(Obligation.responsible_user)).where(Obligation.organization_id==org,Obligation.id==id))
def eligible_user(db: Session, org: UUID, id: UUID):
    return db.scalar(select(User).options(joinedload(User.role)).where(User.organization_id==org,User.id==id,User.is_active.is_(True)))
def add(db:Session,item:Obligation):db.add(item)
def save(db:Session):db.commit()
