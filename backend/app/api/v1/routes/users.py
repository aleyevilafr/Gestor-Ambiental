from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import require_roles
from app.db.session import get_db
from app.models.role import RoleCode
from app.models.user import User
from app.schemas.user import CreateUserRequest, UpdateUserRequest, UpdateUserStatusRequest, UserResponse
from app.services.users import create_organization_user, list_organization_users, serialize_user, update_organization_user, update_organization_user_status

router = APIRouter(prefix="/api/v1/users", tags=["users"])
DbSession = Annotated[Session, Depends(get_db)]
AdminUser = Annotated[User, Depends(require_roles(RoleCode.ADMIN))]


@router.get("", response_model=list[UserResponse])
def list_users(current_user: AdminUser, db: DbSession) -> list[UserResponse]:
    return [serialize_user(user) for user in list_organization_users(db, current_user.organization_id)]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: CreateUserRequest, current_user: AdminUser, db: DbSession) -> UserResponse:
    return serialize_user(create_organization_user(db, current_user.organization_id, payload))


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, payload: UpdateUserRequest, current_user: AdminUser, db: DbSession) -> UserResponse:
    return serialize_user(update_organization_user(db, current_user.organization_id, user_id, payload))


@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(user_id: UUID, payload: UpdateUserStatusRequest, current_user: AdminUser, db: DbSession) -> UserResponse:
    return serialize_user(update_organization_user_status(db, current_user.organization_id, current_user.id, user_id, payload))
