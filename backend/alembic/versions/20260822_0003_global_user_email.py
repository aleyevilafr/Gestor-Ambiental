"""Make user email globally unique."""
from alembic import op
revision = "20260822_0003"
down_revision = "20260822_0002"
branch_labels = None
depends_on = None
def upgrade() -> None:
    op.drop_constraint("uq_users_organization_email", "users", type_="unique")
    op.create_unique_constraint("uq_users_email", "users", ["email"])
def downgrade() -> None:
    op.drop_constraint("uq_users_email", "users", type_="unique")
    op.create_unique_constraint("uq_users_organization_email", "users", ["organization_id", "email"])
