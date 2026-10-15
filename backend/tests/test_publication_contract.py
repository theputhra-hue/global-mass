import copy
from typing import Any
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.publication import PublicationSnapshot


def snapshot_payload() -> dict[str, Any]:
    article, first, second = str(uuid4()), str(uuid4()), str(uuid4())
    stamp = "2026-10-15T10:00:00Z"
    return {
        "run_id": str(uuid4()), "generated_at": stamp,
        "provenance": {
            "analysis_started_at": stamp, "analysis_completed_at": stamp,
            "source_commit": "a" * 40, "config_sha256": "b" * 64,
            "model_revisions": {"embedding": "c" * 40},
        },
        "articles": [{"id": article, "source_name": "Fixture", "title": "Example",
                      "url": "https://example.org/story", "domain": "example.org"}],
        "claims": [{"id": key, "article_id": article, "text": "Fixture claim",
                    "extracted_at": stamp} for key in (first, second)],
        "relationships": [{"id": str(uuid4()), "from_claim_id": second,
                           "to_claim_id": first, "relationship_type": "EVOLVED_FROM",
                           "score": 0.8, "created_at": stamp}],
    }


def test_digest_survives_json_roundtrip_and_detects_changed_content():
    snapshot = PublicationSnapshot.model_validate(snapshot_payload())
    assert PublicationSnapshot.model_validate_json(snapshot.canonical_bytes()).sha256() == snapshot.sha256()
    changed = snapshot.model_dump(mode="json")
    changed["articles"][0]["title"] = "Changed"
    assert PublicationSnapshot.model_validate(changed).sha256() != snapshot.sha256()


@pytest.mark.parametrize("fault", ["private", "duplicate", "orphan", "edge", "self", "score", "nan", "time", "naive", "version"])
def test_rejects_invalid_or_private_publications(fault):
    payload = snapshot_payload()
    if fault == "private":
        payload["articles"][0]["raw_metadata"] = {"password": "never publish"}
    elif fault == "duplicate":
        payload["claims"].append(copy.deepcopy(payload["claims"][0]))
    elif fault == "orphan":
        payload["claims"][0]["article_id"] = str(uuid4())
    elif fault == "edge":
        payload["relationships"][0]["to_claim_id"] = str(uuid4())
    elif fault == "self":
        payload["relationships"][0]["to_claim_id"] = payload["relationships"][0]["from_claim_id"]
    elif fault in ("score", "nan"):
        payload["relationships"][0]["score"] = 1.1 if fault == "score" else float("nan")
    elif fault == "time":
        payload["provenance"]["analysis_completed_at"] = "2026-10-14T10:00:00Z"
    elif fault == "naive":
        payload["generated_at"] = "2026-10-15T10:00:00"
    else:
        payload["schema_version"] = "99"
    with pytest.raises(ValidationError):
        PublicationSnapshot.model_validate(payload)
