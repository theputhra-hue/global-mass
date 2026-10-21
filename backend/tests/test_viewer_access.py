"""Exercise actual token/database authorization, not an overridden user guard."""
import uuid
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.api.deps import get_db_session, get_redis_client
from app.cloud import create_cloud_app
from app.core.security import create_access_token, hash_password
from app.main import app as local_app
from app.models.investigation import Investigation
from app.models.user import RoleEnum, User
from scripts.create_viewer_accounts import provision


@pytest.fixture(params=["local", "cloud"])
async def viewer_client(request, db_session, redis_client):
    target = local_app if request.param == "local" else create_cloud_app()
    user = User(id=uuid.uuid4(), email="viewer@example.com", role=RoleEnum.viewer,
                hashed_password=hash_password("viewer-test-password"), is_active=True)
    db_session.add(user)
    await db_session.commit()
    # A stale, elevated JWT must not bypass the current database role.
    token = create_access_token(user_id=str(user.id), role="admin", jti=str(uuid.uuid4()))
    target.dependency_overrides[get_db_session] = lambda: db_session
    target.dependency_overrides[get_redis_client] = lambda: redis_client
    async with AsyncClient(transport=ASGITransport(app=target), base_url="http://test",
                           headers={"Authorization": f"Bearer {token}"}) as client:
        yield client
    target.dependency_overrides.clear()


async def test_viewer_reads_profile_but_cannot_compare_or_save(viewer_client, db_session):
    profile = await viewer_client.get("/api/v1/auth/me")
    assert profile.status_code == 200 and profile.json()["role"] == "viewer"
    assert (await viewer_client.get("/api/v1/casebook")).json()["items"] == []
    comparison = {"older_text": "The cost is 10 dollars.", "newer_text": "The cost is 20 dollars."}
    with patch("app.api.v1.casebook.analyze_text_change") as analyze:
        for path, body in (
            ("/graph/mutation/compare", comparison),
            ("/casebook", {"title": "Must not save", "comparison": comparison}),
            (f"/casebook/{uuid.uuid4()}/review", {"revision": 1, "notes": "No", "status": "reviewed"}),
            ("/publications/upload", {}),
            (f"/publications/{uuid.uuid4()}/publish", {}),
        ):
            response = await viewer_client.post("/api/v1" + path, json=body)
            assert response.status_code == 403, (path, response.text)
            assert response.json()["detail"] == "This account has read-only access."
        analyze.assert_not_called()
    assert await db_session.scalar(select(func.count()).select_from(Investigation)) == 0
    access = await viewer_client.get("/api/v1/publications/access")
    assert access.status_code == 200 and access.json()["allowed"] is False


async def test_viewer_can_login_refresh_and_logout(viewer_client):
    login = await viewer_client.post("/api/v1/auth/login", json={
        "email": "viewer@example.com", "password": "viewer-test-password"})
    assert login.status_code == 200
    rotated = await viewer_client.post("/api/v1/auth/refresh", json={
        "refresh_token": login.json()["refresh_token"]})
    assert rotated.status_code == 200
    headers = {"Authorization": f"Bearer {rotated.json()['access_token']}"}
    logout = await viewer_client.post("/api/v1/auth/logout", headers=headers,
                                     json={"refresh_token": rotated.json()["refresh_token"]})
    assert logout.status_code == 204
    assert (await viewer_client.get("/api/v1/auth/me", headers=headers)).status_code == 401


async def test_public_registration_cannot_self_assign_viewer_or_admin(async_client, db_session):
    result = await async_client.post("/api/v1/auth/register", json={
        "email": "signup@example.com", "password": "normal-test-password", "role": "admin"})
    assert result.status_code == 201
    user = await db_session.scalar(select(User).where(User.email == "signup@example.com"))
    assert user.role == RoleEnum.user


async def test_registration_can_only_opt_into_fewer_permissions(async_client):
    payload = {"email": "readonly-signup@example.com", "password": "normal-test-password",
               "read_only": True, "role": "admin"}
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
    assert (await async_client.get("/api/v1/auth/me", headers=headers)).json()["role"] == "viewer"
    denied = await async_client.post("/api/v1/graph/mutation/compare", headers=headers,
        json={"older_text": "Ten people attended.", "newer_text": "Twenty people attended."})
    assert denied.status_code == 403
    # Registration never changes an existing identity, even with another flag.
    assert (await async_client.post("/api/v1/auth/register", json={**payload, "read_only": False})).status_code == 409


async def test_read_only_registration_requires_a_boolean(async_client):
    response = await async_client.post("/api/v1/auth/register", json={
        "email": "invalid-flag@example.com", "password": "normal-test-password", "read_only": "false"})
    assert response.status_code == 422


async def test_provisioning_is_idempotent_and_refuses_existing_identity(db_session):
    accounts = [{"email": "guest@example.com", "password": "generated-test-password"}]
    await provision(db_session, accounts)
    await provision(db_session, accounts)
    user = await db_session.scalar(select(User).where(User.email == accounts[0]["email"]))
    assert user.role == RoleEnum.viewer
    original_hash = user.hashed_password
    with pytest.raises(ValueError, match="does not match"):
        await provision(db_session, [{**accounts[0], "password": "different-password"}])
    assert user.hashed_password == original_hash
    user.role = RoleEnum.admin
    await db_session.commit()
    with pytest.raises(ValueError, match="does not match"):
        await provision(db_session, accounts)
    assert user.role == RoleEnum.admin
