from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.control import ControlResponse, CreateControlRequest, UpdateControlRequest, UpdateControlStatusRequest
from app.services import controls as service

router = APIRouter(tags=["controls"])
Db = Annotated[Session, Depends(get_db)]
Current = Annotated[User, Depends(get_current_active_user)]


@router.get("/api/v1/obligations/{obligation_id}/controls", response_model=list[ControlResponse])
def list_controls(obligation_id: UUID, user: Current, db: Db) -> list[ControlResponse]:
    return [service.serialize(item) for item in service.list_controls(db, user, obligation_id)]


@router.post("/api/v1/obligations/{obligation_id}/controls", response_model=ControlResponse, status_code=status.HTTP_201_CREATED)
def create_control(obligation_id: UUID, payload: CreateControlRequest, user: Current, db: Db) -> ControlResponse:
    return service.serialize(service.create_control(db, user, obligation_id, payload))


@router.patch("/api/v1/controls/{control_id}", response_model=ControlResponse)
def update_control(control_id: UUID, payload: UpdateControlRequest, user: Current, db: Db) -> ControlResponse:
    return service.serialize(service.update_control(db, user, control_id, payload))


@router.patch("/api/v1/controls/{control_id}/status", response_model=ControlResponse)
def update_control_status(control_id: UUID, payload: UpdateControlStatusRequest, user: Current, db: Db) -> ControlResponse:
    return service.serialize(service.update_control_status(db, user, control_id, payload))
