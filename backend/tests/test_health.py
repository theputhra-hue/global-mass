import json
from unittest.mock import AsyncMock

import pytest
from fastapi.responses import JSONResponse
from httpx import AsyncClient

from app.core.config import get_settings
from app.db.redis_client import redis_client


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient) -> None:
    # Health router is mounted under /api/v1 (see app/main.py)
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_readiness_check(async_client: AsyncClient) -> None:
    # Since we don't mock the DB connections in this basic scaffold, 
    # and they'll fail in isolation unless the DBs are running,
    # the readiness probe will likely return 503 and report failures.
    # The requirement is to assert it returns a well-formed body.
    response = await async_client.get("/api/v1/health/ready")
    
    assert response.status_code in (200, 503)
    data = response.json()
    assert "postgres" in data
    assert "neo4j" in data
    assert "redis" in data
    assert "status" in data


@pytest.mark.asyncio
async def test_readiness_missing_services_is_structured(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1 import health

    settings = get_settings().model_copy(update={"REDIS_URL": "", "NEO4J_URI": ""})
    monkeypatch.setattr(health, "get_settings", lambda: settings)
    response = await health.readiness_check(db=AsyncMock())
    assert isinstance(response, JSONResponse)
    assert response.status_code == 503
    assert json.loads(bytes(response.body)) == {
        "postgres": "ok", "redis": "not_configured", "neo4j": "disabled", "status": "not_ready"
    }


@pytest.mark.asyncio
async def test_readiness_optional_graph_and_redis_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1 import health

    settings = get_settings().model_copy(update={"REDIS_URL": "redis://fixture", "NEO4J_URI": ""})
    monkeypatch.setattr(health, "get_settings", lambda: settings)
    client = AsyncMock()
    monkeypatch.setattr(redis_client, "get_client", AsyncMock(return_value=client))
    assert await health.readiness_check(db=AsyncMock()) == {
        "postgres": "ok", "redis": "ok", "neo4j": "disabled", "status": "ready"
    }
    client.ping.side_effect = RuntimeError("private connection details")
    response = await health.readiness_check(db=AsyncMock())
    assert isinstance(response, JSONResponse)
    assert response.status_code == 503
    assert json.loads(bytes(response.body))["redis"] == "down"
    assert b"private" not in response.body
