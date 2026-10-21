"""Local map navigation must read the saved snapshot without mixing live rows."""
import copy
import uuid
from typing import Any

from app.models.publication import PublicationHead, PublicationUpload
from app.schemas.publication import PublicationSnapshot
from app.services.publications.store import activate
from tests.test_article_insights import dataset
from tests.test_article_maps import mapped_payload


async def test_local_map_drilldown_and_overlay_remain_pinned_after_head_changes(async_client, db_session):
    articles, _ = await dataset(db_session)
    payload = mapped_payload(2)
    article_id = str(articles[0].id)
    payload["articles"][0]["id"] = article_id
    payload["articles"][0]["title"] = "Saved map title"
    payload["topic_map"]["assignments"][0]["article_id"] = article_id
    payload["claims"][0]["article_id"] = article_id
    payload["claims"][1]["article_id"] = payload["articles"][1]["id"]
    owner = uuid.uuid4()
    db_session.add(PublicationHead(id=1, revision=0))
    await db_session.commit()

    async def materialize(value: dict[str, Any], revision: int) -> None:
        snapshot = PublicationSnapshot.model_validate(value)
        db_session.add(PublicationUpload(run_id=snapshot.run_id, digest=snapshot.sha256(),
                                        uploaded_by=owner, payload=snapshot.model_dump(mode="json")))
        await db_session.commit()
        await activate(db_session, snapshot.run_id, snapshot.sha256(), revision, owner)

    await materialize(payload, 0)
    newer = copy.deepcopy(payload)
    newer["run_id"] = str(uuid.uuid4())
    newer["articles"][0]["title"] = "Later map title"
    newer["claims"][0]["text"] = "Later saved claim"
    newer["relationships"][0]["score"] = .95
    await materialize(newer, 1)

    base = f"/api/v1/corpus/articles/{article_id}"
    pin = f"release={payload['run_id']}"
    detail = (await async_client.get(f"{base}?{pin}")).json()
    assert detail["title"] == "Saved map title" and detail["body_source"] == "not_published"
    claims = (await async_client.get(f"{base}/claims?{pin}")).json()
    assert [c["text"] for c in claims["items"]] == ["Fixture claim"]
    connections = (await async_client.get(f"{base}/connections?{pin}")).json()
    assert connections["edges"][0]["score"] == .8
    graph = (await async_client.get(f"/api/v1/graph/full?{pin}")).json()
    assert graph["run_id"] == payload["run_id"]
    assert graph["edges"][0]["score"] == .8
    assert {n["title"] for n in graph["nodes"]} == {a["title"] for a in payload["articles"]}
    assert graph["scope"]["total_relationships"] == 1
    live = (await async_client.get(base)).json()
    assert live["title"] == "Report 0" and live["body_source"] == "content"
    assert (await async_client.get(f"{base}/claims")).json()["items"][0]["text"] == "Claim in report 0"
    assert (await async_client.get(f"{base}/connections")).json()["edges"] == []
    assert (await async_client.get("/api/v1/capabilities")).json()["mode"] == "local"


async def test_local_recorded_overlay_rejects_unknown_and_unactivated_snapshots(async_client, db_session):
    snapshot = PublicationSnapshot.model_validate(mapped_payload())
    db_session.add(PublicationUpload(run_id=snapshot.run_id, digest=snapshot.sha256(),
                                    uploaded_by=uuid.uuid4(), payload=snapshot.model_dump(mode="json")))
    await db_session.commit()
    for run in (snapshot.run_id, uuid.uuid4()):
        assert (await async_client.get(f"/api/v1/graph/full?release={run}")).status_code == 404
    assert (await async_client.get("/api/v1/graph/full?release=invalid")).status_code == 422
