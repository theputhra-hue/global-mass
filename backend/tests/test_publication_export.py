from datetime import UTC, datetime

import pytest
from fastapi import HTTPException

from app.models.article import NLPStatusEnum, ProcessingStatusEnum
from app.schemas.publication import PublicationProvenance
from app.services.publications.export import export_snapshot
from tests.test_article_insights import dataset
from tests.test_publication_contract import snapshot_payload


async def test_export_scopes_completed_analysis_and_excludes_private_data(db_session):
    articles, claims = await dataset(db_session)
    stamp = datetime(2026, 10, 15, 9, tzinfo=UTC)
    for a, c in zip(articles, claims, strict=True):
        a.processing_status = ProcessingStatusEnum.processed
        a.nlp_status = NLPStatusEnum.completed
        a.content = "Full article content must not be exported"
        a.raw_metadata = {"secret": "private-source-value"}
        a.published_at = stamp
        c.extracted_at = stamp
    articles[1].nlp_status = NLPStatusEnum.failed
    claims[2].extracted_at = datetime(2026, 10, 14, 9, tzinfo=UTC)
    await db_session.commit()
    provenance = PublicationProvenance.model_validate({**snapshot_payload()["provenance"], "analysis_started_at": "2026-10-15T00:00:00Z"})
    exported = await export_snapshot(db_session, provenance)
    assert [c.id for c in exported.claims] == [claims[0].id]
    assert [a.id for a in exported.articles] == [articles[0].id]
    body = exported.canonical_bytes()
    assert b"Full article content" not in body and b"private-source-value" not in body
    assert b"hashed_password" not in body
    assert all("embedding" not in row for row in exported.model_dump()["claims"])
    assert all("embedding" not in row for row in exported.model_dump()["articles"])


async def test_empty_export_does_not_invent_a_release(db_session):
    with pytest.raises(HTTPException) as exc:
        await export_snapshot(db_session, PublicationProvenance.model_validate(snapshot_payload()["provenance"]))
    assert exc.value.status_code == 422
