"""Evaluate independent changed-span and context gold, separately from matching.

Only immutable human-reviewed test targets are scored. Missing annotation is
distinct from an explicitly empty span list. No gold field affects predictions.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping
from typing import Any

from app.services.eval.dataset import DatasetError
from app.services.eval.metrics import prf

CONTEXT_LABELS = (
    "PARAPHRASE", "UPDATE_OR_CORRECTION", "INCOMPATIBLE_ASSERTION",
    "INSUFFICIENT_CONTEXT", "UNRELATED",
)
CONTEXT_MAPPING = {
    "NO_LEXICAL_CHANGE": "PARAPHRASE",
    "EQUIVALENT_QUANTITY": "PARAPHRASE",
    "REPORTED_CORRECTION": "UPDATE_OR_CORRECTION",
    "REPORTED_UPDATE": "UPDATE_OR_CORRECTION",
    "CONTEXT_REQUIRED": "INSUFFICIENT_CONTEXT",
    "TEXTUAL_CHANGE": "INSUFFICIENT_CONTEXT",
}


def grounding_prediction(result: Mapping[str, Any], text_a: str, text_b: str) -> dict[str, Any]:
    analysis = result.get("analysis")
    if not isinstance(analysis, Mapping):
        return {"changed_spans": None, "context_relation": None, "relation_category": None}
    changes = analysis.get("changes")
    spans: dict[tuple[str, int, int, str], dict[str, Any]] = {}
    if changes is not None:
        if not isinstance(changes, list):
            raise DatasetError("Mutation analyzer changes must be a list")
        for change in changes:
            if not isinstance(change, Mapping) or not isinstance(change.get("mutation_type"), str):
                raise DatasetError("Mutation analyzer returned an invalid typed change")
            for side, key, text in (("a", "older_span", text_a), ("b", "newer_span", text_b)):
                span = change.get(key)
                if not isinstance(span, Mapping):
                    raise DatasetError("Mutation analyzer did not provide original-text spans")
                start, end = span.get("start"), span.get("end")
                if type(start) is not int or type(end) is not int or not 0 <= start <= end <= len(text) or span.get("text") != text[start:end]:
                    raise DatasetError("Mutation analyzer span does not match original Unicode source offsets")
                # Insertion/deletion has an empty span on one side, which is
                # not an independently groundable character annotation.
                if end > start:
                    mutation_type = change["mutation_type"]
                    spans[(side, start, end, mutation_type)] = {"side": side, "start": start, "end": end, "text": text[start:end], "mutation_type": mutation_type}
    category = analysis.get("relation_category")
    return {
        "changed_spans": [spans[key] for key in sorted(spans)] if changes is not None else None,
        "context_relation": CONTEXT_MAPPING.get(category) if isinstance(category, str) else None,
        "relation_category": category,
    }


def _span_keys(spans: list[dict[str, Any]]) -> set[tuple[str, int, int, str]]:
    return {(span["side"], span["start"], span["end"], span["mutation_type"]) for span in spans}


def _characters(spans: list[dict[str, Any]]) -> set[tuple[str, int, str]]:
    # Set union prevents overlapping/duplicated spans inflating support.
    return {(span["side"], offset, span["mutation_type"]) for span in spans for offset in range(span["start"], span["end"])}


def _counts(gold: set[Any], predicted: set[Any]) -> tuple[int, int, int]:
    return len(gold & predicted), len(predicted - gold), len(gold - predicted)


def grounding_evaluation(records: list[dict[str, Any]], predictions: dict[str, dict[str, Any]]) -> dict[str, Any]:
    test = [record for record in records if record["split"] == "test"]
    span_gold = [record for record in test if record.get("gold_changed_spans") is not None]
    span_rows = [record for record in span_gold if predictions.get(record["pair_id"], {}).get("changed_spans") is not None]
    exact = [0, 0, 0]
    characters = [0, 0, 0]
    matches = 0
    span_errors = []
    for record in span_rows:
        gold, guess = record["gold_changed_spans"], predictions[record["pair_id"]]["changed_spans"]
        keys, predicted_keys = _span_keys(gold), _span_keys(guess)
        for i, value in enumerate(_counts(keys, predicted_keys)):
            exact[i] += value
        for i, value in enumerate(_counts(_characters(gold), _characters(guess))):
            characters[i] += value
        matches += int(keys == predicted_keys)
        if keys != predicted_keys:
            span_errors.append({"pair_id": record["pair_id"], "gold": gold, "predicted": guess})
    spans = {
        "status": "evaluated" if span_rows else "unavailable", "partition": "test",
        "n_gold_pairs": len(span_gold), "n_evaluated_pairs": len(span_rows),
        "missing_prediction_pairs": len(span_gold) - len(span_rows),
        "unannotated_test_pairs": len(test) - len(span_gold),
        "exact_typed_span_micro": {"tp": exact[0], "fp": exact[1], "fn": exact[2], **prf(*exact)},
        "typed_character_micro": {"tp": characters[0], "fp": characters[1], "fn": characters[2], **prf(*characters)},
        "exact_set_accuracy": matches / len(span_rows) if span_rows else None,
        "errors": span_errors,
        "definition": "Exact (side,start,end,mutation_type) sets and union of (side,Unicode code point,mutation_type); micro counts across test pairs; punctuation and whitespace inside a span count. Empty/empty is an exact-set match but contributes no positive F1 support.",
        "warning": "Missing annotations are never treated as empty gold. Unsupported analyzer predictions remain unavailable; annotation coverage and per-pair errors must be reported.",
    }
    context_gold = [record for record in test if record.get("gold_context_relation") is not None]
    context_rows = [record for record in context_gold if predictions.get(record["pair_id"], {}).get("context_relation") is not None]
    confusion: dict[str, Counter[str]] = {label: Counter() for label in CONTEXT_LABELS}
    context_errors = []
    for record in context_rows:
        gold = record["gold_context_relation"]
        predicted = predictions[record["pair_id"]]["context_relation"]
        confusion[gold][predicted] += 1
        if gold != predicted:
            context_errors.append({"pair_id": record["pair_id"], "gold": gold, "predicted": predicted})
    per_class = {}
    for label in CONTEXT_LABELS:
        tp = confusion[label][label]
        support = sum(confusion[label].values())
        predicted = sum(row[label] for row in confusion.values())
        per_class[label] = {"support": support, "predicted": predicted, **prf(tp, predicted - tp, support - tp)}
    f1_values = [entry["f1"] for entry in per_class.values() if entry["f1"] is not None]
    context = {
        "status": "evaluated" if context_rows else "unavailable", "partition": "test",
        "n_gold_pairs": len(context_gold), "n_evaluated_pairs": len(context_rows),
        "missing_prediction_pairs": len(context_gold) - len(context_rows),
        "unannotated_test_pairs": len(test) - len(context_gold),
        "accuracy": 1 - len(context_errors) / len(context_rows) if context_rows else None,
        "macro_f1": sum(f1_values) / len(f1_values) if f1_values else None,
        "macro_f1_definition": "mean over labels with gold or prediction support; absent labels excluded",
        "per_class": per_class,
        "confusion": {gold: {predicted: confusion[gold][predicted] for predicted in CONTEXT_LABELS} for gold in CONTEXT_LABELS},
        "mapping": CONTEXT_MAPPING, "errors": context_errors,
        "warning": "Conservative text-only baseline; it cannot establish incompatible assertions or unrelated events. Reported update/correction wording is a cue, not independently verified context. Pair A/B order is not chronology.",
    }
    return {"changed_spans": spans, "context_relation": context}
