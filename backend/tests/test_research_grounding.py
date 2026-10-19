"""Independent hand-written span/context fixtures, never generated gold."""

from copy import deepcopy
from typing import Any

import pytest

from app.services.research.evaluation.annotation import RUBRIC_VERSION
from app.services.research.evaluation.dataset import DatasetError, validate_dataset
from app.services.research.evaluation.grounding import (
    grounding_evaluation,
    grounding_prediction,
)
from app.services.research.evaluation.research import ExperimentConfig, run_experiment
from tests.test_research_support import research_records


def span(side: str, start: int, end: int, text: str, kind: str = "NUMERIC_DRIFT") -> dict[str, Any]:
    return {"side": side, "start": start, "end": end, "text": text, "mutation_type": kind}


def test_exact_and_character_scores_and_empty_missing_are_distinct():
    records: list[dict[str, Any]] = [
        {"pair_id": "hit", "split": "test", "gold_changed_spans": [span("a", 0, 2, "10")], "gold_context_relation": "PARAPHRASE"},
        {"pair_id": "partial", "split": "test", "gold_changed_spans": [span("b", 0, 2, "20")], "gold_context_relation": "INCOMPATIBLE_ASSERTION"},
        {"pair_id": "empty", "split": "test", "gold_changed_spans": [], "gold_context_relation": "UNRELATED"},
        {"pair_id": "unsupported", "split": "test", "gold_changed_spans": [], "gold_context_relation": "PARAPHRASE"},
        {"pair_id": "unannotated", "split": "test"},
        {"pair_id": "dev", "split": "dev", "gold_changed_spans": [span("a", 0, 1, "x")]},
    ]
    predictions: dict[str, dict[str, Any]] = {
        "hit": {"changed_spans": [span("a", 0, 2, "10")] * 2, "context_relation": "PARAPHRASE"},
        "partial": {"changed_spans": [span("b", 1, 2, "0")], "context_relation": "INSUFFICIENT_CONTEXT"},
        "empty": {"changed_spans": [], "context_relation": "INSUFFICIENT_CONTEXT"},
    }
    result = grounding_evaluation(records, predictions)
    spans, context = result["changed_spans"], result["context_relation"]
    assert spans["n_gold_pairs"] == 4 and spans["n_evaluated_pairs"] == 3
    assert spans["missing_prediction_pairs"] == spans["unannotated_test_pairs"] == 1
    assert spans["exact_typed_span_micro"]["tp"] == 1
    assert spans["exact_typed_span_micro"]["fp"] == spans["exact_typed_span_micro"]["fn"] == 1
    assert spans["typed_character_micro"]["f1"] == pytest.approx(6 / 7)
    assert spans["exact_set_accuracy"] == pytest.approx(2 / 3)
    assert [error["pair_id"] for error in spans["errors"]] == ["partial"]
    assert context["accuracy"] == pytest.approx(1 / 3)
    assert context["macro_f1"] == pytest.approx(1 / 4)
    assert context["per_class"]["UPDATE_OR_CORRECTION"]["f1"] is None
    assert context["confusion"]["INCOMPATIBLE_ASSERTION"]["INSUFFICIENT_CONTEXT"] == 1


def test_missing_annotation_never_becomes_empty_gold():
    result = grounding_evaluation([{"pair_id": "p", "split": "test"}], {"p": {"changed_spans": []}})
    assert result["changed_spans"]["status"] == "unavailable"
    assert result["changed_spans"]["exact_set_accuracy"] is None
    assert result["context_relation"]["macro_f1"] is None


def test_original_unicode_spans_and_insertions_are_preserved():
    result: dict[str, Any] = {"analysis": {"changes": [{"mutation_type": "WORDING_DRIFT", "older_span": {"start": 2, "end": 2, "text": ""}, "newer_span": {"start": 2, "end": 5, "text": "new"}}], "relation_category": "TEXTUAL_CHANGE"}}
    prediction = grounding_prediction(result, "🚀 launch", "🚀 new launch")
    assert prediction["changed_spans"] == [span("b", 2, 5, "new", "WORDING_DRIFT")]
    assert prediction["context_relation"] == "INSUFFICIENT_CONTEXT"
    broken = deepcopy(result)
    broken["analysis"]["changes"][0]["newer_span"]["start"] = 3  # UTF-16 offset is wrong.
    with pytest.raises(DatasetError, match="Unicode"):
        grounding_prediction(broken, "🚀 launch", "🚀 new launch")


@pytest.mark.parametrize("category,target", [("EQUIVALENT_QUANTITY", "PARAPHRASE"), ("NO_LEXICAL_CHANGE", "PARAPHRASE"), ("REPORTED_CORRECTION", "UPDATE_OR_CORRECTION"), ("REPORTED_UPDATE", "UPDATE_OR_CORRECTION"), ("CONTEXT_REQUIRED", "INSUFFICIENT_CONTEXT"), (None, None), ("unknown-new-category", None)])
def test_conservative_context_mapping(category, target):
    assert grounding_prediction({"analysis": {"relation_category": category}}, "a", "b")["context_relation"] == target


def test_legacy_analyzer_without_spans_is_unavailable():
    assert grounding_prediction({"mutation_types": []}, "a", "b")["changed_spans"] is None


def annotated_records() -> list[dict[str, Any]]:
    records = research_records(mutations=True)
    for record in records:
        if record["split"] != "test":
            continue
        spans = []
        if record["gold_label"] != "DISTINCT":
            for side, number in (("a", "10"), ("b", "12")):
                offset = record[f"text_{side}"].index(f"announced {number}") + len("announced ")
                spans.append(span(side, offset, offset + 2, number))
        context = "UNRELATED" if record["gold_label"] == "DISTINCT" else "INSUFFICIENT_CONTEXT"
        record.update({"gold_changed_spans": spans, "gold_context_relation": context})
        for vote in record["human_labels"]:
            vote["provenance"].update({"rubric_version": RUBRIC_VERSION, "changed_spans": deepcopy(spans), "context_relation": context})
    return records


def test_research_runner_scores_independent_gold_without_copying_it():
    records = annotated_records()
    report, predictions, states = run_experiment(records, config=ExperimentConfig(bootstrap=20))
    assert report["grounding_evaluation"]["changed_spans"]["n_evaluated_pairs"] == 6
    assert report["grounding_evaluation"]["context_relation"]["n_evaluated_pairs"] == 6
    assert report["grounding_evaluation"]["changed_spans"]["errors"]
    changed = deepcopy(records)
    for record in changed:
        if record["split"] == "test":
            record["gold_context_relation"] = "PARAPHRASE"
            for vote in record["human_labels"]:
                vote["provenance"]["context_relation"] = "PARAPHRASE"
    _, changed_predictions, changed_states = run_experiment(changed, config=ExperimentConfig(bootstrap=20))
    assert states == changed_states
    assert [(p["predicted_context_relation"], p["predicted_changed_spans"]) for p in predictions] == [(p["predicted_context_relation"], p["predicted_changed_spans"]) for p in changed_predictions]


def test_forged_or_stale_span_gold_is_rejected():
    records = annotated_records()
    record = next(r for r in records if r.get("gold_changed_spans"))
    record["gold_changed_spans"][0]["text"] = "stale"
    with pytest.raises(DatasetError, match="independently agreeing"):
        validate_dataset(records)
    for vote in record["human_labels"]:
        vote["provenance"]["changed_spans"] = deepcopy(record["gold_changed_spans"])
    with pytest.raises(DatasetError, match="does not match"):
        validate_dataset(records)
