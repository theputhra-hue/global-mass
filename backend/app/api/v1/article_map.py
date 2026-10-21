"""Release-pinned complete-collection pages; no ML imports or inferred links."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models.publication import (
    PublicationHead,
    PublishedArticleMapRow,
    PublishedArticleRow,
    PublishedCityNetworkRow,
    PublishedCityRoadRow,
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


@router.get("/atlas/roads")
async def city_roads(
    release: uuid.UUID,
    offset: int = Query(0, ge=0, le=100000),
    limit: int = Query(2000, ge=1, le=2000),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    summary = await db.get(PublishedCityNetworkRow, release)
    if summary is None:
        return {"available": False, "run_id": str(release), "reason": "Semantic streets have not been published for this release."}
    total = summary.payload["total_roads"]
    actual = await db.scalar(select(func.count()).select_from(PublishedCityRoadRow).where(PublishedCityRoadRow.run_id == release))
    if total != actual:
        raise HTTPException(503, "Published roads are incomplete; no partial network is called complete.")
    rows = (await db.scalars(select(PublishedCityRoadRow).where(PublishedCityRoadRow.run_id == release)
                             .order_by(PublishedCityRoadRow.ordinal).offset(offset).limit(limit))).all()
    return {"available": True, "run_id": str(release), "total": total, "offset": offset,
            "next_offset": offset + len(rows) if offset + len(rows) < total else None,
            "summary": summary.payload if offset == 0 else None, "items": [row.payload for row in rows]}


async def topic_summary(db: AsyncSession, release: uuid.UUID) -> dict[str, Any]:
    summary = await db.get(PublishedArticleMapRow, release)
    if summary is None:
        raise HTTPException(404, "Topic analysis is unavailable for this published release.")
    return summary.payload


def member_json(row: PublishedArticleRow) -> dict[str, Any]:
    return {"id": str(row.id), "title": row.title, "domain": row.domain,
            "published_at": row.published_at, "url": row.payload.get("url"),
            "basis": row.payload.get("article_map", {}).get("basis", "unavailable")}


@router.get("/topics/{topic_id}")
async def topic_detail(
    topic_id: str, release: uuid.UUID,
    offset: int = Query(0, ge=0, le=20000), limit: int = Query(20, ge=1, le=100),
    order: str = Query("newest", pattern="^(newest|oldest)$"),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    summary = await topic_summary(db, release)
    topic = next((t for t in summary["topics"] if t["id"] == topic_id), None)
    if topic is None:
        raise HTTPException(404, "Topic is not in this published release.")
    scope = (PublishedArticleRow.run_id == release,
             PublishedArticleRow.payload["article_map"]["topic_id"].as_string() == topic_id)
    count, sources, earliest, latest = (await db.execute(select(func.count(),
        func.count(func.distinct(PublishedArticleRow.domain)), func.min(PublishedArticleRow.published_at),
        func.max(PublishedArticleRow.published_at)).where(*scope))).one()
    if count != topic["article_count"]:
        raise HTTPException(503, "Published topic membership is incomplete.")
    stamp = PublishedArticleRow.published_at
    rows = (await db.scalars(select(PublishedArticleRow).where(*scope).order_by(
        (stamp.asc() if order == "oldest" else stamp.desc()).nullslast(), PublishedArticleRow.id
    ).offset(offset).limit(limit))).all()
    network = await db.get(PublishedCityNetworkRow, release)
    highways = [h for h in network.payload["highways"] if topic_id in (h["a"], h["b"])] if network else []
    labels = {t["id"]: t["label"] for t in summary["topics"]}
    return {"run_id": str(release), "topic": topic, "total": count, "sources": sources,
            "earliest": earliest, "latest": latest, "offset": offset, "limit": limit,
            "next_offset": offset + len(rows) if offset + len(rows) < count else None,
            "items": [member_json(row) for row in rows],
            "connections": [{**h, "neighbor_id": h["b"] if h["a"] == topic_id else h["a"],
                             "neighbor_label": labels.get(h["b"] if h["a"] == topic_id else h["a"], "Unknown topic")} for h in highways],
            "methods": {k: summary.get(k) for k in ("method", "embedding_model", "embedding_revision", "completed_at", "coverage")},
            "observed_propagation": False}


@router.get("/articles/{article_id}/context")
async def article_context(article_id: uuid.UUID, release: uuid.UUID,
                          db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    summary = await topic_summary(db, release)
    article = await db.get(PublishedArticleRow, (release, article_id))
    if article is None:
        raise HTTPException(404, "Article is not in this published release.")
    assignment = article.payload.get("article_map", {})
    topic = next((t for t in summary["topics"] if t["id"] == assignment.get("topic_id")), None)
    network = await db.get(PublishedCityNetworkRow, release)
    neighbors = []
    if network and str(article_id) in network.payload["article_ids"]:
        ids = network.payload["article_ids"]
        index = ids.index(str(article_id))
        # Roads are retained mutual neighbors, bounded by the validated neighbor_k.
        roads = (await db.scalars(select(PublishedCityRoadRow).where(
            PublishedCityRoadRow.run_id == release, or_(
                PublishedCityRoadRow.payload[0].as_integer() == index,
                PublishedCityRoadRow.payload[1].as_integer() == index))
            .order_by(PublishedCityRoadRow.ordinal).limit(21))).all()
        if len(roads) > network.payload["neighbor_k"] or len(roads) != network.payload["degree"][index]:
            raise HTTPException(503, "Published article neighborhood is incomplete.")
        scores = {uuid.UUID(ids[r.payload[1] if r.payload[0] == index else r.payload[0]]): r.payload[2] for r in roads}
        records = (await db.scalars(select(PublishedArticleRow).where(
            PublishedArticleRow.run_id == release, PublishedArticleRow.id.in_(scores)))).all() if scores else []
        if len(records) != len(scores):
            raise HTTPException(503, "Published neighborhood endpoints are incomplete.")
        neighbors = sorted([{**member_json(r), "score": scores[r.id]} for r in records], key=lambda r: (-r["score"], r["id"]))
    return {"run_id": str(release), "article_id": str(article_id), "topic": topic,
            "basis": assignment.get("basis", "unavailable"), "neighbors": neighbors,
            "network_available": network is not None, "observed_propagation": False}
