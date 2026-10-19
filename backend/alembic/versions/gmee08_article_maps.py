"""Article topic map summary for immutable v2 releases."""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision = "gmee08"
down_revision = "gmee07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("published_article_maps",
        sa.Column("run_id", pg.UUID(as_uuid=True), sa.ForeignKey("publication_uploads.run_id"), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False))


def downgrade() -> None:
    op.drop_table("published_article_maps")
