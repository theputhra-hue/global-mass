"""Tie-aware selective classification with a development-only abstention policy.

Empirical risk is a measured error fraction, never a statistical risk guarantee.
The scored decision is the existing dev-selected relatedness decision; its
confidence is the calibrated probability assigned to that predicted class.
"""

from __future__ import annotations

import math
from typing import Any

from app.services.eval.dataset import DatasetError


def binary_log_loss(probabilities: list[float], labels: list[bool]) -> float | None:
    """Natural-log loss with disclosed 1e-15 clipping for finite JSON output."""
    if not probabilities or len(probabilities) != len(labels):
        return None
    if any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities):
        return None
    clipped = [min(1 - 1e-15, max(1e-15, p)) for p in probabilities]
    return -sum(math.log(p) if label else math.log1p(-p) for p, label in zip(clipped, labels)) / len(labels)


def prediction_confidences(probabilities: list[float], decision_threshold: float) -> list[float]:
    if not math.isfinite(decision_threshold) or any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities):
        raise DatasetError("Selective classification requires finite probabilities in [0, 1] and a finite frozen decision threshold")
    return [p if p >= decision_threshold else 1 - p for p in probabilities]


def risk_coverage_curve(probabilities: list[float], labels: list[bool], decision_threshold: float) -> dict[str, Any]:
    """Include complete confidence ties together; never rank ties by correctness.

    AURC uses a right-endpoint step integral at attainable coverages. This is
    explicitly a tie-aware definition, so it does not invent an ordering inside
    a tied block. Risk at zero coverage is undefined and not plotted as zero.
    """
    if len(probabilities) != len(labels):
        raise DatasetError("Selective scores and labels must have equal length")
    confidences = prediction_confidences(probabilities, decision_threshold)
    ranked = sorted(zip(confidences, probabilities, labels), key=lambda row: row[0], reverse=True)
    points: list[dict[str, Any]] = []
    errors = retained = 0
    area = previous_coverage = 0.0
    while retained < len(ranked):
        confidence = ranked[retained][0]
        while retained < len(ranked) and ranked[retained][0] == confidence:
            _, score, label = ranked[retained]
            errors += int((score >= decision_threshold) != label)
            retained += 1
        coverage, risk = retained / len(ranked), errors / retained
        area += (coverage - previous_coverage) * risk
        previous_coverage = coverage
        points.append({"min_confidence": confidence, "retained": retained, "errors": errors, "coverage": coverage, "risk": risk, "accuracy": 1 - risk})
    return {
        "points": points, "aurc": area if ranked else None,
        "aurc_definition": "right-endpoint step integral over attainable coverage; confidence ties retained together",
        "confidence_definition": "calibrated probability of the class predicted at the frozen dev decision threshold",
    }


def select_abstention_policy(
    dev_probabilities: list[float], dev_labels: list[bool], decision_threshold: float,
    target_risk: float, min_retained: int,
) -> dict[str, Any]:
    if not math.isfinite(target_risk) or not 0 <= target_risk <= 1 or type(min_retained) is not int or min_retained < 1:
        raise DatasetError("Abstention target risk must be in [0, 1] and minimum dev support must be positive")
    curve = risk_coverage_curve(dev_probabilities, dev_labels, decision_threshold)
    eligible = [point for point in curve["points"] if point["retained"] >= min_retained and point["risk"] <= target_risk]
    selected = max(eligible, key=lambda point: point["coverage"]) if eligible else None
    return {
        "selected_on": "dev", "objective": "maximum dev coverage subject to empirical risk and minimum support",
        "target_empirical_risk": target_risk, "minimum_dev_retained": min_retained,
        "min_confidence": selected["min_confidence"] if selected else None,
        "status": "selected" if selected else "abstain_all",
        "dev_retained": selected["retained"] if selected else 0,
        "dev_coverage": selected["coverage"] if selected else 0.0,
        "dev_risk": selected["risk"] if selected else None,
        "warning": "Empirical development selection is not a distribution-free risk guarantee; frozen test risk may exceed the target. No qualifying dev point means abstain on every test item.",
    }


def apply_abstention_policy(
    probabilities: list[float], labels: list[bool], decision_threshold: float,
    policy: dict[str, Any],
) -> dict[str, Any]:
    if len(probabilities) != len(labels):
        raise DatasetError("Selective scores and labels must have equal length")
    confidences = prediction_confidences(probabilities, decision_threshold)
    cutoff = policy["min_confidence"]
    accepted = [cutoff is not None and confidence >= cutoff for confidence in confidences]
    retained = sum(accepted)
    errors = sum(keep and (p >= decision_threshold) != label for keep, p, label in zip(accepted, probabilities, labels))
    return {
        "n": len(labels), "retained": retained, "abstained": len(labels) - retained,
        "coverage": retained / len(labels) if labels else None,
        "errors": errors, "risk": errors / retained if retained else None,
        "accuracy": 1 - errors / retained if retained else None,
        "accepted": accepted,
    }
