"""Regressions for security, cache isolation and truthful pipeline states."""

import asyncio
import time
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.api.v1 import verdicts
from app.core import redis_helpers, security
from app.core.config import get_settings
from app.db.redis_client import redis_client as shared_redis_client
from app.main import create_app
from app.ml.llm_client import (
    AnthropicLLMClient,
    _NoOpLLMClient,
    get_llm_client,
)
from app.models.article import Article, NLPStatusEnum, ProcessingStatusEnum
from app.models.source import Source, SourceTypeEnum
from app.services.analysis.orchestrator import NLPOrchestrator
from app.services.preprocessing.near_duplicate_detector import NearDuplicateDetector


async def test_login_limit_is_atomic_under_concurrent_requests(redis_client):
    attempts = await asyncio.gather(*(
        redis_helpers.check_login_rate_limit(redis_client, "same@example.com", "127.0.0.1")
        for _ in range(20)
    ))
    assert attempts.count(0) == 5
    assert all(1 <= ttl <= 900 for ttl in attempts if ttl)


async def test_blocklist_covers_final_fractional_second():
    client = AsyncMock()
    await redis_helpers.blocklist_access_token(
        client, "revoked", datetime.now(UTC) + timedelta(milliseconds=500)
    )
    client.set.assert_awaited_once_with("gmee:auth:blocklist:revoked", "revoked", ex=1)


async def test_lowercase_bearer_logout_invalidates_access_token(async_client):
    registered = await async_client.post("/api/v1/auth/register", json={"full_name": "Test Visitor", 
        "email": "bearer@example.com", "password": "testPassword123!",
    })
    tokens = registered.json()
    headers = {"Authorization": f"bearer {tokens['access_token']}"}
    response = await async_client.post("/api/v1/auth/logout", headers=headers,
        json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 204
    assert (await async_client.get("/api/v1/auth/me", headers=headers)).status_code == 401


@pytest.mark.parametrize("missing", ["sub", "jti", "exp", "iat"])
def test_access_token_requires_security_claims(missing):
    payload = {"sub": str(uuid.uuid4()), "jti": "id", "exp": time.time() + 60,
               "iat": time.time()}
    del payload[missing]
    token = jwt.encode(payload, get_settings().JWT_SECRET, algorithm="HS256")
    assert security.decode_access_token(token) is None


async def test_rate_limit_failures_keep_cors_and_security_headers(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_FAIL_CLOSED_SENSITIVE", True)
    monkeypatch.setattr(settings, "CORS_ORIGINS", ["http://localhost:3000"])
    monkeypatch.setattr(shared_redis_client, "get_client",
                        AsyncMock(side_effect=ConnectionError("offline")))
    async with AsyncClient(transport=ASGITransport(app=create_app()), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 503
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["retry-after"] == "30"


async def test_mutation_chain_cache_is_parameter_specific(monkeypatch):
    cached_chains = [{"chain_id": "cached"}]
    monkeypatch.setattr(verdicts, "_MUT_CACHE", {(3, 8): (time.monotonic(), cached_chains)})
    result = MagicMock()
    result.all.return_value = []
    db = AsyncMock()
    db.execute.return_value = result
    context = AsyncMock()
    context.__aenter__.return_value = db
    monkeypatch.setattr(verdicts, "async_session_maker", lambda: context)
    assert await verdicts.mutation_chains(3, 8) == {"chains": cached_chains}
    assert await verdicts.mutation_chains(4, 1) == {"chains": []}
    assert db.execute.await_count == 1


@pytest.mark.parametrize("query", ["limit=0", "limit=31", "min_versions=1", "min_versions=101"])
async def test_mutation_chain_query_is_bounded(async_client, query):
    assert (await async_client.get(f"/api/v1/verdicts/game/mutations?{query}")).status_code == 422


async def test_batch_duplicate_provenance_keeps_root_and_cannot_self_link(db_session, monkeypatch):
    detector = NearDuplicateDetector(db_session)
    await detector.initialize()
    first = Article(id=uuid.uuid4(), cleaned_content=" ".join(f"w{i}" for i in range(32)))
    second = Article(id=uuid.uuid4(), cleaned_content=" ".join(
        "changed" if i == 0 else f"w{i}" for i in range(32)))
    third = Article(id=uuid.uuid4(), cleaned_content=" ".join(
        "changed" if i in (0, 10) else f"w{i}" for i in range(32)))
    assert detector.find_and_insert(first) is None
    monkeypatch.setattr(detector.lsh, "query", lambda _: [str(first.id)])
    assert detector.find_and_insert(second) == first.id
    monkeypatch.setattr(detector.lsh, "query", lambda _: [str(second.id)])
    assert detector.find_and_insert(third) == first.id
    assert detector.find_and_insert(first) is None
    assert first.canonical_article_id is None


async def test_disabled_llm_skips_without_loading_embedding_models(db_session, monkeypatch):
    source = Source(name="Disabled backend", type=SourceTypeEnum.rss, url_or_identifier="fixture")
    db_session.add(source)
    await db_session.flush()
    article = Article(source_id=source.id, title="Claim", url="https://fixture/disabled",
        content="Mars has two moons.", content_hash="disabled",
        processing_status=ProcessingStatusEnum.processed)
    db_session.add(article)
    await db_session.commit()
    embed = MagicMock(side_effect=AssertionError("disabled backend loaded a model"))
    monkeypatch.setattr("app.ml.embedding_service.EmbeddingService.generate_document_embedding", embed)
    summary = await NLPOrchestrator(llm_client=_NoOpLLMClient()).run_nlp_cycle(
        db_session, chain_evolution=False)
    assert summary.status_counts["skipped"] == 1
    assert summary.llm_calls_made == 0
    stored = await db_session.scalar(select(Article).where(Article.id == article.id))
    assert stored.nlp_status == NLPStatusEnum.skipped
    assert stored.last_error == "Claim extraction disabled by LLM_BACKEND=none"
    embed.assert_not_called()


async def test_explicit_anthropic_backend_does_not_silently_switch_models(monkeypatch):
    monkeypatch.setattr(get_settings(), "LLM_BACKEND", "anthropic")
    monkeypatch.setattr(get_settings(), "ANTHROPIC_API_KEY", "")
    client = get_llm_client()
    assert isinstance(client, AnthropicLLMClient)
    with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
        await client.extract_claims("Mars has two moons.")
