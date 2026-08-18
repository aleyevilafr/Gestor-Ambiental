"""Require an organization RUT.

Revision ID: 20260818_0002
Revises: 20260818_0001
Create Date: 2026-08-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260818_0002"
down_revision = "20260818_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("organizations", "rut", existing_type=sa.String(length=20), nullable=False)


def downgrade() -> None:
    op.alter_column("organizations", "rut", existing_type=sa.String(length=20), nullable=True)
