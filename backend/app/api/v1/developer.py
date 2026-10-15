"""Read-only developer overview and narrowly scoped source switches."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.api.developer_access import require_developer, require_local_pipeline
from app.core.config import get_settings
from app.models.article import Article
from app.models.claim import Claim
from app.models.evolution import ClaimRelationship
from app.models.pipeline import PipelineJob
from app.models.source import Source
from app.models.user import User

router = APIRouter(dependencies=[Depends(require_developer)])


class SourceSwitch(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    enabled: bool


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    sources = (await db.scalars(select(Source).order_by(Source.name))).all()
    jobs = (await db.scalars(select(PipelineJob).order_by(PipelineJob.started_at.desc()).limit(20))).all()
    processing = (await db.execute(select(Article.processing_status, func.count()).group_by(Article.processing_status))).all()
    nlp = (await db.execute(select(Article.nlp_status, func.count()).group_by(Article.nlp_status))).all()
    return {
        "pipeline_enabled": get_settings().DEVELOPER_PIPELINE_ENABLED,
        "nlp_cycle_limit": get_settings().NLP_MAX_ARTICLES_PER_CYCLE,
        "counts": {"articles": await db.scalar(select(func.count()).select_from(Article)) or 0,
                   "claims": await db.scalar(select(func.count()).select_from(Claim)) or 0,
                   "relationships": await db.scalar(select(func.count()).select_from(ClaimRelationship)) or 0},
        "processing": {key.value: count for key, count in processing},
        "nlp": {key.value: count for key, count in nlp},
        "sources": [{"id": str(s.id), "name": s.name, "type": s.type.value,
                     "enabled": s.is_active, "last_collected_at": s.last_collected_at} for s in sources],
        # Do not expose raw summaries/errors: upstream responses can contain secrets.
        "jobs": [{"id": str(j.id), "type": j.job_type, "status": j.status,
                  "started_at": j.started_at, "finished_at": j.finished_at,
                  "heartbeat_at": j.heartbeat_at, "lease_expires_at": j.lease_expires_at,
                  "has_error": bool(j.error)} for j in jobs],
    }


@router.post("/sources/{source_id}")
async def switch_source(
    source_id: uuid.UUID, change: SourceSwitch,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_local_pipeline),
) -> dict[str, Any]:
    source = await db.get(Source, source_id)
    if source is None:
        raise HTTPException(404, "Source not found")
    source.is_active = change.enabled
    await db.commit()
    return {"id": str(source.id), "enabled": source.is_active}
