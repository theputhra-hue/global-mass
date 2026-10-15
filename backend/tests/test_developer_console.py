from uuid import uuid4

import pytest

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.main import app
from app.models.source import Source, SourceTypeEnum
from app.models.user import RoleEnum, User


@pytest.fixture
def operator(monkeypatch):
    user = User(id=uuid4(), email="pavan@gmee.com", role=RoleEnum.admin, is_active=True)
    monkeypatch.setattr(get_settings(), "DEVELOPER_UPLOAD_EMAILS", ["pavan@gmee.com", "prab@gmee.com"])
    monkeypatch.setattr(get_settings(), "DEVELOPER_PIPELINE_ENABLED", True)
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.parametrize("email,role,active", [
    ("other@gmee.com", RoleEnum.admin, True),
    ("pavan@gmee.com", RoleEnum.user, True),
    ("prab@gmee.com", RoleEnum.admin, False),
])
async def test_non_developers_cannot_bypass_ui(async_client, operator, email, role, active):
    operator.email, operator.role, operator.is_active = email, role, active
    assert (await async_client.get("/api/v1/developer/overview")).status_code == 403
    for stage in ("collection", "preprocessing", "nlp", "evolution"):
        assert (await async_client.post(f"/api/v1/{stage}/trigger")).status_code == 403
    assert (await async_client.post(f"/api/v1/developer/sources/{uuid4()}", json={"enabled": True})).status_code == 403


@pytest.mark.parametrize("email", ["pavan@gmee.com", "prab@gmee.com"])
async def test_developer_overview_and_source_switch(async_client, db_session, operator, email):
    operator.email = email
    source = Source(name="Fixture source", type=SourceTypeEnum.rss, url_or_identifier="https://example.org/feed", is_active=True)
    db_session.add(source)
    await db_session.commit()
    response = await async_client.get("/api/v1/developer/overview")
    assert response.status_code == 200
    assert response.json()["counts"] == {"articles": 0, "claims": 0, "relationships": 0}
    assert "url_or_identifier" not in response.json()["sources"][0]
    result = await async_client.post(f"/api/v1/developer/sources/{source.id}", json={"enabled": False})
    assert result.status_code == 200
    await db_session.refresh(source)
    assert source.is_active is False
    assert (await async_client.post(f"/api/v1/developer/sources/{source.id}", json={"enabled": "false"})).status_code == 422


async def test_cloud_flag_blocks_execution_even_for_developer(async_client, operator, monkeypatch):
    monkeypatch.setattr(get_settings(), "DEVELOPER_PIPELINE_ENABLED", False)
    assert (await async_client.get("/api/v1/developer/overview")).status_code == 200
    for stage in ("collection", "preprocessing", "nlp", "evolution"):
        assert (await async_client.post(f"/api/v1/{stage}/trigger")).status_code == 403
    assert (await async_client.post(f"/api/v1/developer/sources/{uuid4()}", json={"enabled": False})).status_code == 403
