from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.evidence import Evidence


def list_for_obligation(db: Session, obligation_id: UUID) -> list[Evidence]:
    statement = select(Evidence).options(joinedload(Evidence.uploaded_by_user)).where(Evidence.obligation_id == obligation_id).order_by(Evidence.created_at.desc())
    return list(db.scalars(statement))
