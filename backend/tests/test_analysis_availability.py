import copy

import pytest

from app.schemas.publication import PublicationSnapshot
from app.services.analysis_availability import (
    analysis_availability,
    evidence_availability,
)
from app.services.topic_audit import audit_ram_prices
from tests.test_publication_contract import snapshot_payload


def test_publication_is_not_extraction_completion_and_counts_are_not_validation():
    result = analysis_availability(published=True, body="", nlp_status="published", claims_total=2,
                                   assessment_counts={"UNSUPPORTED": 1, "UNASSESSED": 1})
    assert result["extraction"] == "not_recorded"
    assert result["source_text"] == "not_published" and result["assessments"] == "partial"
    assert "completion is not recorded" in result["warnings"][0]


def test_completed_without_source_is_flagged_without_rewriting_status():
    result = analysis_availability(published=False, body=" \n", nlp_status="completed", claims_total=0, assessment_counts={})
    assert result["extraction"] == "completed" and result["source_text"] == "missing"
    assert result["claims"] == "none_recorded" and len(result["warnings"]) == 2


@pytest.mark.parametrize("evidence", [None, {}, "old JSON", {"corroboration": {"value": .99}}])
def test_missing_or_legacy_evidence_never_becomes_validated_support(evidence):
    assert evidence_availability(evidence)["calibrated"] is False
    assert evidence_availability(evidence)["score_kind"] == "legacy_unverified"
    assert evidence_availability(evidence, published=True)["status"] == "not_published"


def test_ram_audit_requires_hardware_and_price_context_and_preserves_input():
    payload = snapshot_payload()
    payload["articles"][0]["title"] = "DDR5 RAM prices increase"
    payload["claims"][0]["text"] = "RAM prices increased in one retailer's listing."
    payload["claims"][0]["verdict"] = "UNSUPPORTED"
    second = copy.deepcopy(payload["articles"][0])
    second.update(id="11111111-1111-4111-8111-111111111111", title="Ram visits a city; food prices rise", url="https://example.org/other")
    # Homonyms remain explicit review candidates, never inferred topic or event truth.
    payload["articles"].append(second)
    third = copy.deepcopy(second)
    third.update(id="22222222-2222-4222-8222-222222222222", title="Programming tutorial", url="https://example.org/third")
    payload["articles"].append(third)
    snapshot = PublicationSnapshot.model_validate(payload)
    before = snapshot.canonical_bytes()
    report = audit_ram_prices(snapshot)
    assert snapshot.canonical_bytes() == before
    assert report["counts"] == {"candidates": 2, "without_claims": 1, "missing_publication_date": 2, "domains": 1}
    assert all(c["relevance_review"] == "pending" and c["event_id"] is None for c in report["candidates"])
    assert all(c["source_text"] == "not_published" for c in report["candidates"])
    assert "claim_text" not in str(report) and "RAM prices increased" not in str(report)


def test_ram_audit_date_scope_excludes_unknown_dates_and_rejects_reversed_range():
    from datetime import date
    payload = snapshot_payload()
    payload["articles"][0]["title"] = "DRAM prices rise"
    snapshot = PublicationSnapshot.model_validate(payload)
    assert audit_ram_prices(snapshot, since=date(2026, 1, 1))["counts"]["candidates"] == 0
    with pytest.raises(ValueError):
        audit_ram_prices(snapshot, since=date(2026, 2, 1), until=date(2026, 1, 1))
