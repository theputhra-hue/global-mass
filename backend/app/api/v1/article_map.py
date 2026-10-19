"""Release-pinned complete-collection pages; no ML imports or inferred links."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models.publication import (
    PublicationHead,
    PublishedArticleMapRow,
    PublishedArticleRow,
)

router = APIRouter()


@router.get("/atlas")
async def atlas(
    release: uuid.UUID | None = None,
    offset: int = Query(0, ge=0, le=20000),
    limit: int = Query(500, ge=1, le=500),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    run = release or await db.scalar(select(PublicationHead.run_id).where(PublicationHead.id == 1))
    if run is None:
        return {"available": False, "run_id": None, "reason": "No complete collection map has been published."}
    summary = await db.get(PublishedArticleMapRow, run)
    if summary is None:
        return {"available": False, "run_id": str(run), "reason": "This release predates article topic maps. Its recorded relationship graph remains available."}
    total = summary.payload["total_articles"]
    actual = await db.scalar(select(func.count()).select_from(PublishedArticleRow).where(PublishedArticleRow.run_id == run))
    if actual != total:
        raise HTTPException(503, "Article map projection is incomplete. No partial map is presented as complete.")
    rows = (await db.scalars(select(PublishedArticleRow).where(PublishedArticleRow.run_id == run)
                             .order_by(PublishedArticleRow.id).offset(offset).limit(limit))).all()
    items = [{"id": str(row.id), "title": row.title, "domain": row.domain,
              "published_at": row.published_at, **row.payload["article_map"]} for row in rows]
    return {"available": True, "run_id": str(run), "total": total, "offset": offset, "limit": limit,
            "next_offset": offset + len(items) if offset + len(items) < total else None,
            "summary": summary.payload if offset == 0 else None, "items": items}
