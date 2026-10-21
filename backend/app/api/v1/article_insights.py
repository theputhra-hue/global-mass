"""Read-only article investigations, independent of model and graph availability."""

from datetime import datetime
from typing import Any
from uuid import UUID

from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.api.deps import get_db_session
from app.models.article import Article
from app.models.claim import Claim
from app.models.evolution import ClaimRelationship

router = APIRouter()


class ArticleDetail(BaseModel):
    id: UUID
    title: str
    url: str
    author: str | None
    domain: str | None
    language: str | None
    published_at: datetime | None
    collected_at: datetime
    processed_at: datetime | None
    word_count: int | None
    nlp_status: str
    processing_status: str
    body: str
    body_source: str
    content_completeness: str = "unknown"
    claims_total: int
    assessment_counts: dict[str, int]


class EntityItem(BaseModel):
    text: str
    type: str


class ClaimItem(BaseModel):
    id: UUID
    article_id: UUID
    text: str
    extracted_at: datetime
    confidence: float | None
    verdict: str | None
    verdict_probability: float | None
    verdict_rationale: str | None
    verdict_evidence: dict[str, Any] | None
    entities: list[EntityItem]


class ClaimPage(BaseModel):
    article_id: UUID
    total: int
    limit: int
    offset: int
    items: list[ClaimItem]
    selected: ClaimItem | None = None


class ArticleNode(BaseModel):
    id: UUID
    title: str
    domain: str | None
    url: str
    published_at: datetime | None


class ConnectionEdge(BaseModel):
    id: UUID
    from_article_id: UUID
    to_article_id: UUID
    from_claim_id: UUID
    to_claim_id: UUID
    from_text: str
    to_text: str
    relationship_type: str
    score: float
    mutation_evidence: dict[str, Any] | None


class ArticleConnections(BaseModel):
    article_id: UUID
    basis: str = "stored_postgres_claim_relationships"
    total_edges: int
    limit: int
    truncated: bool
    articles: list[ArticleNode]
    edges: list[ConnectionEdge]
    observed_propagation: bool = False


async def _article(article_id: UUID, db: AsyncSession) -> Article:
    item = await db.get(Article, article_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Article not found.")
    return item


def _claim(item: Claim) -> ClaimItem:
    return ClaimItem(
        id=item.id, article_id=item.article_id, text=item.claim_text,
        extracted_at=item.extracted_at, confidence=item.confidence,
        verdict=item.verdict, verdict_probability=item.verdict_probability,
        verdict_rationale=item.verdict_rationale,
        verdict_evidence=item.verdict_evidence if isinstance(item.verdict_evidence, dict) else None,
        entities=[EntityItem(text=e.entity_text, type=e.entity_type) for e in item.entities],
    )


@router.get("/articles/{article_id}", response_model=ArticleDetail | dict[str, Any])
async def article_detail(
    article_id: UUID, release: UUID | None = None, db: AsyncSession = Depends(get_db_session),
) -> ArticleDetail | dict[str, Any]:
    if release is not None:
        from app.api.v1 import published
        return await published.detail(article_id, run=await published.active(release, db), db=db)
    article = await _article(article_id, db)
    claims = await db.scalar(select(func.count()).select_from(Claim).where(Claim.article_id == article_id))
    # Aggregate every stored claim, independently of the claims page size. These
    # are recorded model labels, not validated truth or a misinformation rate.
    label = func.coalesce(func.nullif(func.upper(func.trim(Claim.verdict)), ""), "UNASSESSED")
    assessment_counts = dict((await db.execute(
        select(label, func.count()).where(Claim.article_id == article_id).group_by(label)
    )).all())
    cleaned = article.cleaned_content
    body = cleaned if cleaned and cleaned.strip() else article.content or ""
    # Raw RSS content may contain HTML. Return plain text, never executable markup.
    body = BeautifulSoup(body, "html.parser").get_text("\n", strip=True)
    return ArticleDetail(
        id=article.id, title=article.title, url=article.url, author=article.author,
        domain=article.domain, language=article.language,
        published_at=article.published_at, collected_at=article.collected_at,
        processed_at=article.processed_at, word_count=article.word_count,
        nlp_status=article.nlp_status.value, processing_status=article.processing_status.value,
        body=body, body_source="cleaned_content" if cleaned and cleaned.strip() else "content" if body else "missing",
        claims_total=claims or 0,
        assessment_counts=assessment_counts,
    )


@router.get("/articles/{article_id}/claims", response_model=ClaimPage | dict[str, Any])
async def article_claims(
    article_id: UUID,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    selected: UUID | None = None,
    release: UUID | None = None,
    db: AsyncSession = Depends(get_db_session),
) -> ClaimPage | dict[str, Any]:
    if release is not None:
        from app.api.v1 import published
        return await published.claims(article_id, limit=limit, offset=offset, selected=selected,
                                      run=await published.active(release, db), db=db)
    await _article(article_id, db)
    scope = Claim.article_id == article_id
    total = await db.scalar(select(func.count()).select_from(Claim).where(scope))
    query = select(Claim).options(selectinload(Claim.entities)).where(scope)
    claims = list((await db.scalars(query.order_by(Claim.extracted_at, Claim.id).limit(limit).offset(offset))).all())
    chosen = next((c for c in claims if c.id == selected), None)
    if selected and chosen is None:
        chosen = await db.scalar(query.where(Claim.id == selected))
        if chosen is None:
            raise HTTPException(status_code=404, detail="Selected claim does not belong to this article.")
    return ClaimPage(
        article_id=article_id, total=total or 0, limit=limit, offset=offset,
        items=[_claim(c) for c in claims], selected=_claim(chosen) if chosen else None,
    )


@router.get("/articles/{article_id}/connections", response_model=ArticleConnections | dict[str, Any])
async def article_connections(
    article_id: UUID,
    limit: int = Query(100, ge=1, le=200),
    release: UUID | None = None,
    db: AsyncSession = Depends(get_db_session),
) -> ArticleConnections | dict[str, Any]:
    if release is not None:
        from app.api.v1 import published
        return await published.connections(article_id, limit=limit, run=await published.active(release, db), db=db)
    article = await _article(article_id, db)
    source, target = aliased(Claim), aliased(Claim)
    joined = (select(ClaimRelationship, source, target)
              .join(source, source.id == ClaimRelationship.from_claim_id)
              .join(target, target.id == ClaimRelationship.to_claim_id)
              .where(or_(source.article_id == article_id, target.article_id == article_id)))
    total = await db.scalar(select(func.count()).select_from(joined.subquery())) or 0
    rows = (await db.execute(joined.order_by(ClaimRelationship.score.desc(), ClaimRelationship.id).limit(limit))).all()
    ids = {article.id}
    edges = []
    for relationship, first, second in rows:
        ids.update((first.article_id, second.article_id))
        edges.append(ConnectionEdge(
            id=relationship.id, from_article_id=first.article_id, to_article_id=second.article_id,
            from_claim_id=first.id, to_claim_id=second.id,
            from_text=first.claim_text, to_text=second.claim_text,
            relationship_type=relationship.relationship_type.value, score=relationship.score,
            mutation_evidence=relationship.mutation_evidence,
        ))
    articles = (await db.scalars(select(Article).where(Article.id.in_(ids)).order_by(Article.published_at, Article.id))).all()
    return ArticleConnections(
        article_id=article_id, total_edges=total, limit=limit, truncated=total > len(edges),
        articles=[ArticleNode(id=a.id, title=a.title, domain=a.domain, url=a.url, published_at=a.published_at) for a in articles],
        edges=edges,
    )
