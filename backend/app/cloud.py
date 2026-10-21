"""Small public-results API. No ML models, scheduler, collection or local DB access."""
import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session, require_data_access
from app.api.v1 import (
    account_access,
    article_map,
    auth,
    casebook,
    project,
    publications,
    published,
)
from app.api.v1.graph import MutationCompareRequest
from app.core.config import get_settings
from app.core.observability import install_request_context
from app.core.ops_security import install_rate_limiter, install_security_headers
from app.db.postgres import engine
from app.db.redis_client import redis_client
from app.services.evolution.text_changes import analyze_text_change


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if settings.ENABLE_SCHEDULER or settings.DEVELOPER_PIPELINE_ENABLED:
        raise RuntimeError("Cloud results API requires scheduler and local pipeline execution disabled.")
    yield
    await redis_client.close()
    await engine.dispose()


def create_cloud_app() -> FastAPI:
    app = FastAPI(title="GMEE Published Results", version="1.0", lifespan=lifespan)
    install_rate_limiter(app)
    install_security_headers(app)
    install_request_context(app)
    app.add_middleware(CORSMiddleware, allow_origins=get_settings().CORS_ORIGINS,
        allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])
    for router, prefix in ((auth.router, "/auth"), (publications.router, "/publications"),
                           (article_map.router, "/graph"),
                           (published.router, ""), (project.router, "/project"), (casebook.router, "/casebook")):
        app.include_router(router, prefix="/api/v1" + prefix,
                           dependencies=[] if prefix in {"/auth", "/project"} else [Depends(require_data_access)])
    app.include_router(account_access.router, prefix="/api/v1/developer")

    @app.get("/api/v1/capabilities")
    async def capabilities() -> dict[str, Any]:
        return {"mode": "published", "live_ai": False, "pipeline": False,
                "search_mode": "text", "source_text": False, "publication_enabled": get_settings().PUBLICATION_ACTIVATION_ENABLED}

    @app.get("/api/v1/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "mode": "published"}

    @app.get("/api/v1/health/ready", response_model=None)
    async def ready(db: AsyncSession = Depends(get_db_session)) -> dict[str, Any] | JSONResponse:
        results = {"postgres": "down", "redis": "down", "neo4j": "not_required"}
        try:
            async with asyncio.timeout(5):
                (await db.execute(text("SELECT revision FROM publication_head WHERE id=1"))).scalar_one()
                results["postgres"] = "ok"
        except Exception as exc:
            logging.getLogger(__name__).warning("Cloud PostgreSQL readiness failed (%s)", type(exc).__name__)
            await db.rollback()
        try:
            async with asyncio.timeout(5):
                await (await redis_client.get_client()).ping()
                results["redis"] = "ok"
        except Exception:
            logging.getLogger(__name__).warning("Cloud Redis readiness failed")
        ok = results["postgres"] == results["redis"] == "ok"
        body = {**results, "status": "ready" if ok else "not_ready"}
        return body if ok else JSONResponse(body, status_code=503)

    @app.post("/api/v1/graph/mutation/compare", dependencies=[Depends(get_current_user)])
    async def compare(body: MutationCompareRequest) -> dict[str, Any]:
        if body.include_summary:
            raise HTTPException(409, "AI summaries run on your local analysis PC. Cloud comparison uses text rules only.")
        analysis = await asyncio.to_thread(analyze_text_change, body.older_text, body.newer_text,
            older_timestamp=body.older_timestamp, newer_timestamp=body.newer_timestamp,
            context_note=body.context_note, provenance_url=str(body.provenance_url) if body.provenance_url else None)
        return {"analysis": analysis, "llm_summary": None, "summary_status": "not_available_in_cloud"}

    return app


app = create_cloud_app()
