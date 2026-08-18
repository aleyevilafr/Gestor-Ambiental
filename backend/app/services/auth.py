from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.rut import normalize_chilean_rut
from app.core.security import hash_password, verify_password
from app.models.organization import Organization
from app.models.role import Role, RoleCode
from app.models.user import User
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
    try:
        normalized_rut = normalize_chilean_rut(payload.rut)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

    try:
        with db.begin():
            admin_role = db.scalar(select(Role).where(Role.code == RoleCode.ADMIN))
            if admin_role is None:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se encontró el rol administrador.")
            organization = Organization(name=payload.organization_name.strip(), rut=normalized_rut)
            db.add(organization)
            db.flush()
            user = User(
                organization_id=organization.id,
                role_id=admin_role.id,
                name=payload.name.strip(),
                email=str(payload.email).lower(),
                password_hash=hash_password(payload.password),
            )
            db.add(user)
            db.flush()
            db.refresh(user, attribute_names=["organization", "role"])
    except Exception:
        db.rollback()
        raise
    return user


def authenticate_user(db: Session, payload: LoginRequest) -> User | None:
    users = list(
        db.scalars(
            select(User)
            .options(joinedload(User.organization), joinedload(User.role))
            .where(User.email == str(payload.email).lower(), User.is_active.is_(True))
        )
    )
    if len(users) != 1 or not verify_password(payload.password, users[0].password_hash):
        return None
    return users[0]


def get_active_user(db: Session, user_id: str) -> User | None:
    try:
        identifier = UUID(user_id)
    except ValueError:
        return None
    return db.scalar(
        select(User)
        .options(joinedload(User.organization), joinedload(User.role))
        .where(User.id == identifier, User.is_active.is_(True))
    )
