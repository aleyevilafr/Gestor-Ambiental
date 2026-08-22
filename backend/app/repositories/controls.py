from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.control import Control
from app.models.obligation import Obligation


def list_for_obligation(db: Session, obligation_id: UUID) -> list[Control]:
    return list(db.scalars(select(Control).where(Control.obligation_id == obligation_id).order_by(Control.created_at.desc())))


def get_for_organization(db: Session, organization_id: UUID, control_id: UUID) -> Control | None:
    statement = select(Control).join(Control.obligation).options(joinedload(Control.obligation)).where(Control.id == control_id, Obligation.organization_id == organization_id)
    return db.scalar(statement)


def get_for_obligation(db: Session, obligation_id: UUID, control_id: UUID) -> Control | None:
    return db.scalar(select(Control).where(Control.id == control_id, Control.obligation_id == obligation_id))
