"""Real token/database approval checks for both deployed runtime profiles."""
import uuid
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_db_session, get_redis_client
from app.cloud import create_cloud_app
from app.core.config import get_settings
from app.core.security import create_access_token
from app.main import app as local_app
from app.models.publication import (
    PublicationHead,
    PublicationUpload,
    PublishedArticleRow,
)
from app.models.user import RoleEnum, User
from tests.test_publication_contract import snapshot_payload

DATA_PATHS = ["/dashboard", "/corpus/articles", "/graph/atlas", "/graph/full", "/publications/status"]


def bearer(user: User) -> dict[str, str]:
    return {"Authorization": "Bearer " + create_access_token(str(user.id), user.role.value, str(uuid.uuid4()))}


@pytest.fixture(params=["local", "cloud"])
async def approval_client(request, db_session, redis_client, monkeypatch):
    monkeypatch.setattr(get_settings(), "DEVELOPER_UPLOAD_EMAILS", ["pavan@gmee.com", "prab@gmee.com"])
    app = local_app if request.param == "local" else create_cloud_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    app.dependency_overrides[get_redis_client] = lambda: redis_client
    developer = User(id=uuid.uuid4(), email="pavan@gmee.com", hashed_password="unused",
                     role=RoleEnum.admin, is_active=True, access_status="approved")
    db_session.add(developer)
    payload = snapshot_payload()
    run = uuid.UUID(payload["run_id"])
    db_session.add(PublicationUpload(run_id=run, digest="0" * 64, uploaded_by=developer.id, payload=payload))
    await db_session.flush()
    article = payload["articles"][0]
    db_session.add(PublishedArticleRow(run_id=run, id=uuid.UUID(article["id"]),
        title=article["title"], domain=article["domain"], payload=article))
    db_session.add(PublicationHead(id=1, run_id=run, revision=1))
    await db_session.commit()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, {"headers": bearer(developer), "id": str(developer.id)}
    app.dependency_overrides.clear()


async def signup(client: AsyncClient, email: str = "visitor@example.com", **extra: Any) -> tuple[dict[str, Any], dict[str, str], dict[str, Any]]:
    result = await client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "  New Visitor  ", "password": "Visitor-password-test!", **extra})
    assert result.status_code == 201, result.text
    headers = {"Authorization": "Bearer " + result.json()["access_token"]}
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    return me.json(), headers, result.json()


async def test_anonymous_and_pending_accounts_cannot_read_any_data(approval_client):
    client, _ = approval_client
    for path in DATA_PATHS:
        assert (await client.get("/api/v1" + path)).status_code == 401, path
    me, headers, tokens = await signup(client, role="admin", access_status="approved", read_only=False)
    assert me["role"] == "viewer" and me["access_status"] == "pending"
    assert me["full_name"] == "New Visitor"
    for path in DATA_PATHS:
        response = await client.get("/api/v1" + path, headers=headers)
        assert response.status_code == 403, (path, response.text)
    # Pending visitors can safely refresh and sign out; neither grants access.
    refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh.status_code == 200
    assert (await client.get("/api/v1/corpus/articles", headers=headers)).status_code == 403
    assert (await client.post("/api/v1/auth/logout", headers=headers, json={"refresh_token": refresh.json()["refresh_token"]})).status_code == 204


async def test_developer_approval_unlocks_only_viewing_and_is_not_overwritten(approval_client, db_session):
    client, developer = approval_client
    me, headers, _ = await signup(client)
    admin = developer["headers"]
    listing = await client.get("/api/v1/developer/accounts", params={"access_status": "pending"}, headers=admin)
    assert listing.status_code == 200
    account = listing.json()["items"][0]
    assert account["full_name"] == "New Visitor" and account["email"] == me["email"]
    assert set(account) == {"id", "email", "full_name", "access_status", "revision", "created_at", "reviewed_at", "role", "is_active"}
    assert listing.json()["counts"]["pending"] == 1
    path = f"/api/v1/developer/accounts/{me['id']}/review"
    approved = await client.post(path, headers=admin, json={"decision": "approve", "expected_revision": 1})
    assert approved.status_code == 200 and approved.json()["access_status"] == "approved"
    assert approved.json()["role"] == "viewer" and approved.json()["revision"] == 2
    # Same token, current DB decision. It never becomes an administrator.
    data = await client.get("/api/v1/corpus/articles", headers=headers)
    assert data.status_code == 200 and data.headers["cache-control"] == "private, no-store"
    for endpoint in ("/graph/mutation/compare", "/casebook", "/publications/upload"):
        assert (await client.post("/api/v1" + endpoint, json={}, headers=headers)).status_code == 403
    assert (await client.get("/api/v1/developer/accounts", headers=headers)).status_code == 403
    stale = await client.post(path, headers=admin, json={"decision": "reject", "expected_revision": 1})
    assert stale.status_code == 409
    user = await db_session.get(User, uuid.UUID(me["id"]), populate_existing=True)
    assert str(user.access_reviewed_by) == developer["id"] and user.access_status == "approved"
    assert user.access_reviewed_at is not None


async def test_directory_includes_every_role_and_disabled_account_with_pagination(approval_client, db_session):
    client, developer = approval_client
    me, visitor_headers, _ = await signup(client)
    for role in (RoleEnum.viewer, RoleEnum.user, RoleEnum.researcher):
        db_session.add(User(id=uuid.uuid4(), email=f"{role.value}@example.com", hashed_password="never-return-this",
                            role=role, full_name=role.value, is_active=role != RoleEnum.user, access_status="approved"))
    await db_session.commit()
    headers = developer["headers"]
    response = await client.get("/api/v1/developer/accounts", headers=headers)
    assert response.status_code == 200
    directory = response.json()
    assert directory["counts"] == {"pending": 1, "approved": 4, "rejected": 0, "all": 5}
    assert directory["total"] == 5
    assert {row["role"] for row in directory["items"]} == {role.value for role in RoleEnum}
    assert {row["email"] for row in directory["items"]} == {
        "pavan@gmee.com", me["email"], "viewer@example.com", "user@example.com", "researcher@example.com"}
    assert next(row for row in directory["items"] if row["role"] == "user")["is_active"] is False
    assert "hashed_password" not in response.text and "never-return-this" not in response.text
    seen: list[str] = []
    for offset in (0, 2, 4):
        page = await client.get("/api/v1/developer/accounts", params={"limit": 2, "offset": offset}, headers=headers)
        assert page.json()["total"] == 5
        seen.extend(row["id"] for row in page.json()["items"])
    assert len(seen) == len(set(seen)) == 5
    approved = await client.get("/api/v1/developer/accounts", params={"access_status": "approved"}, headers=headers)
    assert approved.json()["total"] == 4
    assert all(row["access_status"] == "approved" for row in approved.json()["items"])
    assert (await client.get("/api/v1/developer/accounts", params={"offset": 10001}, headers=headers)).json()["items"] == []
    assert (await client.get("/api/v1/developer/accounts", headers=visitor_headers)).status_code == 403
    assert (await client.get("/api/v1/developer/accounts")).status_code == 401


async def test_declined_accounts_stay_locked_and_other_admins_cannot_review(approval_client, db_session):
    client, developer = approval_client
    me, headers, _ = await signup(client)
    rogue = User(id=uuid.uuid4(), email="other-admin@example.com", hashed_password="unused",
                 role=RoleEnum.admin, is_active=True)
    db_session.add(rogue)
    await db_session.commit()
    path = f"/api/v1/developer/accounts/{me['id']}/review"
    body = {"decision": "reject", "expected_revision": 1}
    assert (await client.get("/api/v1/developer/accounts", headers=bearer(rogue))).status_code == 403
    assert (await client.post(path, headers=bearer(rogue), json=body)).status_code == 403
    assert (await client.post(path, headers=headers, json=body)).status_code == 403
    assert (await client.post(path, headers=developer["headers"], json=body)).status_code == 200
    profile = await client.get("/api/v1/auth/me", headers=headers)
    assert profile.json()["access_status"] == "rejected"
    for endpoint in DATA_PATHS:
        assert (await client.get("/api/v1" + endpoint, headers=headers)).status_code == 403
    assert (await client.post(path, headers=developer["headers"], json={"decision": "approve", "expected_revision": 2})).status_code == 409
    assert (await client.post(f"/api/v1/developer/accounts/{developer['id']}/review", headers=developer["headers"], json={"decision": "approve", "expected_revision": 1})).status_code == 409


@pytest.mark.parametrize("name", [None, "", "   ", "x" * 121])
async def test_registration_requires_a_real_name(approval_client, name):
    client, _ = approval_client
    response = await client.post("/api/v1/auth/register", json={"email": "invalid@example.com", "password": "Visitor-password-test!", "full_name": name})
    assert response.status_code == 422


async def test_request_filters_and_revision_validation(approval_client):
    client, developer = approval_client
    me, _, _ = await signup(client)
    for params in ({"limit": 51}, {"offset": -1}, {"access_status": "admin"}):
        assert (await client.get("/api/v1/developer/accounts", params=params, headers=developer["headers"])).status_code == 422
    for body in ({"decision": "admin", "expected_revision": 1}, {"decision": "approve", "expected_revision": True}, {"decision": "approve", "expected_revision": 1, "role": "admin"}):
        assert (await client.post(f"/api/v1/developer/accounts/{me['id']}/review", json=body, headers=developer["headers"])).status_code == 422
