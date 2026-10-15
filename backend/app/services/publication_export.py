"""Export completed claims only; explicit operator-declared analysis provenance."""
import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article, NLPStatusEnum, ProcessingStatusEnum
from app.models.claim import Claim
from app.models.evolution import ClaimRelationship
from app.models.pipeline import PipelineJob
from app.models.source import Source
from app.schemas.publication import PublicationProvenance, PublicationSnapshot


async def export_snapshot(db: AsyncSession, provenance: PublicationProvenance) -> PublicationSnapshot:
    from datetime import UTC, datetime
    running = await db.scalar(select(PipelineJob.id).where(PipelineJob.status == "running").limit(1))
    if running:
        raise HTTPException(409, "A pipeline stage is running. Wait for completion before exporting.")
    scope = (
        Article.processing_status == ProcessingStatusEnum.processed, Article.nlp_status == NLPStatusEnum.completed,
        Claim.extracted_at >= provenance.analysis_started_at,
        Claim.extracted_at <= provenance.analysis_completed_at,
    )
    claims = list((await db.scalars(select(Claim).join(Article, Article.id == Claim.article_id).where(
        *scope).order_by(Claim.id).limit(50001))).all())
    if not claims:
        raise HTTPException(422, "No completed analyzed claims in this period. Adjust the dates after reviewing your results.")
    if len(claims) > 50000:
        raise HTTPException(413, "This period has too many claims. Choose a smaller analysis period.")
    article_ids = {c.article_id for c in claims}
    if len(article_ids) > 20000:
        raise HTTPException(413, "This period has too many articles. Choose a smaller period.")
    selected_claims = select(Claim.id).join(Article, Article.id == Claim.article_id).where(*scope)
    rows = (await db.execute(select(Article, Source.name).join(Source, Source.id == Article.source_id)
                            .where(Article.id.in_(article_ids)).order_by(Article.id))).all()
    edges = (await db.scalars(select(ClaimRelationship).where(
        ClaimRelationship.from_claim_id.in_(selected_claims), ClaimRelationship.to_claim_id.in_(selected_claims),
    ).order_by(ClaimRelationship.id).limit(100001))).all()
    # Only explicit public fields are copied. Never serialize an ORM instance wholesale.
    payload: dict[str, Any] = {
        "schema_version": "1", "run_id": str(uuid.uuid4()), "generated_at": datetime.now(UTC),
        "provenance": provenance.model_dump(mode="json"),
        "articles": [{"id": a.id, "source_name": name, "title": a.title, "url": a.url,
            "domain": a.domain or "unknown", "author": a.author, "language": a.language,
            "word_count": a.word_count, "published_at": a.published_at} for a, name in rows],
        "claims": [{"id": c.id, "article_id": c.article_id, "text": c.claim_text,
            "extracted_at": c.extracted_at, "confidence": c.confidence, "verdict": c.verdict,
            "verdict_probability": c.verdict_probability, "rationale": c.verdict_rationale} for c in claims],
        "relationships": [{"id": e.id, "from_claim_id": e.from_claim_id, "to_claim_id": e.to_claim_id,
            "relationship_type": e.relationship_type.value, "score": e.score, "created_at": e.created_at} for e in edges],
    }
    return PublicationSnapshot.model_validate(payload)
