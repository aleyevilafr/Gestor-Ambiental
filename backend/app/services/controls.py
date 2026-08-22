from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.control import Control
from app.models.role import RoleCode
from app.models.user import User
from app.repositories.controls import get_for_organization, list_for_obligation
from app.schemas.control import ControlResponse, CreateControlRequest, UpdateControlRequest, UpdateControlStatusRequest
from app.services.obligations import get as get_obligation


def serialize(control: Control) -> ControlResponse:
    return ControlResponse(id=control.id, obligation_id=control.obligation_id, title=control.title, description=control.description, due_date=control.due_date, status=control.status, created_at=control.created_at, updated_at=control.updated_at)


def get_visible_obligation(db: Session, user: User, obligation_id: UUID):
    return get_obligation(db, user, obligation_id)


def get_editable_control(db: Session, user: User, control_id: UUID) -> Control:
    control = get_for_organization(db, user.organization_id, control_id)
    if not control:
        raise HTTPException(404, "Control no encontrado.")
    if user.role.code == RoleCode.ADMIN:
        return control
    if user.role.code == RoleCode.RESPONSIBLE and control.obligation.responsible_user_id == user.id:
        return control
    raise HTTPException(403, "No tienes permisos para modificar este control.")


def list_controls(db: Session, user: User, obligation_id: UUID) -> list[Control]:
    get_visible_obligation(db, user, obligation_id)
    return list_for_obligation(db, obligation_id)


def create_control(db: Session, user: User, obligation_id: UUID, payload: CreateControlRequest) -> Control:
    get_visible_obligation(db, user, obligation_id)
    if user.role.code == RoleCode.READER:
        raise HTTPException(403, "No tienes permisos para crear controles.")
    control = Control(obligation_id=obligation_id, title=payload.title, description=payload.description, due_date=payload.due_date, status=payload.status)
    db.add(control)
    db.commit()
    db.refresh(control)
    return control


def update_control(db: Session, user: User, control_id: UUID, payload: UpdateControlRequest) -> Control:
    control = get_editable_control(db, user, control_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(control, field, value)
    db.commit()
    db.refresh(control)
    return control


def update_control_status(db: Session, user: User, control_id: UUID, payload: UpdateControlStatusRequest) -> Control:
    control = get_editable_control(db, user, control_id)
    control.status = payload.status
    db.commit()
    db.refresh(control)
    return control
