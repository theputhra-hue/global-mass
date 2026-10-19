"""Versioned semantic roads and hierarchy, separate from recorded claim links."""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision = "gmee09"
down_revision = "gmee08"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for name, columns in (
        ("published_city_networks", []),
        ("published_city_roads", [sa.Column("ordinal", sa.Integer(), primary_key=True)]),
    ):
        op.create_table(name,
            sa.Column("run_id", pg.UUID(as_uuid=True), sa.ForeignKey("publication_uploads.run_id"), primary_key=True),
            *columns, sa.Column("payload", sa.JSON(), nullable=False))


def downgrade() -> None:
    op.drop_table("published_city_roads")
    op.drop_table("published_city_networks")
