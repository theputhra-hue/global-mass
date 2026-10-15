"""A published engineering challenge set, explicitly separate from human research."""
import hashlib
import json
import re
from functools import lru_cache
from time import perf_counter
from typing import Any

from app.services.evolution.text_changes import ALGORITHM_VERSION, analyze_text_change

# Authored controls; these examples must never enter the human-gold tables.
SCENARIOS = (
    ("numeric", "Changed count", "Numbers", "The agency found 10 survivors.", "The agency found 12 survivors.", True, "NUMERIC_DRIFT"),
    ("price", "Changed price", "Numbers", "The ticket costs $20.", "The ticket costs $25.", True, "NUMERIC_DRIFT"),
    ("year", "Changed year", "Numbers", "The bridge opened in 2024.", "The bridge opened in 2025.", True, "NUMERIC_DRIFT"),
    ("hedge", "Lost uncertainty", "Context", "The agency reportedly found survivors.", "The agency found survivors.", True, "HEDGING_SHIFT"),
    ("negation", "Negation changes", "Context", "The bridge is open.", "The bridge is not open.", True, "POLARITY_SHIFT"),
    ("correction", "Reported correction", "Context", "The agency found 10 survivors.", "Correction: the agency found 12 survivors.", True, "NUMERIC_DRIFT"),
    ("distance", "Equivalent distance", "Controls", "The road is 1 km long.", "The road is 1000 m long.", False, None),
    ("weight", "Equivalent mass", "Controls", "The parcel weighs 1 kg.", "The parcel weighs 1000 g.", False, None),
    ("duration", "Equivalent duration", "Controls", "The trip takes 1 hour.", "The trip takes 60 minutes.", False, None),
    ("case", "Case-only edit", "Controls", "The bridge is open.", "THE BRIDGE IS OPEN.", False, None),
    ("punctuation", "Punctuation-only edit", "Controls", "The bridge is open.", "The bridge is open!", False, None),
    ("identical", "No change", "Controls", "The bridge is open.", "The bridge is open.", False, None),
)


@lru_cache(maxsize=1)
def challenge_report() -> dict[str, Any]:
    start = perf_counter()
    items: list[dict[str, Any]] = []
    for key, title, group, older, newer, expected_change, required_type in SCENARIOS:
        analysis = analyze_text_change(older, newer)
        # Transparent low-cost baseline: compare case-folded lexical tokens.
        baseline = re.findall(r"\w+", older.casefold()) != re.findall(r"\w+", newer.casefold())
        correct = analysis["meaningful_change"] == expected_change
        typed_correct = required_type is None or required_type in analysis["mutation_types"]
        items.append({
            "id": key, "title": title, "group": group, "older_text": older, "newer_text": newer,
            "expected_change": expected_change, "required_type": required_type,
            "analysis": analysis, "passed": correct and typed_correct,
            "lexical_baseline_change": baseline, "lexical_baseline_passed": baseline == expected_change,
        })
    content = [{key: item[key] for key in ("id", "older_text", "newer_text", "expected_change", "required_type")} for item in items]
    digest = hashlib.sha256(json.dumps(content, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return {
        "schema_version": "gmee-engineering-challenges-v1", "algorithm_version": ALGORITHM_VERSION,
        "dataset_sha256": digest, "origin": "authored_engineering_controls", "research_gold": False,
        "total": len(items), "passed": sum(item["passed"] for item in items),
        "lexical_baseline_passed": sum(item["lexical_baseline_passed"] for item in items),
        "cold_suite_elapsed_ms": round((perf_counter() - start) * 1000, 3), "items": items,
        "warning": "Small authored regression controls, not independently annotated natural news. These results illustrate behavior and cannot establish research accuracy, novelty, causal propagation or factual truth. Timing measures one cached process initialization only.",
    }
