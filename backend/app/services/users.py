from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories.users import add_user, get_role_by_code, get_user_by_email, get_user_in_organization, list_users_by_organization, save
from app.schemas.user import CreateUserRequest, UpdateUserRequest, UpdateUserStatusRequest, UserResponse


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.code,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def list_organization_users(db: Session, organization_id: UUID) -> list[User]:
    return list_users_by_organization(db, organization_id)


def create_organization_user(db: Session, organization_id: UUID, payload: CreateUserRequest) -> User:
    email = str(payload.email).lower()
    if get_user_by_email(db, email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo.")
    role = get_role_by_code(db, payload.role)
    if role is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El rol seleccionado no existe.")

    user = User(
        organization_id=organization_id,
        role_id=role.id,
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    add_user(db, user)
    try:
        save(db)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo en la organización.") from error
    db.refresh(user, attribute_names=["role"])
    return user


def update_organization_user(db: Session, organization_id: UUID, user_id: UUID, payload: UpdateUserRequest) -> User:
    user = _get_user_or_404(db, organization_id, user_id)
    changes = payload.model_dump(exclude_unset=True)
    if "email" in changes:
        email = str(changes["email"]).lower()
        existing_user = get_user_by_email(db, email)
        if existing_user is not None and existing_user.id != user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo.")
        user.email = email
    if "name" in changes:
        user.name = changes["name"]
    if "role" in changes:
        role = get_role_by_code(db, changes["role"])
        if role is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El rol seleccionado no existe.")
        user.role_id = role.id
    save(db)
    db.refresh(user, attribute_names=["role"])
    return user


def update_organization_user_status(
    db: Session,
    organization_id: UUID,
    current_user_id: UUID,
    user_id: UUID,
    payload: UpdateUserStatusRequest,
) -> User:
    user = _get_user_or_404(db, organization_id, user_id)
    if user.id == current_user_id and not payload.is_active:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No puedes desactivar tu propia cuenta.")
    user.is_active = payload.is_active
    save(db)
    db.refresh(user, attribute_names=["role"])
    return user


def _get_user_or_404(db: Session, organization_id: UUID, user_id: UUID) -> User:
    user = get_user_in_organization(db, organization_id, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return user
