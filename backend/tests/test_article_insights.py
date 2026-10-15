"""Real ORM queries verify article scoping, bounded data and no inference."""
import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.models.article import Article
from app.models.claim import Claim, ClaimEntity
from app.models.evolution import ClaimRelationship, RelationshipTypeEnum
from app.models.source import Source, SourceTypeEnum


async def dataset(db):
    source = Source(name="Test", type=SourceTypeEnum.rss, url_or_identifier="https://example.org/rss")
    db.add(source)
    await db.flush()
    articles = [Article(source_id=source.id, title=f"Report {n}", url=f"https://example.org/{n}",
                        content="<p>Available <b>report</b> text</p>", content_hash=str(n),
                        published_at=datetime(2026, 10, 1, tzinfo=UTC) + timedelta(days=n)) for n in range(3)]
    db.add_all(articles)
    await db.flush()
    claims = [Claim(article_id=a.id, claim_text=f"Claim in report {i}", confidence=.6) for i, a in enumerate(articles)]
    db.add_all(claims)
    await db.flush()
    db.add(ClaimEntity(claim_id=claims[0].id, entity_text="report", entity_type="ORG", start_char=9, end_char=15))
    await db.commit()
    return articles, claims


@pytest.mark.asyncio
async def test_detail_uses_plain_text_and_reports_unknown_completeness(async_client, db_session):
    articles, _ = await dataset(db_session)
    response = await async_client.get(f"/api/v1/corpus/articles/{articles[0].id}")
    assert response.status_code == 200
    result = response.json()
    assert "<p>" not in result["body"] and "report" in result["body"]
    assert result["claims_total"] == 1
    assert result["body_source"] == "content"
    assert result["content_completeness"] == "unknown"
    assert "raw_metadata" not in result


@pytest.mark.asyncio
async def test_claims_are_scoped_paginated_and_include_entities(async_client, db_session):
    articles, claims = await dataset(db_session)
    db_session.add(Claim(article_id=articles[0].id, claim_text="Another statement"))
    await db_session.commit()
    response = await async_client.get(f"/api/v1/corpus/articles/{articles[0].id}/claims?limit=1&offset=1&selected={claims[0].id}")
    result = response.json()
    assert response.status_code == 200
    assert result["total"] == 2 and len(result["items"]) == 1
    assert all(c["article_id"] == str(articles[0].id) for c in result["items"])
    assert result["selected"]["id"] == str(claims[0].id)
    assert result["selected"]["entities"] == [{"text": "report", "type": "ORG"}]


@pytest.mark.asyncio
async def test_claim_cannot_be_selected_under_another_article(async_client, db_session):
    articles, claims = await dataset(db_session)
    response = await async_client.get(f"/api/v1/corpus/articles/{articles[0].id}/claims?selected={claims[1].id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_connections_include_both_directions_and_exclude_unrelated_edges(async_client, db_session):
    articles, claims = await dataset(db_session)
    fourth = Claim(article_id=articles[2].id, claim_text="Unrelated second statement")
    db_session.add(fourth)
    await db_session.flush()
    edges = [(claims[0], claims[1]), (claims[2], claims[0]), (claims[1], fourth)]
    for first, second in edges:
        db_session.add(ClaimRelationship(from_claim_id=first.id, to_claim_id=second.id,
                                        relationship_type=RelationshipTypeEnum.SIMILAR_TO, score=.9))
    await db_session.commit()
    response = await async_client.get(f"/api/v1/corpus/articles/{articles[0].id}/connections")
    result = response.json()
    assert response.status_code == 200
    assert result["total_edges"] == 2 and len(result["edges"]) == 2
    assert result["truncated"] is False
    assert all(str(articles[0].id) in (e["from_article_id"], e["to_article_id"]) for e in result["edges"])
    assert result["observed_propagation"] is False
    bounded = (await async_client.get(f"/api/v1/corpus/articles/{articles[0].id}/connections?limit=1")).json()
    assert bounded["total_edges"] == 2 and len(bounded["edges"]) == 1 and bounded["truncated"]


@pytest.mark.asyncio
async def test_no_edges_is_a_valid_single_article_neighborhood(async_client, db_session):
    articles, _ = await dataset(db_session)
    result = (await async_client.get(f"/api/v1/corpus/articles/{articles[0].id}/connections")).json()
    assert len(result["articles"]) == 1 and result["edges"] == [] and result["total_edges"] == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("suffix", ["", "/claims", "/connections"])
async def test_unknown_article_is_not_an_empty_success(async_client, suffix):
    assert (await async_client.get(f"/api/v1/corpus/articles/{uuid.uuid4()}{suffix}")).status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["bad-id", "bad-id/claims", f"{uuid.uuid4()}/claims?limit=51",
                                  f"{uuid.uuid4()}/claims?offset=-1", f"{uuid.uuid4()}/connections?limit=201"])
async def test_invalid_ids_and_unbounded_queries_are_rejected(async_client, path):
    assert (await async_client.get(f"/api/v1/corpus/articles/{path}")).status_code == 422
