from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.role import Role, RoleCode
from app.models.user import User


def list_users_by_organization(db: Session, organization_id: UUID) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .options(joinedload(User.role))
            .where(User.organization_id == organization_id)
            .order_by(User.created_at.desc())
        )
    )


def get_user_in_organization(db: Session, organization_id: UUID, user_id: UUID) -> User | None:
    return db.scalar(
        select(User)
        .options(joinedload(User.role))
        .where(User.organization_id == organization_id, User.id == user_id)
    )


def get_user_by_email_in_organization(db: Session, organization_id: UUID, email: str) -> User | None:
    return db.scalar(
        select(User).where(User.organization_id == organization_id, User.email == email)
    )


def get_role_by_code(db: Session, code: RoleCode) -> Role | None:
    return db.scalar(select(Role).where(Role.code == code))


def add_user(db: Session, user: User) -> None:
    db.add(user)


def save(db: Session) -> None:
    db.commit()
