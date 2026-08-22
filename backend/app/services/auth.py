from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.rut import normalize_chilean_rut
from app.core.security import hash_password, verify_password
from app.models.organization import Organization
from app.models.role import RoleCode
from app.models.user import User
from app.repositories.auth import add_organization, add_user, get_active_user_by_id, get_active_users_by_email, get_role_by_code, get_user_by_email
from app.schemas.auth import AuthenticatedUserResponse, LoginRequest, OrganizationResponse, RegisterRequest


def serialize_user(user: User) -> AuthenticatedUserResponse:
    return AuthenticatedUserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.code,
        organization=OrganizationResponse(id=user.organization.id, name=user.organization.name, rut=user.organization.rut),
    )


def register_organization_and_admin(db: Session, payload: RegisterRequest) -> User:
    email = str(payload.email).lower()
    try:
        normalized_rut = normalize_chilean_rut(payload.rut)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

    try:
        with db.begin():
            if get_user_by_email(db, email) is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo.")
            admin_role = get_role_by_code(db, RoleCode.ADMIN)
            if admin_role is None:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se encontró el rol administrador.")
            organization = Organization(name=payload.organization_name.strip(), rut=normalized_rut)
            add_organization(db, organization)
            user = User(
                organization_id=organization.id,
                role_id=admin_role.id,
                name=payload.name.strip(),
                email=email,
                password_hash=hash_password(payload.password),
            )
            add_user(db, user)
            db.refresh(user, attribute_names=["organization", "role"])
    except Exception:
        db.rollback()
        raise
    return user


def authenticate_user(db: Session, payload: LoginRequest) -> User | None:
    users = get_active_users_by_email(db, str(payload.email).lower())
    if len(users) != 1 or not verify_password(payload.password, users[0].password_hash):
        return None
    return users[0]


def get_active_user(db: Session, user_id: str) -> User | None:
    try:
        identifier = UUID(user_id)
    except ValueError:
        return None
    return get_active_user_by_id(db, identifier)
