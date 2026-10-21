"""Read-only investigation navigation must never mix published releases."""
from uuid import uuid4

from sqlalchemy import delete

from app.models.publication import PublishedCityRoadRow
from tests.test_city_network import city_payload
from tests.test_published_results import (  # noqa: F401
    cloud_client,
    publish_body,
    upload,
)


async def test_topic_membership_pagination_order_and_semantic_neighbors(cloud_client):  # noqa: F811
    client, _ = cloud_client
    payload = city_payload()
    payload["articles"][0]["published_at"] = "2026-01-01T10:00:00Z"
    payload["articles"][1]["published_at"] = "2026-01-02T10:00:00Z"
    receipt = await upload(client, payload)
    run, article = payload["run_id"], payload["articles"][0]["id"]
    topic_url = f"/api/v1/graph/topics/topic-0?release={run}"
    context_url = f"/api/v1/graph/articles/{article}/context?release={run}"
    # Staged uploads cannot be used by guessing release IDs.
    assert (await client.get(topic_url)).status_code == 404
    assert (await client.get(context_url)).status_code == 404
    assert (await client.get(f"/api/v1/corpus/articles/{article}?release={run}")).status_code == 404
    assert (await client.post(f"/api/v1/publications/{run}/publish", json=publish_body(receipt))).status_code == 200
    first = (await client.get(topic_url + "&limit=1&order=oldest")).json()
    second = (await client.get(topic_url + "&limit=1&order=oldest&offset=1")).json()
    assert first["run_id"] == run and first["total"] == 2 and first["next_offset"] == 1
    assert first["items"][0]["id"] == article and second["next_offset"] is None
    assert {r["id"] for r in first["items"] + second["items"]} == {r["id"] for r in payload["articles"][:2]}
    assert first["connections"][0]["support"] == 2
    assert first["connections"][0]["neighbor_id"] == "topic-1"
    context = (await client.get(context_url)).json()
    assert context["run_id"] == run and context["article_id"] == article
    assert context["topic"]["id"] == "topic-0" and context["basis"] == "title_only"
    assert [r["score"] for r in context["neighbors"]] == [.9, .7]
    assert {r["id"] for r in context["neighbors"]} == {payload["articles"][i]["id"] for i in (1, 2)}
    assert context["observed_propagation"] is False
    assert (await client.get(topic_url + "&order=anything")).status_code == 422
    assert (await client.get(topic_url + "&limit=101")).status_code == 422
    assert (await client.get(f"/api/v1/graph/topics/topic-999?release={run}")).status_code == 404
    assert (await client.get(f"/api/v1/graph/articles/{uuid4()}/context?release={run}")).status_code == 404


async def test_topic_article_and_claim_routes_remain_pinned_after_new_publication(cloud_client):  # noqa: F811
    client, _ = cloud_client
    old = city_payload()
    receipt = await upload(client, old)
    run, article = old["run_id"], old["articles"][0]["id"]
    assert (await client.post(f"/api/v1/publications/{run}/publish", json=publish_body(receipt))).status_code == 200
    newer = city_payload()
    receipt2 = await upload(client, newer)
    assert (await client.post(f"/api/v1/publications/{newer['run_id']}/publish", json=publish_body(receipt2, 1))).status_code == 200
    assert (await client.get(f"/api/v1/corpus/articles/{article}")).status_code == 404
    for path in (f"/corpus/articles/{article}", f"/corpus/articles/{article}/claims", f"/corpus/articles/{article}/connections",
                 "/graph/topics/topic-0", f"/graph/articles/{article}/context"):
        response = await client.get(f"/api/v1{path}?release={run}")
        assert response.status_code == 200, response.text
    assert (await client.get("/api/v1/publications/status")).json()["run_id"] == newer["run_id"]


async def test_incomplete_neighbor_projection_returns_error_not_an_empty_neighborhood(cloud_client, db_session):  # noqa: F811
    client, _ = cloud_client
    payload = city_payload()
    receipt = await upload(client, payload)
    run = payload["run_id"]
    assert (await client.post(f"/api/v1/publications/{run}/publish", json=publish_body(receipt))).status_code == 200
    await db_session.execute(delete(PublishedCityRoadRow))
    await db_session.commit()
    response = await client.get(f"/api/v1/graph/articles/{payload['articles'][0]['id']}/context?release={run}")
    assert response.status_code == 503
    assert "incomplete" in response.text


async def test_local_workspace_honors_explicit_published_release_instead_of_live_rows(cloud_client, async_client):  # noqa: F811
    client, _ = cloud_client
    payload = city_payload()
    receipt = await upload(client, payload)
    run, article = payload["run_id"], payload["articles"][0]["id"]
    assert (await client.post(f"/api/v1/publications/{run}/publish", json=publish_body(receipt))).status_code == 200
    # There is no corresponding mutable local Article. A pinned map link must
    # resolve the published row, while ordinary local inspection remains local.
    assert (await async_client.get(f"/api/v1/corpus/articles/{article}")).status_code == 404
    detail = await async_client.get(f"/api/v1/corpus/articles/{article}?release={run}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["body_source"] == "not_published"
    for suffix in ("claims", "connections"):
        response = await async_client.get(f"/api/v1/corpus/articles/{article}/{suffix}?release={run}")
        assert response.status_code == 200, response.text
    assert (await async_client.get(f"/api/v1/corpus/articles/{article}?release={uuid4()}")).status_code == 404
