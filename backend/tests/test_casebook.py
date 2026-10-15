"""Owner isolation, immutable snapshots and optimistic concurrent review."""
import hashlib
import json
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.main import app
from app.models.investigation import Investigation
from app.models.user import RoleEnum, User


async def owner(db: AsyncSession, monkeypatch: pytest.MonkeyPatch) -> User:
    user = User(id=uuid.uuid4(), email=f"case-{uuid.uuid4().hex}@example.com", hashed_password="fixture", role=RoleEnum.user, is_active=True)
    db.add(user)
    await db.commit()
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: user)
    return user


def payload() -> dict[str, Any]:
    return {"title": "Bridge case", "notes": "Analyst's observation", "comparison": {"older_text": "The agency found 10 survivors.", "newer_text": "The agency found 12 survivors."}}


async def test_private_casebook_requires_auth(async_client: AsyncClient) -> None:
    assert (await async_client.get("/api/v1/casebook")).status_code == 401
    assert (await async_client.post("/api/v1/casebook", json=payload())).status_code == 401


async def test_snapshot_hash_notes_archive_and_stale_write(async_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch) -> None:
    await owner(db_session,monkeypatch)
    response = await async_client.post("/api/v1/casebook",json=payload())
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    original = response.json()
    cid = original["id"]
    snapshot = original["snapshot"]
    assert "owner_id" not in original and snapshot["analysis"]["observed_propagation"] is False
    assert "NUMERIC_DRIFT" in snapshot["analysis"]["mutation_types"]
    digest = hashlib.sha256(json.dumps(snapshot,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
    assert digest == original["snapshot_sha256"]
    reviewed = await async_client.post(f"/api/v1/casebook/{cid}/review",json={"revision":1,"status":"reviewed","notes":"Revised notes"})
    assert reviewed.status_code == 200
    assert reviewed.json()["snapshot"] == snapshot
    assert reviewed.json()["revision"] == 2
    stale = await async_client.post(f"/api/v1/casebook/{cid}/review",json={"revision":1,"status":"open","notes":"Overwrite"})
    assert stale.status_code == 409
    assert (await async_client.get(f"/api/v1/casebook/{cid}")).json()["notes"] == "Revised notes"
    archived = await async_client.post(f"/api/v1/casebook/{cid}/review",json={"revision":2,"status":"archived","notes":"Filed"})
    assert archived.status_code == 200
    assert (await async_client.get("/api/v1/casebook")).json()["total"] == 0
    assert (await async_client.get("/api/v1/casebook?archived=true")).json()["total"] == 1
    restored = await async_client.post(f"/api/v1/casebook/{cid}/review",json={"revision":3,"status":"open","notes":"Restored"})
    assert restored.status_code == 200 and restored.json()["snapshot_sha256"] == digest


async def test_another_account_cannot_read_edit_or_search_case(async_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch) -> None:
    await owner(db_session,monkeypatch)
    created = (await async_client.post("/api/v1/casebook",json=payload())).json()
    await owner(db_session,monkeypatch)
    assert (await async_client.get(f"/api/v1/casebook/{created['id']}")).status_code == 404
    assert (await async_client.post(f"/api/v1/casebook/{created['id']}/review",json={"revision":1,"status":"archived","notes":"Attack"})).status_code == 404
    result = (await async_client.get("/api/v1/casebook?q=Bridge")).json()
    assert result["total"] == 0 and result["items"] == []


@pytest.mark.parametrize("bad", [{"title":" "},{"title":"x"*161},{"notes":"x"*4001},{"analysis":{"truth":True}},{"comparison":{"older_text":" ","newer_text":"12"}}])
async def test_rejects_bad_input_and_injected_analysis(async_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch, bad: dict[str, Any]) -> None:
    await owner(db_session,monkeypatch)
    assert (await async_client.post("/api/v1/casebook",json={**payload(),**bad})).status_code == 422


async def test_case_search_escapes_wildcards(async_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch) -> None:
    await owner(db_session,monkeypatch)
    await async_client.post("/api/v1/casebook",json=payload())
    assert (await async_client.get("/api/v1/casebook?q=%25")).json()["total"] == 0
    assert (await async_client.get("/api/v1/casebook?q=bridge")).json()["total"] == 1


async def test_public_project_lab_has_disclosed_controls_not_gold(async_client: AsyncClient) -> None:
    response = await async_client.get("/api/v1/project/lab")
    assert response.status_code == 200
    report = response.json()
    assert report["total"] == 12 and report["passed"] == 12
    assert report["lexical_baseline_passed"] == 9
    assert report["research_gold"] is False and len(report["dataset_sha256"]) == 64
    assert all(item["analysis"]["observed_propagation"] is False for item in report["items"])
    unit = next(item for item in report["items"] if item["id"]=="distance")
    assert unit["expected_change"] is False and unit["analysis"]["quantity_equivalent"] is True


async def test_storage_quota_is_bounded_before_analysis(async_client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch) -> None:
    user = await owner(db_session,monkeypatch)
    db_session.add_all([Investigation(owner_id=user.id,title=f"Fixture {i}",notes="",status="open",revision=1,snapshot={},snapshot_sha256="0"*64) for i in range(200)])
    await db_session.commit()
    response = await async_client.post("/api/v1/casebook",json=payload())
    assert response.status_code == 409 and "200-case" in response.json()["detail"]
