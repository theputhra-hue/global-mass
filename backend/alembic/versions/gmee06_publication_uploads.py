"""Store validated developer publication uploads separately from live data."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "gmee06"
down_revision = "gmee05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "publication_uploads",
        sa.Column("run_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("digest", sa.String(64), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("payload", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("publication_uploads")
