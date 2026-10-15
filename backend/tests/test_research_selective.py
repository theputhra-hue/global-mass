"""Hand-computed abstention cases; these are unit fixtures, not human results."""

import math

import pytest

from app.services.eval.dataset import DatasetError
from app.services.eval.selective import (
    apply_abstention_policy,
    binary_log_loss,
    prediction_confidences,
    risk_coverage_curve,
    select_abstention_policy,
)


def test_confidence_uses_frozen_predicted_class_not_always_majority_probability():
    # F1 selection can place the decision threshold away from 0.5.
    assert prediction_confidences([0.4, 0.6, 0.9], 0.3) == [0.4, 0.6, 0.9]
    assert prediction_confidences([0.4, 0.6, 0.9], 0.8) == [0.6, 0.4, 0.9]


def test_complete_ties_prevent_optimistic_correctness_ranking():
    scores, labels = [0.9, 0.9, 0.7, 0.7], [True, False, True, True]
    result = risk_coverage_curve(scores, labels, 0.5)
    assert [(p["retained"], p["errors"], p["risk"]) for p in result["points"]] == [(2, 1, 0.5), (4, 1, 0.25)]
    assert result["aurc"] == pytest.approx(0.5 * 0.5 + 0.5 * 0.25)
    assert result == risk_coverage_curve(list(reversed(scores)), list(reversed(labels)), 0.5)


def test_select_maximum_feasible_coverage_even_when_risk_is_not_monotone():
    # Risk is 0, 1/2, 1/3, 1/4. Stopping at the first failure loses a valid policy.
    policy = select_abstention_policy([0.9, 0.8, 0.7, 0.6], [True, False, True, True], 0.5, 0.25, 1)
    assert policy["min_confidence"] == 0.6
    assert policy["dev_retained"] == 4
    assert policy["dev_risk"] == 0.25
    point = apply_abstention_policy([0.95, 0.55], [False, True], 0.5, policy)
    assert point["accepted"] == [True, False]
    assert point["risk"] == 1.0  # No promised test-risk guarantee.
    assert point["coverage"] == 0.5


def test_insufficient_dev_support_abstains_all_and_does_not_call_it_perfect():
    policy = select_abstention_policy([0.9, 0.1], [True, False], 0.5, 0, 3)
    assert policy["status"] == "abstain_all" and policy["min_confidence"] is None
    point = apply_abstention_policy([1, 0], [True, False], 0.5, policy)
    assert point["coverage"] == 0 and point["retained"] == 0
    assert point["risk"] is point["accuracy"] is None
    assert point["accepted"] == [False, False]


def test_no_dev_point_under_target_does_not_use_a_test_selected_cutoff():
    policy = select_abstention_policy([0.9, 0.8], [False, False], 0.5, 0.1, 1)
    assert policy["status"] == "abstain_all"
    assert apply_abstention_policy([0.99], [True], 0.5, policy)["retained"] == 0


def test_empty_curve_and_empty_operating_point_are_undefined():
    assert risk_coverage_curve([], [], 0.5)["aurc"] is None
    point = apply_abstention_policy([], [], 0.5, {"min_confidence": 0.8})
    assert point["coverage"] is point["risk"] is None


@pytest.mark.parametrize("probabilities,threshold", [([math.nan], 0.5), ([math.inf], 0.5), ([-0.1], 0.5), ([1.1], 0.5), ([0.5], math.nan)])
def test_invalid_probability_data_is_rejected(probabilities, threshold):
    with pytest.raises(DatasetError, match="finite"):
        risk_coverage_curve(probabilities, [True], threshold)


@pytest.mark.parametrize("target,minimum", [(-0.1, 1), (1.1, 1), (math.nan, 1), (0.1, 0), (0.1, True), (0.1, 1.5)])
def test_invalid_policy_configuration_is_rejected(target, minimum):
    with pytest.raises(DatasetError):
        select_abstention_policy([0.9], [True], 0.5, target, minimum)


def test_mismatched_targets_are_rejected():
    with pytest.raises(DatasetError, match="equal length"):
        risk_coverage_curve([0.9], [], 0.5)
    with pytest.raises(DatasetError, match="equal length"):
        apply_abstention_policy([0.9], [], 0.5, {"min_confidence": None})


def test_log_loss_clipping_and_invalid_inputs():
    assert binary_log_loss([0.8, 0.2], [True, False]) == pytest.approx(-math.log(0.8))
    clipped_loss = binary_log_loss([0.0, 1.0], [True, False])
    assert clipped_loss is not None and math.isfinite(clipped_loss)
    assert binary_log_loss([], []) is None
    assert binary_log_loss([0.5], []) is None
    assert binary_log_loss([math.nan], [True]) is None
