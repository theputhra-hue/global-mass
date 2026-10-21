"""Freeze a local analysis plan, then evaluate its fixed models once.

`freeze` hashes the released test file without interpreting its labels. `score`
requires an intact freeze, a full train/dev fit, and a fresh output directory.
This local content hash is an analysis freeze, not external preregistration.
"""

from __future__ import annotations

import argparse
import csv
import json
import platform
import shutil
import subprocess
import sys
import time
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rapidfuzz
import scipy
import sklearn
from scipy.special import expit
from sklearn.metrics import (average_precision_score, brier_score_loss,
                             confusion_matrix, f1_score, log_loss, roc_auc_score)

from run_vitaminc_pilot import (GMEE_NAMES, LABELS, LEXICAL_NAMES, REPO_ROOT,
                               exact_unordered_pair_key, feature_vectors,
                               identity_keys, page_key, sha256_file, sha256_text)
from vitaminc_statistics import paired_page_bootstrap
from vitaminc_groups import connected_input_groups


EXPECTED_DATA = {
    "train.jsonl": "9ed654d11db34be1918af0abe83df348f462daefbdf1ee6a521ae7682ab3277b",
    "dev.jsonl": "fd1e6a3c15d53b7529e5c04533619c1ffa6091435aa6864842fe2f0e47363733",
    "test.jsonl": "0e1094b357d72716febc75ebccf24581b558d0a3e6ae69c23d23f892aeed3a3a",
}
SOURCES = (
    "evaluation/scripts/run_vitaminc_locked.py",
    "evaluation/scripts/run_vitaminc_pilot.py",
    "evaluation/scripts/vitaminc_statistics.py",
    "backend/app/services/evolution/text_changes.py",
    "backend/app/services/evolution/quantities.py",
    "evaluation/scripts/vitaminc_groups.py",
)


def dump(path, value):
    path.write_text(json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def runtime_versions():
    return {"python": platform.python_version(), "numpy": np.__version__,
            "scipy": scipy.__version__, "scikit_learn": sklearn.__version__,
            "rapidfuzz": rapidfuzz.__version__}


def ignored_destination(path):
    path = path.resolve()
    if not path.is_relative_to((REPO_ROOT / ".local-deployment").resolve()):
        raise ValueError("Output must be inside ignored .local-deployment")
    if path.exists():
        raise ValueError("Output must not exist; preserve earlier attempts")
    return path


def frozen_probabilities(model, matrix, names):
    if model["feature_names"] != list(names) or model["class_order"] != [0, 1]:
        raise ValueError("Frozen feature names or class order do not match")
    matrix = np.asarray(matrix, dtype=float)
    mean = np.asarray(model["standard_scaler_mean"])
    scale = np.asarray(model["standard_scaler_scale"])
    beta = np.asarray(model["logistic_coefficients"])
    if (matrix.ndim != 2 or matrix.shape[1] != len(names)
            or any(a.shape != (len(names),) for a in (mean, scale, beta))
            or not all(np.isfinite(a).all() for a in (matrix, mean, scale, beta))
            or (scale <= 0).any() or not np.isfinite(model["logistic_intercept"])):
        raise ValueError("Invalid frozen model or feature matrix")
    return expit(((matrix - mean) / scale) @ beta + model["logistic_intercept"])


def metrics(y, scores, threshold):
    y, scores = np.asarray(y), np.asarray(scores)
    predicted = scores >= threshold
    both = len(np.unique(y)) == 2
    return {
        "rows": len(y), "factual": int(y.sum()), "not_factual": int((y == 0).sum()),
        "auroc": float(roc_auc_score(y, scores)) if both else None,
        "average_precision": float(average_precision_score(y, scores)) if both else None,
        "macro_f1": float(f1_score(y, predicted, labels=[0, 1], average="macro", zero_division=0)),
        "threshold": threshold,
        "confusion_matrix_gold_rows_predicted_columns_0_1": confusion_matrix(y, predicted, labels=[0, 1]).tolist(),
        "brier": float(brier_score_loss(y, scores)),
        "log_loss": float(log_loss(y, scores, labels=[0, 1])),
    }


def input_rows(path):
    """Select only the fields needed for identity audit; no label access."""
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            raw = json.loads(line)
            yield {key: raw[key] for key in ("case_id", "page", "wiki_revision_id", "sent_a", "sent_b")}


def earlier_keys(data_dir):
    keys = (set(), set(), set())
    cases = set()
    for split in ("train", "dev"):
        for row in input_rows(data_dir / f"{split}.jsonl"):
            if row["case_id"] in cases:
                raise ValueError("Duplicate earlier case ID")
            cases.add(row["case_id"])
            for values, key in zip(keys, identity_keys(row)):
                values.add(key)
    return keys, cases


def quarantine_reason(row, keys):
    return [name for name, key, values in zip(
        ("page", "wiki_revision_id", "exact_unordered_pair"), identity_keys(row), keys) if key in values]


def input_group_records(rows):
    """Build dependence-group records from input fields only."""
    records = []
    for row in rows:
        records.append({
            "case_id": row["case_id"],
            "page_sha256": row.get("page_sha256") or sha256_text(page_key(row["page"])),
            "wiki_revision_id": row["wiki_revision_id"],
            "input_pair_sha256": row.get("input_pair_sha256") or exact_unordered_pair_key(
                row["sent_a"], row["sent_b"]
            ),
        })
    return records


def input_group_diagnostics(rows):
    """Summarize connected input groups without reading labels or scores."""
    grouped = connected_input_groups(input_group_records(rows))
    return {key: value for key, value in grouped.items() if key != "group_ids"}


def freeze(data_dir, fitted_dir, protocol, destination):
    destination = ignored_destination(destination)
    fit = json.loads((fitted_dir / "manifest.json").read_text(encoding="utf-8"))
    if fit["max_train"] is not None or fit["max_dev"] is not None:
        raise ValueError("A bounded pilot cannot be used for the locked final comparison")
    audit = fit["audit"]
    if (audit["train_selected_count"], audit["dev_selected_count"], audit["dev_quarantined_count"]) != (236998, 36390, 234):
        raise ValueError("Full fit counts differ from the audited protocol")
    data_hashes = {name: sha256_file(data_dir / name) for name in EXPECTED_DATA}
    if data_hashes != EXPECTED_DATA:
        raise ValueError("Data bytes differ from the audited official release")
    fit_sources = {"pilot_script": SOURCES[1], "text_changes": SOURCES[3], "quantities": SOURCES[4]}
    for key, path in fit_sources.items():
        if fit["source_sha256"][key] != sha256_file(REPO_ROOT / path):
            raise ValueError(f"Fitted source changed: {path}")
    for split in ("train", "dev"):
        if fit["source_sha256"][f"{split}_jsonl"] != data_hashes[f"{split}.jsonl"]:
            raise ValueError("Fit data differs from release")
    if fit["model_state_sha256"] != sha256_file(fitted_dir / "models.json"):
        raise ValueError("Fitted model state has changed")
    if fit["dev_predictions_sha256"] != sha256_file(fitted_dir / "dev_predictions.csv"):
        raise ValueError("Development predictions have changed")
    models = json.loads((fitted_dir / "models.json").read_text(encoding="utf-8"))
    for model in models.values():
        if any(model["C_grid_convergence_warnings"].values()):
            raise ValueError("Resolve model convergence warnings before freezing")
    with (fitted_dir / "dev_predictions.csv").open(encoding="utf-8", newline="") as stream:
        dev_predictions = list(csv.DictReader(stream))
    if (len(dev_predictions) != 36390 or
            sha256_text("\n".join(sorted(row["case_id"] for row in dev_predictions))) != audit["dev_selected_case_ids_sha256"]):
        raise ValueError("Development prediction identities differ from fit manifest")
    selected = {row["case_id"]: row for row in dev_predictions[:100]}
    checked = 0
    max_error = 0.
    for row in input_rows(data_dir / "dev.jsonl"):
        if row["case_id"] not in selected:
            continue
        a, b = feature_vectors(row)
        for name, features, names in (("lexical", a, LEXICAL_NAMES),
                                       ("gmee_augmented", a + b, LEXICAL_NAMES + GMEE_NAMES)):
            p = frozen_probabilities(models[name], [features], names)[0]
            max_error = max(max_error, abs(p - float(selected[row["case_id"]][name + "_score"])))
        checked += 1
    if checked != 100 or max_error > 1e-12:
        raise ValueError("Saved-model inference does not reproduce development predictions")
    earlier, cases = earlier_keys(data_dir)
    excluded, retained = [], []
    for row in input_rows(data_dir / "test.jsonl"):
        if row["case_id"] in cases:
            raise ValueError("Duplicate test case ID")
        cases.add(row["case_id"])
        (excluded if quarantine_reason(row, earlier) else retained).append(row)
    if len(excluded) != 220 or len(retained) != 30828:
        raise ValueError("Test identity audit differs from the reviewed release")
    retained_ids = [row["case_id"] for row in retained]
    excluded_ids = [row["case_id"] for row in excluded]
    test_input_dependence = input_group_diagnostics(retained)
    protocol_text = protocol.read_text(encoding="utf-8")
    if "LOCAL ANALYSIS FREEZE v1" not in protocol_text:
        raise ValueError("Provide the reviewed final protocol with LOCAL ANALYSIS FREEZE v1 marker")
    destination.mkdir(parents=True)
    for source in SOURCES:
        out = destination / "source" / source
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(REPO_ROOT / source, out)
    for name in ("models.json", "manifest.json", "dev_predictions.csv"):
        shutil.copyfile(fitted_dir / name, destination / f"fit_{name}")
    shutil.copyfile(protocol, destination / "analysis_plan.md")
    lock = {
        "schema": "vitaminc-local-analysis-freeze-v1",
        "created_utc": datetime.now(UTC).isoformat(),
        "status": "locally_frozen_before_test_scoring_not_external_preregistration",
        "git_head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, text=True).strip(),
        "sources_sha256": {source: sha256_file(REPO_ROOT / source) for source in SOURCES},
        "data_sha256": data_hashes,
        "fit_manifest_sha256": sha256_file(destination / "fit_manifest.json"),
        "models_sha256": sha256_file(destination / "fit_models.json"),
        "protocol_sha256": sha256_file(destination / "analysis_plan.md"),
        "runtime_versions": runtime_versions(),
        "dev_state_replay": {"rows": checked, "maximum_probability_error": max_error},
        "bootstrap": {"draws": 2000, "seed": 20261019, "margin": 0.02},
        "clean_test_rows": len(retained), "quarantined_test_rows": len(excluded),
        "retained_case_ids_sha256": sha256_text("\n".join(sorted(retained_ids))),
        "excluded_case_ids_sha256": sha256_text("\n".join(sorted(excluded_ids))),
        "test_input_dependence": test_input_dependence,
        "test_access_disclosure": "Aggregate test-label summary viewed before lock; no per-row labels or model outcomes viewed before lock.",
    }
    dump(destination / "lock.json", lock)
    return {"lock_path": str(destination / "lock.json"), "lock_sha256": sha256_file(destination / "lock.json")}


def validate_lock(data_dir, locked_dir):
    lock = json.loads((locked_dir / "lock.json").read_text(encoding="utf-8"))
    if lock["schema"] != "vitaminc-local-analysis-freeze-v1":
        raise ValueError("Unknown lock format")
    if lock["runtime_versions"] != runtime_versions():
        raise ValueError("Runtime library versions changed after freeze")
    for source, digest in lock["sources_sha256"].items():
        if sha256_file(REPO_ROOT / source) != digest or sha256_file(locked_dir / "source" / source) != digest:
            raise ValueError(f"Source changed after freeze: {source}")
    for name, digest in lock["data_sha256"].items():
        if sha256_file(data_dir / name) != digest:
            raise ValueError(f"Data changed after freeze: {name}")
    for name, key in (("fit_models.json", "models_sha256"), ("fit_manifest.json", "fit_manifest_sha256"),
                      ("analysis_plan.md", "protocol_sha256")):
        if sha256_file(locked_dir / name) != lock[key]:
            raise ValueError(f"Frozen artifact changed: {name}")
    fit = json.loads((locked_dir / "fit_manifest.json").read_text(encoding="utf-8"))
    if sha256_file(locked_dir / "fit_dev_predictions.csv") != fit["dev_predictions_sha256"]:
        raise ValueError("Frozen development predictions changed")
    return lock


def score(data_dir, locked_dir, destination):
    destination = ignored_destination(destination)
    lock = validate_lock(data_dir, locked_dir)
    # Marker lives with the freeze, so a different output path cannot silently
    # repeat the test. If a run fails, preserve marker and disclose any rerun.
    with (locked_dir / "TEST_ACCESS_STARTED.json").open("x", encoding="utf-8") as stream:
        json.dump({"utc": datetime.now(UTC).isoformat(), "output_dir": str(destination)}, stream)
    destination.mkdir(parents=True)
    start = time.perf_counter()
    earlier, cases = earlier_keys(data_dir)
    models = json.loads((locked_dir / "fit_models.json").read_text(encoding="utf-8"))
    rows, lexical, augmented, gold, clean = [], [], [], [], []
    with (data_dir / "test.jsonl").open(encoding="utf-8") as stream:
        for line in stream:
            row = json.loads(line)
            if row["case_id"] in cases or row["label"] not in LABELS:
                raise ValueError("Invalid or duplicate test row")
            cases.add(row["case_id"])
            reasons = quarantine_reason(row, earlier)
            a, b = feature_vectors(row)
            lexical.append(a)
            augmented.append(a + b)
            gold.append(LABELS[row["label"]])
            clean.append(not reasons)
            rows.append({
                "case_id": row["case_id"], "page_sha256": sha256_text(page_key(row["page"])),
                "wiki_revision_id": row["wiki_revision_id"],
                "input_pair_sha256": exact_unordered_pair_key(row["sent_a"], row["sent_b"]),
                "gold_label": row["label"], "primary_eligible": not reasons, "quarantine_reasons": reasons,
            })
    clean = np.asarray(clean)
    gold = np.asarray(gold)
    clean_rows = [row for row in rows if row["primary_eligible"]]
    groups = connected_input_groups(input_group_records(clean_rows))
    actual_dependence = {key: value for key, value in groups.items() if key != "group_ids"}
    if actual_dependence != lock["test_input_dependence"]:
        raise ValueError("Frozen input dependence diagnostics changed")
    scores = {
        "lexical": frozen_probabilities(models["lexical"], lexical, LEXICAL_NAMES),
        "gmee_augmented": frozen_probabilities(models["gmee_augmented"], augmented, LEXICAL_NAMES + GMEE_NAMES),
    }
    retained = sorted(row["case_id"] for row in rows if row["primary_eligible"])
    if sha256_text("\n".join(retained)) != lock["retained_case_ids_sha256"]:
        raise ValueError("Frozen eligibility changed")
    predictions = destination / "test_predictions.jsonl"
    with predictions.open("w", encoding="utf-8", newline="\n") as stream:
        for i, row in enumerate(rows):
            for name in scores:
                row[f"{name}_score"] = float(scores[name][i])
                row[f"{name}_predicted"] = int(scores[name][i] >= models[name]["threshold"])
            stream.write(json.dumps(row, sort_keys=True, allow_nan=False) + "\n")
    sensitivity = paired_page_bootstrap(
        gold[clean], scores["lexical"][clean], scores["gmee_augmented"][clean], groups.pop("group_ids"),
        **lock["bootstrap"])
    sensitivity["method"] = "paired_input_connected_component_percentile_bootstrap"
    sensitivity["components"] = sensitivity.pop("pages")
    sensitivity["descriptive_sensitivity_only"] = True
    report = {
        "status": "locked_component_test_comparison",
        "task": "VitaminC factual revision flagging",
        "local_lock_sha256": sha256_file(locked_dir / "lock.json"),
        "predictions_sha256": sha256_file(predictions),
        "primary_clean": {name: metrics(gold[clean], values[clean], models[name]["threshold"])
                          for name, values in scores.items()},
        "secondary_full_official": {name: metrics(gold, values, models[name]["threshold"])
                                    for name, values in scores.items()},
        "primary_comparison": paired_page_bootstrap(
            gold[clean], scores["lexical"][clean], scores["gmee_augmented"][clean],
            [row["page_sha256"] for row in rows if row["primary_eligible"]], **lock["bootstrap"]),
        "dependence_sensitivity": {"group_diagnostics": groups, "comparison": sensitivity},
        "quarantine_reasons_nonexclusive": dict(Counter(r for row in rows for r in row["quarantine_reasons"])),
        "seconds_including_identity_check_features_metrics_bootstrap": time.perf_counter() - start,
        "runtime": {"python": sys.version, "platform": platform.platform(), "processor": platform.processor()},
        "test_access_disclosure": lock["test_access_disclosure"],
        "scope": "Fixed learned lexical/GMEE feature contrast only; no natural-news, type/span, truth, or causal validation.",
    }
    dump(destination / "results.json", report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("freeze")
    p.add_argument("--data-dir", type=Path, required=True)
    p.add_argument("--fitted-dir", type=Path, required=True)
    p.add_argument("--protocol", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, required=True)
    p = sub.add_parser("score")
    p.add_argument("--data-dir", type=Path, required=True)
    p.add_argument("--locked-dir", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "freeze":
        output = freeze(args.data_dir, args.fitted_dir, args.protocol, args.output_dir)
    else:
        output = score(args.data_dir, args.locked_dir, args.output_dir)
    print(json.dumps(output, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
