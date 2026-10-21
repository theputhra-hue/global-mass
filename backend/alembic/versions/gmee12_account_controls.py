"""Add reversible access suspension and durable session invalidation."""
import sqlalchemy as sa

from alembic import op

revision = "gmee12"
down_revision = "gmee11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("access_epoch", sa.Integer(), nullable=False, server_default="1"))
    op.drop_constraint("ck_users_access_status", "users", type_="check")
    op.create_check_constraint("ck_users_access_status", "users",
                               "access_status IN ('pending', 'approved', 'rejected', 'paused', 'banned')")


def downgrade() -> None:
    raise RuntimeError("Account controls downgrade requires explicit review; suspended access and revoked sessions must be preserved.")
