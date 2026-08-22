"""Create controls and evidences.

Revision ID: 20260822_0002
Revises: 20260818_0002
Create Date: 2026-08-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260822_0002"
down_revision = "20260818_0002"
branch_labels = None
depends_on = None


control_status = postgresql.ENUM("PENDING", "IN_PROGRESS", "COMPLETED", name="control_status", create_type=False)
evidence_type = postgresql.ENUM("FILE", "EXTERNAL_LINK", name="evidence_type", create_type=False)


def upgrade() -> None:
    control_status.create(op.get_bind(), checkfirst=True)
    evidence_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "controls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("obligation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", control_status, server_default=sa.text("'PENDING'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["obligation_id"], ["obligations.id"]),
    )
    op.create_index("ix_controls_obligation_id", "controls", ["obligation_id"])
    op.create_table(
        "evidences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("obligation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("control_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evidence_type", evidence_type, nullable=False),
        sa.Column("file_url", sa.String(length=2048), nullable=True),
        sa.Column("external_url", sa.String(length=2048), nullable=True),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["obligation_id"], ["obligations.id"]),
        sa.ForeignKeyConstraint(["control_id"], ["controls.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"]),
    )
    op.create_index("ix_evidences_obligation_id", "evidences", ["obligation_id"])
    op.create_index("ix_evidences_control_id", "evidences", ["control_id"])
    op.execute("CREATE TRIGGER trg_controls_updated_at BEFORE UPDATE ON controls FOR EACH ROW EXECUTE FUNCTION set_updated_at();")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_controls_updated_at ON controls;")
    op.drop_index("ix_evidences_control_id", table_name="evidences")
    op.drop_index("ix_evidences_obligation_id", table_name="evidences")
    op.drop_table("evidences")
    op.drop_index("ix_controls_obligation_id", table_name="controls")
    op.drop_table("controls")
    evidence_type.drop(op.get_bind(), checkfirst=True)
    control_status.drop(op.get_bind(), checkfirst=True)
