"""Read-only disclosures. Stored counts/statuses never establish scientific validity."""

from typing import Any, Literal

from typing_extensions import TypedDict


class AnalysisAvailability(TypedDict):
    publication: Literal["published", "local"]
    source_text: Literal["available", "missing", "not_published"]
    extraction: str
    claims: Literal["recorded", "none_recorded"]
    assessments: Literal["recorded", "partial", "none_recorded"]
    warnings: list[str]


def analysis_availability(
    *, published: bool, body: str, nlp_status: str, claims_total: int,
    assessment_counts: dict[str, int],
) -> AnalysisAvailability:
    unassessed = assessment_counts.get("UNASSESSED", 0)
    assessed = sum(count for label, count in assessment_counts.items() if label != "UNASSESSED")
    warnings = []
    if published:
        warnings.append("Published means included in this release; extraction completion is not recorded in this archive.")
    elif not body.strip() and nlp_status == "completed":
        warnings.append("Extraction is marked completed, but no usable source text is stored. Review the source before using this record.")
    if claims_total == 0:
        warnings.append("No extracted statements are recorded. This does not establish that the article contains no claims.")
    return {
        "publication": "published" if published else "local",
        "source_text": "not_published" if published else "available" if body.strip() else "missing",
        "extraction": "not_recorded" if published else nlp_status,
        "claims": "recorded" if claims_total else "none_recorded",
        "assessments": "partial" if assessed and unassessed else "recorded" if assessed else "none_recorded",
        "warnings": warnings,
    }


def evidence_availability(evidence: Any, *, published: bool = False) -> dict[str, Any]:
    """A signal dictionary is metadata, not cited evidence. Never upgrade legacy scores."""
    metadata = evidence if isinstance(evidence, dict) else {}
    return {
        "status": "not_published" if published else "metadata_recorded" if metadata else "not_recorded",
        "method_version": metadata.get("method_version") if isinstance(metadata.get("method_version"), str) else None,
        "score_kind": "uncalibrated_heuristic" if metadata.get("score_kind") == "uncalibrated_heuristic" else "legacy_unverified",
        "calibrated": False,
        "disclosure": "A stored label or heuristic score does not establish truth. Inspect source passages and context separately.",
    }
