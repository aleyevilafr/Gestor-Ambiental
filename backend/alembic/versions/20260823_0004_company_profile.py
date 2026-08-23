"""add company profile fields

Revision ID: 20260823_0004
Revises: 20260822_0003
"""

from alembic import op
import sqlalchemy as sa


revision = "20260823_0004"
down_revision = "20260822_0003"
branch_labels = None
depends_on = None


company_type = sa.Enum("SPA", "LIMITADA", "SA_CERRADA", "SA_ABIERTA", "EIRL", "OTHER", "UNKNOWN", name="company_type")


def upgrade() -> None:
    company_type.create(op.get_bind(), checkfirst=True)
    op.add_column("organizations", sa.Column("company_type", company_type, nullable=False, server_default="UNKNOWN"))
    op.add_column("organizations", sa.Column("business_purpose", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("address", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "address")
    op.drop_column("organizations", "business_purpose")
    op.drop_column("organizations", "company_type")
    company_type.drop(op.get_bind(), checkfirst=True)
