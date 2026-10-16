"""Publish immutable projections, then atomically change one active pointer."""
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.publication import (
    PublicationHead,
    PublicationUpload,
    PublishedArticleRow,
    PublishedClaimRow,
    PublishedRelationshipRow,
)
from app.schemas.publication import PublicationSnapshot


async def status(db: AsyncSession) -> dict[str, Any]:
    head = await db.get(PublicationHead, 1)
    row = await db.get(PublicationUpload, head.run_id) if head and head.run_id else None
    return {"mode": "published", "revision": head.revision if head else 0,
            "run_id": str(head.run_id) if head and head.run_id else None,
            "published_at": head.published_at if head else None,
            "generated_at": row.payload["generated_at"] if row else None,
            "analysis_completed_at": row.payload["provenance"]["analysis_completed_at"] if row else None,
            "sha256": row.digest if row else None,
            "counts": {key: len(row.payload[key]) if row else 0 for key in ("articles", "claims", "relationships")}}


async def activate(db: AsyncSession, run_id: UUID, digest: str, expected_revision: int, user_id: UUID) -> dict[str, Any]:
    head = await db.scalar(select(PublicationHead).where(PublicationHead.id == 1).with_for_update())
    if head is None:
        raise HTTPException(503, "Publication database is not migrated. Run the release migrations.")
    row = await db.get(PublicationUpload, run_id)
    if row is None:
        raise HTTPException(404, "Upload not found.")
    snapshot = PublicationSnapshot.model_validate(row.payload)
    if row.digest != digest or snapshot.sha256() != digest:
        raise HTTPException(409, "Release fingerprint changed. Review the upload again.")
    # Exact retries are safe; do not increment the publication revision twice.
    if head.run_id == run_id:
        return await status(db)
    if head.revision != expected_revision:
        raise HTTPException(409, "Another release was published. Refresh and review before publishing.")
    if not snapshot.articles or not snapshot.claims:
        raise HTTPException(422, "A public release needs articles and analyzed claims.")
    prepared = await db.scalar(select(func.count()).select_from(PublishedArticleRow).where(PublishedArticleRow.run_id == run_id))
    if not prepared:
        batches: list[tuple[Any, list[dict[str, Any]]]] = [
            (PublishedArticleRow, [{"run_id": run_id, "id": a.id, "title": a.title,
                "author": a.author, "domain": a.domain, "published_at": a.published_at,
                "payload": a.model_dump(mode="json")} for a in snapshot.articles]),
            (PublishedClaimRow, [{"run_id": run_id, "id": c.id, "article_id": c.article_id,
                "text": c.text, "payload": c.model_dump(mode="json")} for c in snapshot.claims]),
            (PublishedRelationshipRow, [{"run_id": run_id, "id": e.id,
                "from_claim_id": e.from_claim_id, "to_claim_id": e.to_claim_id,
                "payload": e.model_dump(mode="json")} for e in snapshot.relationships]),
        ]
        for model, rows in batches:
            for offset in range(0, len(rows), 200):
                await db.execute(insert(model), rows[offset:offset + 200])
    # Compare-and-swap also protects SQLite rehearsal; PostgreSQL locks serialize writers.
    changed = await db.execute(update(PublicationHead).where(
        PublicationHead.id == 1, PublicationHead.revision == expected_revision,
    ).values(run_id=run_id, revision=expected_revision + 1,
             published_at=datetime.now(UTC), published_by=user_id).returning(PublicationHead.id))
    if changed.scalar_one_or_none() is None:
        await db.rollback()
        raise HTTPException(409, "Publication changed. Refresh before retrying.")
    await db.commit()
    db.expire(head)
    return await status(db)
