"""add action fields to controls"""
from alembic import op
import sqlalchemy as sa

revision = "20260823_0005"
down_revision = "20260823_0004"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("controls", sa.Column("responsible_user_id", sa.UUID(), nullable=True))
    op.add_column("controls", sa.Column("expected_evidence", sa.Text(), nullable=True))
    op.create_foreign_key("controls_responsible_user_id_fkey", "controls", "users", ["responsible_user_id"], ["id"])
    op.create_index("ix_controls_responsible_user_id", "controls", ["responsible_user_id"])

def downgrade() -> None:
    op.drop_index("ix_controls_responsible_user_id", table_name="controls")
    op.drop_constraint("controls_responsible_user_id_fkey", "controls", type_="foreignkey")
    op.drop_column("controls", "expected_evidence")
    op.drop_column("controls", "responsible_user_id")
