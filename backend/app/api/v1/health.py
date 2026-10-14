import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.config import get_settings
from app.db.neo4j_client import neo4j_client
from app.db.redis_client import redis_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", response_model=None)
async def readiness_check(
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any] | JSONResponse:
    settings = get_settings()
    status: dict[str, Any] = {}
    is_ready = True

    try:
        async with asyncio.timeout(2.0):
            await db.execute(text("SELECT 1"))
        status["postgres"] = "ok"
    except Exception:
        logger.warning("PostgreSQL readiness probe failed")
        status["postgres"] = "down"
        is_ready = False

    if not settings.NEO4J_URI:
        status["neo4j"] = "disabled"
    else:
        try:
            async with asyncio.timeout(2.0):
                driver = await neo4j_client.get_driver()
                async with driver.session() as session:
                    await session.run("RETURN 1")
            status["neo4j"] = "ok"
        except Exception:
            logger.warning("Neo4j readiness probe failed")
            status["neo4j"] = "down"
            is_ready = False

    # Redis is required for token revocation and login rate limiting.
    if not settings.REDIS_URL:
        status["redis"] = "not_configured"
        is_ready = False
    else:
        try:
            async with asyncio.timeout(2.0):
                client = await redis_client.get_client()
                await client.ping()
            status["redis"] = "ok"
        except Exception:
            logger.warning("Redis readiness probe failed")
            status["redis"] = "down"
            is_ready = False

    status["status"] = "ready" if is_ready else "not_ready"
    if not is_ready:
        return JSONResponse(status_code=503, content=status)
    return status
