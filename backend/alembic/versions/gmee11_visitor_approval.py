"""Require approval for future visitors while preserving existing identities."""
import sqlalchemy as sa

from alembic import op

revision = "gmee11"
down_revision = "gmee10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("access_status", sa.String(20), nullable=False, server_default="approved"))
    op.add_column("users", sa.Column("access_revision", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("users", sa.Column("access_reviewed_at", sa.DateTime(timezone=True)))
    op.add_column("users", sa.Column("access_reviewed_by", sa.UUID()))
    op.create_check_constraint("ck_users_access_status", "users", "access_status IN ('pending', 'approved', 'rejected')")
    op.create_index("ix_users_visitor_requests", "users", ["role", "access_status", "created_at"])


def downgrade() -> None:
    raise RuntimeError("Approval downgrade requires an explicit access review; pending accounts must never gain access silently.")
