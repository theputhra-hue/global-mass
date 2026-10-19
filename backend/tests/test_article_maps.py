import copy
import hashlib
import json
from typing import Any
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.publication import PublicationSnapshot
from app.services.analysis.article_map import checkpoint_key, document_input
from tests.test_publication_contract import snapshot_payload
from tests.test_published_results import (  # noqa: F401
    cloud_client,
    publish_body,
    upload,
)


def mapped_payload(count: int = 1) -> dict[str, Any]:
    payload = snapshot_payload()
    first = payload["articles"][0]
    payload["articles"] += [{**first, "id": str(uuid4()), "title": f"Synthetic article {i}"} for i in range(count - 1)]
    payload["schema_version"] = "2"
    payload["topic_map"] = {
        "started_at": payload["provenance"]["analysis_started_at"],
        "completed_at": payload["provenance"]["analysis_completed_at"],
        "source_commit": "a" * 40, "input_sha256": "b" * 64, "config_sha256": "c" * 64,
        "embedding_model": "synthetic-test-model", "embedding_revision": "d" * 40, "seed": 42,
        "topics": [{"id": "topic-0", "label": "Synthetic group", "keywords": ["synthetic"], "article_count": count}],
        "assignments": [{"article_id": a["id"], "topic_id": "topic-0", "basis": "title_only", "x": i, "y": -i}
                        for i, a in enumerate(payload["articles"])],
    }
    return payload


def test_v1_digest_excludes_new_fields_exactly():
    snapshot = PublicationSnapshot.model_validate(snapshot_payload())
    old_envelope = snapshot.model_dump(mode="json", exclude={"topic_map", "city_network"})
    original = json.dumps(old_envelope, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()
    assert snapshot.sha256() == hashlib.sha256(original).hexdigest()
    assert b'topic_map' not in snapshot.canonical_bytes()


@pytest.mark.parametrize("bad", ["missing", "extra", "duplicate", "unknown_topic", "wrong_count", "nan", "partial_xy", "unsupported_xy", "missing_usable_xy", "v1_map"])
def test_map_integrity_validation(bad):
    payload = mapped_payload()
    mapping = payload["topic_map"]
    if bad == "missing":
        mapping["assignments"] = []
    elif bad == "extra":
        mapping["assignments"][0]["article_id"] = str(uuid4())
    elif bad == "duplicate":
        mapping["assignments"].append(copy.deepcopy(mapping["assignments"][0]))
    elif bad == "unknown_topic":
        mapping["assignments"][0]["topic_id"] = "topic-999"
    elif bad == "wrong_count":
        mapping["topics"][0]["article_count"] = 2
    elif bad == "nan":
        mapping["assignments"][0]["x"] = float("nan")
    elif bad == "partial_xy":
        mapping["assignments"][0]["y"] = None
    elif bad in ("unsupported_xy", "missing_usable_xy"):
        mapping["topics"] = []
        mapping["assignments"][0]["topic_id"] = None
        if bad == "unsupported_xy":
            mapping["assignments"][0]["basis"] = "unsupported_language"
        else:
            mapping["assignments"][0]["x"] = mapping["assignments"][0]["y"] = None
    else:
        payload["schema_version"] = "1"
    with pytest.raises(ValidationError):
        PublicationSnapshot.model_validate(payload)


def test_input_preparation_and_versioned_checkpoint():
    assert document_input("A headline", None, "en") == ("A headline", "title_only")
    assert document_input("A headline", "private text", "fr") == ("", "unsupported_language")
    text, basis = document_input("Headline", "<script>danger()</script><p>" + "word " * 40 + "</p>", "en")
    assert basis == "stored_text" and "danger" not in text and "<p>" not in text
    assert checkpoint_key(text, "v1") == checkpoint_key(text, "v1")
    assert checkpoint_key(text, "v1") != checkpoint_key(text, "v2")


async def test_complete_map_is_staged_then_pinned_paged_and_rollback_safe(cloud_client):  # noqa: F811 -- imported pytest fixture
    client, _ = cloud_client
    payload = mapped_payload(501)
    receipt = await upload(client, payload)
    assert (await client.get('/api/v1/graph/atlas')).json()["available"] is False
    review = (await client.get(f"/api/v1/publications/{payload['run_id']}/review")).json()
    assert review["article_map"] == {"topics": 1, "articles": 501}
    response = await client.post(f"/api/v1/publications/{payload['run_id']}/publish", json=publish_body(receipt))
    assert response.status_code == 200, response.text
    first = (await client.get('/api/v1/graph/atlas?limit=500')).json()
    assert first["available"] and first["total"] == 501 and first["next_offset"] == 500
    assert len(first["items"]) == 500 and first["summary"]["coverage"]["title_only"] == 501
    old = snapshot_payload()
    other = await upload(client, old)
    assert (await client.post(f"/api/v1/publications/{old['run_id']}/publish", json=publish_body(other, 1))).status_code == 200
    second = (await client.get(f"/api/v1/graph/atlas?release={payload['run_id']}&offset=500")).json()
    assert len(second["items"]) == 1 and second["next_offset"] is None and second["summary"] is None
    assert len({i['id'] for i in first['items'] + second['items']}) == 501
    assert (await client.get('/api/v1/graph/atlas')).json()["available"] is False
    assert (await client.get('/api/v1/graph/atlas?limit=501')).status_code == 422
    assert "embedding" not in first["items"][0] and "content" not in first["items"][0]
