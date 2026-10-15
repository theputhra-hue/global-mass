"""Engineering publication tests: isolation, activation, retries and rollback."""
import copy
import uuid
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user, get_db_session
from app.cloud import create_cloud_app
from app.core.config import get_settings
from app.models.publication import PublicationHead
from app.models.user import RoleEnum, User
from tests.test_publication_contract import snapshot_payload


@pytest.fixture
async def cloud_client(db_session, monkeypatch):
    monkeypatch.setattr(get_settings(), "PUBLICATION_ACTIVATION_ENABLED", True)
    monkeypatch.setattr(get_settings(), "DEVELOPER_UPLOAD_EMAILS", ["pavan@gmee.com", "prab@gmee.com"])
    db_session.add(PublicationHead(id=1, revision=0))
    await db_session.commit()
    app = create_cloud_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    user = User(id=uuid.uuid4(), email="pavan@gmee.com", role=RoleEnum.admin, is_active=True)
    app.dependency_overrides[get_current_user] = lambda: user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://cloud") as client:
        yield client, user


async def upload(client: AsyncClient, payload: dict[str, Any]) -> dict[str, Any]:
    response = await client.post("/api/v1/publications/upload", json=payload)
    assert response.status_code == 200, response.text
    return dict(response.json())


def publish_body(receipt: dict[str, Any], revision: int = 0) -> dict[str, Any]:
    return {"sha256": receipt["sha256"], "expected_revision": revision, "reviewed": True}


async def test_staged_data_is_invisible_then_atomic_publish_enables_browsing(cloud_client):
    client, _ = cloud_client
    payload = snapshot_payload()
    receipt = await upload(client, payload)
    assert (await client.get("/api/v1/dashboard")).status_code == 503
    reviewed = (await client.get(f"/api/v1/publications/{payload['run_id']}/review")).json()
    assert reviewed["current"]["revision"] == 0
    published = await client.post(f"/api/v1/publications/{payload['run_id']}/publish", json=publish_body(receipt))
    assert published.status_code == 200, published.text
    assert published.json()["revision"] == 1
    assert (await client.get("/api/v1/dashboard")).json()["claims_total"] == 2
    listing = (await client.get("/api/v1/corpus/articles")).json()
    assert listing["total"] == 1
    article_id = payload["articles"][0]["id"]
    detail = (await client.get(f"/api/v1/corpus/articles/{article_id}")).json()
    assert detail["body_source"] == "not_published" and detail["claims_total"] == 2
    claims = (await client.get(f"/api/v1/corpus/articles/{article_id}/claims")).json()
    assert len(claims["items"]) == 2
    assert (await client.get("/api/v1/corpus/articles/recent")).status_code == 200
    graph = (await client.get("/api/v1/graph/claims")).json()
    assert {n["id"] for n in graph["nodes"]} == {c["id"] for c in payload["claims"]}
    assert graph["edges"][0]["src"] == payload["relationships"][0]["from_claim_id"]


async def test_retries_conflicts_replacement_and_rollback(cloud_client):
    client, _ = cloud_client
    first = snapshot_payload()
    a = await upload(client, first)
    route = f"/api/v1/publications/{first['run_id']}/publish"
    assert (await client.post(route, json=publish_body(a))).status_code == 200
    assert (await client.post(route, json=publish_body(a))).json()["revision"] == 1
    second = snapshot_payload()
    second["articles"][0]["title"] = "New release"
    b = await upload(client, second)
    route2 = f"/api/v1/publications/{second['run_id']}/publish"
    assert (await client.post(route2, json=publish_body(b))).status_code == 409
    assert (await client.get("/api/v1/corpus/articles")).json()["items"][0]["title"] == "Example"
    assert (await client.post(route2, json=publish_body(b, 1))).status_code == 200
    assert (await client.get(f"/api/v1/corpus/articles/{first['articles'][0]['id']}")).status_code == 404
    assert (await client.post(route, json=publish_body(a, 2))).json()["revision"] == 3
    assert (await client.get("/api/v1/corpus/articles")).json()["items"][0]["title"] == "Example"


@pytest.mark.parametrize("fault", ["fingerprint", "not_reviewed", "disabled", "unapproved", "inactive", "reader"])
async def test_publication_gates_cannot_be_bypassed(cloud_client, monkeypatch, fault):
    client, user = cloud_client
    payload = snapshot_payload()
    body = publish_body(await upload(client, payload))
    if fault == "fingerprint": body["sha256"] = "f" * 64
    if fault == "not_reviewed": body["reviewed"] = False
    if fault == "disabled": monkeypatch.setattr(get_settings(), "PUBLICATION_ACTIVATION_ENABLED", False)
    if fault == "unapproved": user.email = "other@gmee.com"
    if fault == "inactive": user.is_active = False
    if fault == "reader": user.role = RoleEnum.user
    result = await client.post(f"/api/v1/publications/{payload['run_id']}/publish", json=body)
    assert result.status_code in (403, 409, 422)
    assert (await client.get("/api/v1/publications/status")).json()["run_id"] is None


async def test_invalid_upload_does_not_replace_active_release(cloud_client):
    client, _ = cloud_client
    payload = snapshot_payload()
    receipt = await upload(client, payload)
    await client.post(f"/api/v1/publications/{payload['run_id']}/publish", json=publish_body(receipt))
    invalid = copy.deepcopy(payload)
    invalid["run_id"] = str(uuid.uuid4())
    invalid["claims"][0]["article_id"] = str(uuid.uuid4())
    assert (await client.post("/api/v1/publications/upload", json=invalid)).status_code == 422
    assert (await client.get("/api/v1/publications/status")).json()["run_id"] == payload["run_id"]


async def test_cloud_has_no_pipeline_routes_and_public_controls_need_no_models(cloud_client):
    client, _ = cloud_client
    assert (await client.get("/api/v1/capabilities")).json()["live_ai"] is False
    assert (await client.get("/api/v1/project/lab")).json()["passed"] == 12
    for stage in ("collection", "preprocessing", "nlp", "evolution"):
        assert (await client.post(f"/api/v1/{stage}/trigger")).status_code == 404
    response = await client.post("/api/v1/graph/mutation/compare", json={"older_text": "10 survivors", "newer_text": "12 survivors"})
    assert response.status_code == 200
    assert (await client.post("/api/v1/graph/mutation/compare", json={"older_text": "10 survivors", "newer_text": "12 survivors", "include_summary": True})).status_code == 409
