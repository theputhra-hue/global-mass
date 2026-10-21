"""Synthetic verifier gates only; no dataset reads, model fitting, or scoring."""
import copy
import csv
import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import verify_vitaminc_reconstruction as verifier


def test_exact_selection_fields_are_exact_even_when_compared_directly():
    comparison = verifier.Comparison()
    comparison.compare(0.37, 0.37 + 1e-12, "sparse_fit/threshold")
    comparison.compare(1.0, 1.0 + 1e-12, "sparse_fit/selected_C")
    assert len(comparison.failures) == 2


def test_nonfinite_scalar_and_array_failures_remain_json_serializable():
    comparison = verifier.Comparison()
    comparison.compare(0.1, float("nan"), "model/metric")
    comparison.array(np.array([0.1]), np.array([float("inf")]), "model/state")
    assert len(comparison.failures) == 2
    assert comparison.max_errors == {"model/metric": None, "model/state": None}
    json.dumps(comparison.max_errors, allow_nan=False)


def test_probability_tolerance_does_not_hide_changed_classification(tmp_path):
    old, new = tmp_path / "old.jsonl", tmp_path / "new.jsonl"
    for path, probability in ((old, 0.5 - 1e-12), (new, 0.5)):
        path.write_text(json.dumps(dict(case_id="synthetic", score=probability)) + "\n")
    comparison = verifier.Comparison()
    comparison.rows(old, new, "synthetic_test", ["score"], thresholds={"score": 0.5})
    assert comparison.failures == ["synthetic_test/score:classification"]
    assert 0 < comparison.max_errors["synthetic_test/score"] < verifier.CPU_TOL


def test_development_header_order_is_checked(tmp_path):
    old, new = tmp_path / "old.csv", tmp_path / "new.csv"
    expected = verifier.CSV_HEADERS["sparse_fit_dev"]
    for path, fields in ((old, expected), (new, list(reversed(expected)))):
        with path.open("w", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            writer.writerow(dict(case_id="synthetic", gold_label="factual", sparse_score=0.75))
    comparison = verifier.Comparison()
    comparison.rows(old, new, "sparse_fit_dev", ["sparse_score"])
    assert comparison.failures == ["sparse_fit_dev/fresh:csv_header"]


def test_identity_metadata_requires_boolean_eligibility():
    assert not verifier.exact_equal({"primary_eligible": True}, {"primary_eligible": 1})
    assert verifier.exact_equal({"primary_eligible": True}, {"primary_eligible": True})


def test_adapter_allows_only_declared_metadata_and_pinned_source():
    original = {"config": {"seed": 1729, "C_grid": [0.01, 1.0]},
                "sources_sha256": {"historical.py": "a" * 64}}
    fresh = copy.deepcopy(original)
    fresh["config"]["reconstruction"] = {
        "adapter": verifier.ADAPTER,
        "expected_primary_lock_sha256": "b" * 64,
        "expected_sparse_lock_sha256": "c" * 64,
        "scope": "New artifact reconstruction; not the historical original run",
    }
    fresh["sources_sha256"][verifier.ADAPTER] = verifier.ADAPTER_SHA256
    fresh["status"] = "exploratory_fresh_artifact_reconstruction_not_original_evidence"
    comparison = verifier.Comparison()
    verifier.check_mechanism_adapter(comparison, original, fresh, "b" * 64, "c" * 64)
    assert not comparison.failures
    fresh["config"]["seed"] = 1730
    fresh["sources_sha256"]["historical.py"] = "d" * 64
    verifier.check_mechanism_adapter(comparison, original, fresh, "b" * 64, "c" * 64)
    assert any("base_config/seed" in failure for failure in comparison.failures)
    assert any("expected_sources/historical.py" in failure for failure in comparison.failures)


def test_structural_failure_writes_receipt_without_private_exception_text(tmp_path, monkeypatch):
    plan, output = tmp_path / "plan.md", tmp_path / "result.json"
    plan.write_text("synthetic comparison plan")

    def broken(*args, **kwargs):
        raise KeyError("private-row-identifier")

    monkeypatch.setattr(verifier, "verify", broken)
    monkeypatch.setattr(sys, "argv", ["verifier", "--original-runs", str(tmp_path),
        "--fresh-runs", str(tmp_path), "--data-dir", str(tmp_path),
        "--model-dir", str(tmp_path), "--plan", str(plan), "--output", str(output)])
    with pytest.raises(SystemExit) as stopped:
        verifier.main()
    assert stopped.value.code == 1
    report = json.loads(output.read_text())
    assert not report["passed"]
    assert report["failures"] == ["verification_aborted:KeyError"]
    assert "private-row-identifier" not in output.read_text()


def test_internal_chain_rejects_changed_consumed_fit_copy(tmp_path):
    dirs = {key: tmp_path / key for key in verifier.ORIGINAL}
    for path in dirs.values():
        path.mkdir()

    def put(path, value):
        path.write_text(json.dumps(value))
        return verifier.sha(path)

    models = put(dirs["primary_fit"] / "models.json", {"synthetic": True})
    dev = put(dirs["primary_fit"] / "dev_predictions.csv", "synthetic")
    fit = {"model_state_sha256": models, "dev_predictions_sha256": dev}
    fit_hash = put(dirs["primary_fit"] / "manifest.json", fit)
    put(dirs["primary_lock"] / "fit_models.json", {"synthetic": True})
    put(dirs["primary_lock"] / "fit_manifest.json", fit)
    put(dirs["primary_lock"] / "fit_dev_predictions.csv", "synthetic")
    protocol = put(dirs["primary_lock"] / "analysis_plan.md", "plan")
    primary_lock_hash = put(dirs["primary_lock"] / "lock.json", {
        "models_sha256": models, "fit_manifest_sha256": fit_hash,
        "protocol_sha256": protocol})
    primary_predictions = put(dirs["primary"] / "test_predictions.jsonl", "predictions")
    primary_results = put(dirs["primary"] / "results.json", "results")
    predecessor = dict(primary_results_sha256=primary_results,
                       primary_predictions_sha256=primary_predictions,
                       original_lock_sha256=primary_lock_hash)
    sparse_pipeline = put(dirs["sparse_fit"] / "pipeline.joblib", "pipeline")
    sparse_dev = put(dirs["sparse_fit"] / "dev_predictions.csv", "dev")
    put(dirs["sparse_fit"] / "lock.json", {
        **{k: v for k, v in predecessor.items() if k != "original_lock_sha256"},
        "pipeline_sha256": sparse_pipeline, "dev_predictions_sha256": sparse_dev})
    put(dirs["sparse"] / "results.json", "sparse results")
    put(dirs["sparse"] / "predictions.jsonl", "sparse predictions")
    runtime = dict(python="synthetic", torch="synthetic", transformers="synthetic")
    config = {"runtime": runtime}
    anchor_lock_hash = put(dirs["anchor_lock"] / "lock.json",
                          dict(config=config, **predecessor))
    anchor_predictions = put(dirs["anchor"] / "anchor_predictions.jsonl", "anchor")
    manifest = dict(config=config, runtime=runtime, **predecessor,
                    supplement_lock_sha256=anchor_lock_hash,
                    predictions_sha256=anchor_predictions)
    manifest_hash = put(dirs["anchor"] / "manifest.json", manifest)
    anchor_report = dict(manifest_sha256=manifest_hash, **predecessor)
    put(dirs["anchor"] / "results.json", anchor_report)
    paths = {
        "primary_lock": dirs["primary_lock"] / "lock.json",
        "primary_results": dirs["primary"] / "results.json",
        "primary_predictions": dirs["primary"] / "test_predictions.jsonl",
        "sparse_lock": dirs["sparse_fit"] / "lock.json",
        "sparse_pipeline": dirs["sparse_fit"] / "pipeline.joblib",
        "sparse_dev_predictions": dirs["sparse_fit"] / "dev_predictions.csv",
        "sparse_results": dirs["sparse"] / "results.json",
        "sparse_predictions": dirs["sparse"] / "predictions.jsonl",
        "anchor_results": dirs["anchor"] / "results.json",
        "anchor_predictions": dirs["anchor"] / "anchor_predictions.jsonl",
    }
    mechanism_models = put(dirs["mechanism_fit"] / "models.joblib", "models")
    mechanism_dev = put(dirs["mechanism_fit"] / "dev_predictions.csv", "dev")
    put(dirs["mechanism_fit"] / "lock.json", {
        "previous_artifacts_sha256": {key: verifier.sha(path) for key, path in paths.items()},
        "models_sha256": mechanism_models, "dev_predictions_sha256": mechanism_dev})
    comparison = verifier.Comparison()
    verifier.bind_internal_chain(comparison, dirs, {"anchor": anchor_report}, "synthetic")
    assert not comparison.failures
    put(dirs["primary_lock"] / "fit_models.json", {"changed": True})
    verifier.bind_internal_chain(comparison, dirs, {"anchor": anchor_report}, "synthetic")
    assert comparison.failures == ["synthetic/locked_fit/models.json:hash"]
