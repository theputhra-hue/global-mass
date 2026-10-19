import copy
import hashlib
import json
from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas.publication import PublicationSnapshot
from tests.test_article_maps import mapped_payload
from tests.test_published_results import (  # noqa: F401
    cloud_client,
    publish_body,
    upload,
)


def city_payload() -> dict[str, Any]:
    payload = mapped_payload(4)
    mapping = payload["topic_map"]
    mapping["topics"] = [{"id": f"topic-{i}", "label": f"Synthetic topic {i}", "keywords": ["fixture"], "article_count": 2} for i in range(2)]
    for i, assignment in enumerate(mapping["assignments"]):
        assignment["topic_id"] = f"topic-{i // 2}"
    payload["schema_version"] = "3"
    payload["city_network"] = {
        "started_at": mapping["started_at"], "completed_at": mapping["completed_at"],
        "source_commit": "a" * 40, "source_map_run_id": payload["run_id"], "source_map_sha256": "b" * 64,
        "input_sha256": mapping["input_sha256"], "config_sha256": "c" * 64,
        "embedding_model": mapping["embedding_model"], "embedding_revision": mapping["embedding_revision"],
        "community_revision": "fixture", "seed": 42, "neighbor_k": 3, "min_similarity": .55,
        "min_highway_support": 2, "min_highway_endpoints": 2,
        "article_ids": [a["id"] for a in payload["articles"]],
        "roads": [[0, 1, .9], [0, 2, .7], [1, 3, .6], [2, 3, .8]],
        "highways": [{"a": "topic-0", "b": "topic-1", "support": 2, "endpoints_a": 2, "endpoints_b": 2}],
        "themes": [{"id": f"theme-{i}", "label": f"Synthetic theme {i}", "topics": [f"topic-{i}"], "article_count": 2} for i in range(2)],
        "superways": [{"a": "theme-0", "b": "theme-1", "support": 2, "highways": 1}],
    }
    return payload


@pytest.mark.parametrize("failure", ["dangling", "self", "duplicate", "threshold", "nan", "degree", "highway", "superway", "membership", "input", "version"])
def test_rejects_invalid_city_support(failure: str) -> None:
    payload = city_payload()
    city = payload["city_network"]
    if failure == "dangling": city["roads"][0][1] = 99
    elif failure == "self": city["roads"][0][1] = 0
    elif failure == "duplicate": city["roads"].append(copy.deepcopy(city["roads"][0]))
    elif failure == "threshold": city["roads"][0][2] = .1
    elif failure == "nan": city["roads"][0][2] = float("nan")
    elif failure == "degree": city["neighbor_k"] = 1
    elif failure == "highway": city["highways"][0]["support"] = 3
    elif failure == "superway": city["superways"][0]["support"] = 3
    elif failure == "membership": city["themes"][0]["topics"].append("topic-1")
    elif failure == "input": city["input_sha256"] = "d" * 64
    else: payload["schema_version"] = "2"
    with pytest.raises(ValidationError): PublicationSnapshot.model_validate(payload)


def test_v2_digest_remains_identical() -> None:
    snapshot = PublicationSnapshot.model_validate(mapped_payload())
    before = json.dumps(snapshot.model_dump(mode="json", exclude={"city_network"}), sort_keys=True,
                        separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()
    assert snapshot.sha256() == hashlib.sha256(before).hexdigest()
    assert b'city_network' not in snapshot.canonical_bytes()


async def test_staged_city_is_private_and_immutable_roads_page_after_rollback(cloud_client):  # noqa: F811
    client, _ = cloud_client
    payload = city_payload()
    run = payload["run_id"]
    receipt = await upload(client, payload)
    assert (await client.get(f"/api/v1/graph/atlas/roads?release={run}")).json()["available"] is False
    response = await client.post(f"/api/v1/publications/{run}/publish", json=publish_body(receipt))
    assert response.status_code == 200, response.text
    first = (await client.get(f"/api/v1/graph/atlas/roads?release={run}&limit=2")).json()
    assert first["total"] == 4 and first["summary"]["degree"] == [2, 2, 2, 2]
    old = mapped_payload()
    other = await upload(client, old)
    assert (await client.post(f"/api/v1/publications/{old['run_id']}/publish", json=publish_body(other, 1))).status_code == 200
    second = (await client.get(f"/api/v1/graph/atlas/roads?release={run}&offset=2&limit=2")).json()
    assert second["summary"] is None and second["next_offset"] is None
    assert first["items"] + second["items"] == payload["city_network"]["roads"]
    assert (await client.get(f"/api/v1/graph/atlas/roads?release={old['run_id']}")).json()["available"] is False
    assert (await client.get(f"/api/v1/graph/atlas/roads?release={run}&limit=2001")).status_code == 422
