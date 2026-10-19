from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy import event, func, select

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.main import app
from app.models.publication import PublicationUpload
from app.models.user import RoleEnum, User
from app.schemas.publication import PublicationSnapshot
from tests.test_publication_contract import snapshot_payload


@pytest.fixture
def developer(monkeypatch):
    user = User(id=uuid4(), email="developer@example.test", role=RoleEnum.admin, is_active=True)
    monkeypatch.setattr(get_settings(), "DEVELOPER_UPLOAD_EMAILS", [user.email])
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)


async def test_upload_replay_conflict_and_history(async_client, db_session, developer):
    payload = snapshot_payload()
    first = await async_client.post("/api/v1/publications/upload", json=payload)
    assert first.status_code == 200
    assert first.json()["status"] == "staged"
    assert first.json()["replayed"] is False
    replay = await async_client.post("/api/v1/publications/upload", json=payload)
    assert replay.json()["replayed"] is True
    payload["articles"][0]["title"] = "Changed"
    assert (await async_client.post("/api/v1/publications/upload", json=payload)).status_code == 409
    assert await db_session.scalar(select(func.count()).select_from(PublicationUpload)) == 1
    history = await async_client.get("/api/v1/publications")
    assert len(history.json()["items"]) == 1
    assert "payload" not in history.json()["items"][0]


@pytest.mark.parametrize("denied", ["email", "role", "inactive", "empty"])
async def test_access_requires_active_admin_and_allowlist(async_client, developer, monkeypatch, denied):
    if denied == "email":
        developer.email = "other@example.test"
    elif denied == "role":
        developer.role = RoleEnum.user
    elif denied == "inactive":
        developer.is_active = False
    else:
        monkeypatch.setattr(get_settings(), "DEVELOPER_UPLOAD_EMAILS", [])
    assert (await async_client.get("/api/v1/publications/access")).json()["allowed"] is False
    assert (await async_client.post("/api/v1/publications/upload", json=snapshot_payload())).status_code == 403
    assert (await async_client.get("/api/v1/publications")).status_code == 403


async def test_invalid_private_and_oversized_uploads_are_not_saved(async_client, db_session, developer, monkeypatch):
    payload = snapshot_payload()
    payload["secret"] = "do not reflect this"
    response = await async_client.post("/api/v1/publications/upload", json=payload)
    assert response.status_code == 422
    assert "do not reflect this" not in response.text
    assert (await async_client.post("/api/v1/publications/upload", content=b"not json")).status_code == 422
    monkeypatch.setattr("app.api.v1.publications.MAX_UPLOAD_BYTES", 10)
    assert (await async_client.post("/api/v1/publications/upload", content=b"x" * 11)).status_code == 413
    assert await db_session.scalar(select(func.count()).select_from(PublicationUpload)) == 0


async def test_anonymous_cannot_upload(async_client):
    assert (await async_client.post("/api/v1/publications/upload", json=snapshot_payload())).status_code in (401, 403)


async def test_review_reads_bounded_samples_without_loading_entire_release(async_client, db_session, developer):
    payload = snapshot_payload()
    payload["articles"] += [{**payload["articles"][0], "id": str(uuid4()), "title": f"Extra article {i}"} for i in range(7)]
    payload["claims"] += [{**payload["claims"][0], "id": str(uuid4()), "text": f"Extra claim {i}"} for i in range(7)]
    uploaded = await async_client.post("/api/v1/publications/upload", json=payload)
    assert uploaded.status_code == 200
    raw_payload_reads: list[Any] = []

    def inspect_columns(conn, statement, multiparams, params, execution_options):
        raw_payload_reads.extend(column for column in getattr(statement, "selected_columns", [])
                                 if column is PublicationUpload.__table__.c.payload)

    event.listen(db_session.bind.sync_engine, "before_execute", inspect_columns)
    try:
        response = await async_client.get(f"/api/v1/publications/{payload['run_id']}/review")
    finally:
        event.remove(db_session.bind.sync_engine, "before_execute", inspect_columns)
    assert response.status_code == 200
    review = response.json()
    assert (review["articles"], review["claims"], review["relationships"]) == (8, 9, 1)
    normalized = PublicationSnapshot.model_validate(payload).model_dump(mode="json")
    assert review["sample_articles"] == normalized["articles"][:5]
    assert [c["id"] for c in review["sample_claims"]] == [c["id"] for c in payload["claims"][:5]]
    assert review["provenance"] == payload["provenance"]
    assert review["sha256"] == uploaded.json()["sha256"]
    assert raw_payload_reads == []
    assert "payload" not in review
