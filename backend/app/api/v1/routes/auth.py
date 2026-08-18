from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, decode_access_token
from app.db.session import get_db
from app.models.role import RoleCode
from app.models.user import User
from app.schemas.auth import AuthenticatedUserResponse, LoginRequest, RegisterRequest
from app.services.auth import authenticate_user, get_active_user, register_organization_and_admin, serialize_user

router = APIRouter(tags=["auth"])
DbSession = Annotated[Session, Depends(get_db)]
ACCESS_COOKIE_NAME = "compliance_access_token"


def set_access_cookie(response: Response, user: User) -> None:
    settings = get_settings()
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=create_access_token(str(user.id)),
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


@router.post("/register", response_model=AuthenticatedUserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: DbSession) -> AuthenticatedUserResponse:
    user = register_organization_and_admin(db, payload)
    set_access_cookie(response, user)
    return serialize_user(user)


@router.post("/login", response_model=AuthenticatedUserResponse)
def login(payload: LoginRequest, response: Response, db: DbSession) -> AuthenticatedUserResponse:
    user = authenticate_user(db, payload)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos.")
    set_access_cookie(response, user)
    return serialize_user(user)


def get_current_active_user(
    db: DbSession,
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE_NAME)] = None,
) -> User:
    if access_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado.")
    try:
        user_id = decode_access_token(access_token)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado.") from error
    user = get_active_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado.")
    return user


def require_roles(*roles: RoleCode):
    def dependency(user: Annotated[User, Depends(get_current_active_user)]) -> User:
        if user.role.code not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para esta acción.")
        return user

    return dependency


@router.get("/me", response_model=AuthenticatedUserResponse)
def me(user: Annotated[User, Depends(get_current_active_user)]) -> AuthenticatedUserResponse:
    return serialize_user(user)
