"""Add a server-controlled read-only role without changing existing accounts."""
from alembic import op

revision = "gmee10"
down_revision = "gmee09"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        # A new enum value must commit before a later transaction can use it.
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'viewer'")


def downgrade() -> None:
    # PostgreSQL cannot remove one enum value without rebuilding the type. Do
    # not silently turn viewers into writers or invalidate existing accounts.
    raise RuntimeError("Viewer-role downgrade requires an explicit account migration.")
