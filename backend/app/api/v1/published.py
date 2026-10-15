"""Cloud reads use only an immutable published release, never local pipeline rows."""
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models.publication import (
    PublicationHead,
)
from app.models.publication import (
    PublishedArticleRow as Article,
)
from app.models.publication import (
    PublishedClaimRow as Claim,
)
from app.models.publication import (
    PublishedRelationshipRow as Edge,
)
from app.services.publication_store import status

router = APIRouter()


async def active(db: AsyncSession = Depends(get_db_session)) -> uuid.UUID:
    run_id = await db.scalar(select(PublicationHead.run_id).where(PublicationHead.id == 1))
    if run_id is None:
        raise HTTPException(503, "No analysis has been published yet. An approved developer must publish a reviewed release.")
    return run_id


async def article_row(db: AsyncSession, run_id: uuid.UUID, article_id: uuid.UUID) -> Article:
    row = await db.get(Article, (run_id, article_id))
    if row is None:
        raise HTTPException(404, "Article is not in the current published release.")
    return row


def article_json(row: Article) -> dict[str, Any]:
    return {**row.payload, "nlp_status": "published", "excerpt": "",
            "collected_at": None, "processed_at": None, "processing_status": "published"}


def claim_json(row: Claim) -> dict[str, Any]:
    return {**row.payload, "verdict_rationale": row.payload.get("rationale"),
            "verdict_evidence": None, "entities": []}


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    head = await db.get(PublicationHead, 1)
    if head is None or head.run_id is None:
        raise HTTPException(503, "No analysis has been published yet.")
    run = head.run_id
    release = await status(db)
    # Counts are all scoped to the same pinned release even if another publishes concurrently.
    counts = {name: await db.scalar(select(func.count()).select_from(model).where(model.run_id == run)) or 0
              for name, model in (("articles", Article), ("claims", Claim), ("relationships", Edge))}
    return {"generated_at": datetime.now(UTC), "publication": release,
            "articles_total": counts["articles"], "claims_total": counts["claims"],
            "embedded_claims": 0, "entities_total": 0, "nlp_status_counts": {"published": counts["articles"]},
            "services": {"postgres": "ok", "redis": "managed", "neo4j": "not_required"},
            "graph": {"available": True, "nodes": {"Article": counts["articles"], "Claim": counts["claims"]}, "relationships": counts["relationships"]},
            "cache": {"available": False, "used_memory_human": "Not published", "used_memory_mb": 0}}


@router.get("/corpus/articles")
async def articles(q: str = Query("", max_length=120), domain: str = Query("", max_length=300),
                   limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
                   run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    filters = [Article.run_id == run]
    if q.strip():
        filters.append(or_(Article.title.icontains(q.strip(), autoescape=True), Article.author.icontains(q.strip(), autoescape=True)))
    if domain:
        filters.append(Article.domain == domain)
    total = await db.scalar(select(func.count()).select_from(Article).where(*filters))
    rows = (await db.scalars(select(Article).where(*filters).order_by(Article.published_at.desc().nullslast(), Article.id).limit(limit).offset(offset))).all()
    domains = (await db.execute(select(Article.domain, func.count()).where(Article.run_id == run).group_by(Article.domain).order_by(Article.domain))).all()
    return {"total": total or 0, "limit": limit, "offset": offset, "run_id": str(run),
            "items": [article_json(row) for row in rows], "domains": [{"name": name, "count": count} for name, count in domains]}


@router.get("/corpus/articles/recent")
async def recent(limit: int = Query(12, ge=1, le=40), run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    rows = (await db.scalars(select(Article).where(Article.run_id == run).order_by(Article.published_at.desc().nullslast(), Article.id).limit(limit))).all()
    return {"items": [article_json(row) for row in rows], "basis": "publication_date_not_live_ingestion"}


@router.get("/corpus/stats")
async def stats(run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    row = (await db.execute(select(func.count(), func.count(func.distinct(Article.domain)), func.min(Article.published_at), func.max(Article.published_at)).where(Article.run_id == run))).one()
    return {"total": row[0], "embedded": 0, "domains": row[1], "earliest": row[2].date().isoformat() if row[2] else None,
            "latest": row[3].date().isoformat() if row[3] else None, "nlp_counts": {"published": row[0]}}


@router.get("/corpus/articles/{article_id}")
async def detail(article_id: uuid.UUID, run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    row = await article_row(db, run, article_id)
    count = await db.scalar(select(func.count()).select_from(Claim).where(Claim.run_id == run, Claim.article_id == article_id))
    return {**article_json(row), "body": "", "body_source": "not_published", "content_completeness": "not_published", "claims_total": count or 0}


@router.get("/corpus/articles/{article_id}/claims")
async def claims(article_id: uuid.UUID, limit: int = Query(20, ge=1, le=50), offset: int = Query(0, ge=0),
                 selected: uuid.UUID | None = None, run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    await article_row(db, run, article_id)
    scope = (Claim.run_id == run, Claim.article_id == article_id)
    total = await db.scalar(select(func.count()).select_from(Claim).where(*scope))
    rows = (await db.scalars(select(Claim).where(*scope).order_by(Claim.id).limit(limit).offset(offset))).all()
    chosen = await db.get(Claim, (run, selected)) if selected else None
    if selected and (chosen is None or chosen.article_id != article_id):
        raise HTTPException(404, "Selected claim does not belong to this article.")
    return {"article_id": str(article_id), "total": total or 0, "limit": limit, "offset": offset,
            "items": [claim_json(row) for row in rows], "selected": claim_json(chosen) if chosen else None}


@router.get("/corpus/articles/{article_id}/connections")
async def connections(article_id: uuid.UUID, limit: int = Query(100, ge=1, le=200),
                      run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    from sqlalchemy.orm import aliased
    root = await article_row(db, run, article_id)
    first, second = aliased(Claim), aliased(Claim)
    query = select(Edge, first, second).join(first, (first.id == Edge.from_claim_id) & (first.run_id == Edge.run_id)).join(
        second, (second.id == Edge.to_claim_id) & (second.run_id == Edge.run_id)).where(
        Edge.run_id == run, or_(first.article_id == article_id, second.article_id == article_id))
    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = (await db.execute(query.order_by(Edge.id).limit(limit))).all()
    ids = {root.id}
    edges = []
    for edge, a, b in rows:
        ids.update((a.article_id, b.article_id))
        edges.append({**edge.payload, "from_article_id": str(a.article_id), "to_article_id": str(b.article_id),
                      "from_text": a.text, "to_text": b.text, "mutation_evidence": None})
    neighbors = (await db.scalars(select(Article).where(Article.run_id == run, Article.id.in_(ids)))).all()
    return {"article_id": str(article_id), "basis": "published_claim_relationships", "total_edges": total,
            "limit": limit, "truncated": total > len(rows), "articles": [article_json(row) for row in neighbors],
            "edges": edges, "observed_propagation": False}


@router.get("/graph/full")
async def graph(run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    # A bounded article projection derived from stored claim links, independent of Neo4j.
    nodes = (await db.scalars(select(Article).where(Article.run_id == run).order_by(Article.id).limit(1000))).all()
    selected = {node.id for node in nodes}
    mapping_rows = (await db.execute(select(Claim.id, Claim.article_id).where(Claim.run_id == run, Claim.article_id.in_(selected)))).all()
    mappings = {claim_id: article_id for claim_id, article_id in mapping_rows}
    edges = (await db.scalars(select(Edge).where(Edge.run_id == run, Edge.from_claim_id.in_(mappings), Edge.to_claim_id.in_(mappings)).order_by(Edge.id).limit(2000))).all()
    links = [{"src": str(mappings[e.from_claim_id]), "dst": str(mappings[e.to_claim_id]), "score": e.payload["score"]} for e in edges]
    return {"nodes": [article_json(node) for node in nodes], "edges": links,
            "counts": {"nodes": len(nodes), "edges": len(links)}, "basis": "published_article_relationship_projection", "bounded": True}


@router.get("/graph/claims")
async def claim_graph(run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    rows = (await db.execute(select(Claim, Article).join(Article, (Article.run_id == Claim.run_id) & (Article.id == Claim.article_id))
                            .where(Claim.run_id == run).order_by(Claim.id).limit(1000))).all()
    ids = {claim.id for claim, article in rows}
    links = (await db.scalars(select(Edge).where(Edge.run_id == run, Edge.from_claim_id.in_(ids), Edge.to_claim_id.in_(ids)).order_by(Edge.id).limit(2000))).all()
    return {"nodes": [{"id": str(c.id), "article_id": str(c.article_id), "title": c.text,
                        "domain": a.domain, "url": a.payload["url"], "verdict": c.payload.get("verdict"),
                        "prob": c.payload.get("verdict_probability")} for c, a in rows],
            "edges": [{"src": str(e.from_claim_id), "dst": str(e.to_claim_id), "score": e.payload["score"],
                       "relationship_type": e.payload["relationship_type"]} for e in links],
            "counts": {"nodes": len(rows), "edges": len(links)}, "bounded": True}


@router.get("/corpus/search")
async def text_search(q: str = Query(..., min_length=2, max_length=300), limit: int = Query(10, ge=1, le=30),
                      run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    if len(q.strip()) < 2:
        raise HTTPException(422, "Enter at least two non-space characters.")
    matches = (await db.scalars(select(Article).where(Article.run_id == run,
        or_(Article.title.icontains(q.strip(), autoescape=True), Article.author.icontains(q.strip(), autoescape=True)))
        .order_by(Article.published_at.desc().nullslast(), Article.id).limit(limit))).all()
    return {"query": q, "count": len(matches), "search_mode": "title_author_text", "items": [article_json(row) for row in matches]}


@router.get("/corpus/claims")
async def search_claims(q: str = Query("", max_length=300), limit: int = Query(20, ge=1, le=50),
                        offset: int = Query(0, ge=0), run: uuid.UUID = Depends(active), db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    scope = [Claim.run_id == run]
    if q.strip():
        scope.append(Claim.text.icontains(q.strip(), autoescape=True))
    total = await db.scalar(select(func.count()).select_from(Claim).where(*scope))
    rows = (await db.execute(select(Claim, Article).join(Article, (Article.run_id == Claim.run_id) & (Article.id == Claim.article_id))
        .where(*scope).order_by(Claim.id).limit(limit).offset(offset))).all()
    return {"total": total or 0, "items": [{**claim_json(c), "title": a.title, "domain": a.domain} for c, a in rows]}
