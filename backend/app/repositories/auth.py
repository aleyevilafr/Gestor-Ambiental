from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.organization import Organization
from app.models.role import Role, RoleCode
from app.models.user import User


def get_role_by_code(db: Session, code: RoleCode) -> Role | None:
    return db.scalar(select(Role).where(Role.code == code))


def add_organization(db: Session, organization: Organization) -> None:
    db.add(organization)
    db.flush()


def add_user(db: Session, user: User) -> None:
    db.add(user)
    db.flush()


def get_active_users_by_email(db: Session, email: str) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .options(joinedload(User.organization), joinedload(User.role))
            .where(User.email == email, User.is_active.is_(True))
        )
    )


def get_active_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.scalar(
        select(User)
        .options(joinedload(User.organization), joinedload(User.role))
        .where(User.id == user_id, User.is_active.is_(True))
    )
