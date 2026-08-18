"""Create the initial compliance management schema.

Revision ID: 20260818_0001
Revises:
Create Date: 2026-08-18
"""

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260818_0001"
down_revision = None
branch_labels = None
depends_on = None


role_code = postgresql.ENUM("ADMIN", "RESPONSIBLE", "READER", name="role_code")
compliance_status = postgresql.ENUM(
    "PENDING", "IN_PROGRESS", "COMPLIANT", "OVERDUE", name="compliance_status"
)


def upgrade() -> None:
    role_code.create(op.get_bind(), checkfirst=True)
    compliance_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("rut", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("code", role_code, nullable=False, unique=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.UniqueConstraint("organization_id", "email", name="uq_users_organization_email"),
    )
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_table(
        "obligations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("matter", sa.String(length=100), nullable=False),
        sa.Column("regulatory_source", sa.String(length=255), nullable=False),
        sa.Column("article", sa.String(length=100), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("frequency", sa.String(length=100), nullable=True),
        sa.Column("compliance_status", compliance_status, server_default=sa.text("'PENDING'"), nullable=False),
        sa.Column("responsible_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["responsible_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
    )
    op.create_index("ix_obligations_organization_id", "obligations", ["organization_id"])
    op.create_index("ix_obligations_is_active", "obligations", ["is_active"])

    op.bulk_insert(
        sa.table(
            "roles",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("code", role_code),
            sa.column("name", sa.String),
            sa.column("description", sa.String),
        ),
        [
            {"id": uuid.uuid4(), "code": "ADMIN", "name": "Administrador", "description": "Administra organización, usuarios y obligaciones."},
            {"id": uuid.uuid4(), "code": "RESPONSIBLE", "name": "Responsable", "description": "Gestiona sus obligaciones asignadas."},
            {"id": uuid.uuid4(), "code": "READER", "name": "Lector", "description": "Consulta la información sin modificarla."},
        ],
    )

    op.execute(
        """
        CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table_name in ("organizations", "users", "obligations"):
        op.execute(
            f"CREATE TRIGGER trg_{table_name}_updated_at "
            f"BEFORE UPDATE ON {table_name} "
            "FOR EACH ROW EXECUTE FUNCTION set_updated_at();"
        )

    op.execute(
        """
        CREATE FUNCTION get_organization_compliance_summary(p_organization_id UUID)
        RETURNS TABLE (
            total_active BIGINT,
            pending BIGINT,
            in_progress BIGINT,
            compliant BIGINT,
            overdue BIGINT
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT
                COUNT(*) FILTER (WHERE is_active),
                COUNT(*) FILTER (WHERE is_active AND compliance_status = 'PENDING'),
                COUNT(*) FILTER (WHERE is_active AND compliance_status = 'IN_PROGRESS'),
                COUNT(*) FILTER (WHERE is_active AND compliance_status = 'COMPLIANT'),
                COUNT(*) FILTER (WHERE is_active AND compliance_status = 'OVERDUE')
            FROM obligations
            WHERE organization_id = p_organization_id;
        END;
        $$ LANGUAGE plpgsql STABLE;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS get_organization_compliance_summary(UUID);")
    for table_name in ("obligations", "users", "organizations"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table_name}_updated_at ON {table_name};")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")
    op.drop_index("ix_obligations_is_active", table_name="obligations")
    op.drop_index("ix_obligations_organization_id", table_name="obligations")
    op.drop_table("obligations")
    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_table("users")
    op.drop_table("roles")
    op.drop_table("organizations")
    compliance_status.drop(op.get_bind(), checkfirst=True)
    role_code.drop(op.get_bind(), checkfirst=True)
