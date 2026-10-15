"""Immutable published projections and a transactionally switched active release."""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision = "gmee07"
down_revision = "gmee06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("publication_head",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("run_id", pg.UUID(as_uuid=True), sa.ForeignKey("publication_uploads.run_id")),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("published_by", pg.UUID(as_uuid=True)))
    op.execute("INSERT INTO publication_head (id, revision) VALUES (1, 0)")
    for name, columns in (
        ("published_articles", [sa.Column("title", sa.Text(), nullable=False), sa.Column("author", sa.Text()), sa.Column("domain", sa.String(300), nullable=False), sa.Column("published_at", sa.DateTime(timezone=True))]),
        ("published_claims", [sa.Column("article_id", pg.UUID(as_uuid=True), nullable=False), sa.Column("text", sa.Text(), nullable=False)]),
        ("published_relationships", [sa.Column("from_claim_id", pg.UUID(as_uuid=True), nullable=False), sa.Column("to_claim_id", pg.UUID(as_uuid=True), nullable=False)]),
    ):
        op.create_table(name,
            sa.Column("run_id", pg.UUID(as_uuid=True), sa.ForeignKey("publication_uploads.run_id"), primary_key=True),
            sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
            *columns, sa.Column("payload", sa.JSON(), nullable=False))
    for table, fields in (("published_claims", ["article_id"]), ("published_relationships", ["from_claim_id", "to_claim_id"])):
        for field in fields:
            op.create_index(f"ix_{table}_{field}", table, [field])


def downgrade() -> None:
    for table in ("published_relationships", "published_claims", "published_articles", "publication_head"):
        op.drop_table(table)
