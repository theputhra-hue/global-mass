"""Fixed exploratory feature-family/sparse-complement supplement.

Train and freeze use train/dev only. Score is a separate, one-access stage.
All previous test results were known before this design; nothing is confirmatory.
"""
from __future__ import annotations

import argparse
import csv
import json
import platform
import shutil
import sys
import time
import warnings
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import rapidfuzz
import scipy
import sklearn
from scipy.sparse import csr_matrix, hstack
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

from run_vitaminc_pilot import (GMEE_NAMES, LABELS, LEXICAL_NAMES, REPO_ROOT,
    _threshold_from_dev, exact_unordered_pair_key, extract_feature_rows,
    load_train_dev, page_key, read_rows, sha256_file, sha256_text)
from run_vitaminc_locked import (EXPECTED_DATA, dump, earlier_keys,
    ignored_destination, metrics, quarantine_reason)
from run_vitaminc_sparse import edits
from vitaminc_statistics import paired_page_bootstrap

PLAN = "docs/VITAMINC_MECHANISM_SUPPLEMENT.md"
SOURCES = (
    "evaluation/scripts/run_vitaminc_mechanism.py", PLAN,
    "evaluation/scripts/run_vitaminc_sparse.py",
    "evaluation/scripts/run_vitaminc_pilot.py",
    "evaluation/scripts/run_vitaminc_locked.py",
    "evaluation/scripts/vitaminc_statistics.py",
    "evaluation/scripts/vitaminc_groups.py",
    "backend/app/__init__.py", "backend/app/services/__init__.py",
    "backend/app/services/evolution/__init__.py",
    "backend/app/services/evolution/text_changes.py",
    "backend/app/services/evolution/quantities.py",
    "evaluation/tests/test_vitaminc_mechanism.py",
)
ALL_NAMES = LEXICAL_NAMES + GMEE_NAMES
SUMMARY_NAMES = ("gmee_similarity", "gmee_changed_span_count",
    "gmee_insert_span_count", "gmee_delete_span_count", "gmee_replace_span_count")
FEATURES = {
    "A": LEXICAL_NAMES + SUMMARY_NAMES,
    "B": LEXICAL_NAMES + tuple(n for n in GMEE_NAMES if n not in SUMMARY_NAMES),
    "C": LEXICAL_NAMES,
    "D": ALL_NAMES,
}
CONFIG = dict(C_grid=[0.01, 0.1, 1.0, 10.0], seed=1729, max_iter=1000,
    solver="liblinear", penalty="l2", class_weight=None,
    selection="clean-dev AUROC; round-12 ties smaller C",
    threshold_selection="clean-dev macro-F1 grid 0..1 by .01; ties higher",
    concatenation="CSR hstack of frozen TF-IDF and train-standardized dense; no row renormalization",
    model_dense_features={k: list(v) for k, v in FEATURES.items()},
    sparse_models=["C", "D"], bootstrap_draws=2000, bootstrap_seed=20261019)
EXPECTED_SPARSE_LOCK = "8fda206c919c1108df8c7dd60983bf0fce198f0431b24d7572b86f022dad2dbf"
EXPECTED_PRIMARY_LOCK = "b7f1e136e8b1238d3fe41908e45f6b9115d924bbd128aa258d0189d945446e0b"
STATUS = "exploratory_post_primary_post_sparse_post_anchor_not_confirmatory"


def runtime_versions():
    return dict(python=platform.python_version(), numpy=np.__version__,
        scipy=scipy.__version__, sklearn=sklearn.__version__,
        rapidfuzz=rapidfuzz.__version__, joblib=joblib.__version__)


def source_hashes():
    return {name: sha256_file(REPO_ROOT / name) for name in SOURCES}


def verify_hashes(root, hashes):
    for name, expected in hashes.items():
        if sha256_file(root / name) != expected:
            raise ValueError(f"Frozen artifact changed: {name}")


def artifact_paths(primary_dir, primary_lock_dir, sparse_fit_dir, sparse_score_dir, anchor_dir):
    return {
        "primary_lock": primary_lock_dir / "lock.json",
        "primary_results": primary_dir / "results.json",
        "primary_predictions": primary_dir / "test_predictions.jsonl",
        "sparse_lock": sparse_fit_dir / "lock.json",
        "sparse_pipeline": sparse_fit_dir / "pipeline.joblib",
        "sparse_dev_predictions": sparse_fit_dir / "dev_predictions.csv",
        "sparse_results": sparse_score_dir / "results.json",
        "sparse_predictions": sparse_score_dir / "predictions.jsonl",
        "anchor_results": anchor_dir / "results.json",
        "anchor_predictions": anchor_dir / "anchor_predictions.jsonl",
    }


def bind_artifacts(paths):
    digests = {name: sha256_file(path) for name, path in paths.items()}
    if digests["sparse_lock"] != EXPECTED_SPARSE_LOCK or digests["primary_lock"] != EXPECTED_PRIMARY_LOCK:
        raise ValueError("Prior analysis lock differs from reviewed artifact")
    sparse = json.loads(paths["sparse_lock"].read_text(encoding="utf-8"))
    if (digests["sparse_pipeline"] != sparse["pipeline_sha256"] or
        digests["sparse_dev_predictions"] != sparse["dev_predictions_sha256"] or
        digests["primary_results"] != sparse["primary_results_sha256"] or
        digests["primary_predictions"] != sparse["primary_predictions_sha256"]):
        raise ValueError("Prior artifact does not match the sparse freeze")
    if sparse["data_sha256"] != EXPECTED_DATA:
        raise ValueError("Sparse vectorizer was fitted on different data")
    if sparse["runtime"] != {k: runtime_versions()[k] for k in ("python", "numpy", "sklearn")}:
        raise ValueError("Sparse model runtime changed")
    return digests


def dense_columns(matrix, model_id):
    values = np.asarray(matrix, dtype=float)
    if values.ndim != 2 or values.shape[1] != len(ALL_NAMES) or not np.isfinite(values).all():
        raise ValueError("Expected finite 33-column dense features")
    return values[:, [ALL_NAMES.index(name) for name in FEATURES[model_id]]]


def design_matrix(scaler, dense, sparse=None, *, fit=False):
    """The only scaler fit path is explicitly requested by training."""
    z = scaler.fit_transform(dense) if fit else scaler.transform(dense)
    return z if sparse is None else hstack((sparse, csr_matrix(z)), format="csr")


def fit_selected(tx, y, dx, dy):
    candidates = []
    for c in CONFIG["C_grid"]:
        clf = LogisticRegression(C=c, solver=CONFIG["solver"], max_iter=CONFIG["max_iter"],
                                 random_state=CONFIG["seed"], class_weight=None)
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always", ConvergenceWarning)
            clf.fit(tx, y)
        if any(issubclass(item.category, ConvergenceWarning) for item in caught):
            raise ValueError("Convergence warning; stop before test")
        if clf.classes_.tolist() != [0, 1]:
            raise ValueError("Unexpected class order")
        p = clf.predict_proba(dx)[:, 1]
        auc = float(roc_auc_score(dy, p))
        candidates.append((auc, c, clf, p))
        print(f"  C={c}: dev AUROC={auc:.9f}", flush=True)
    auc, c, clf, p = max(candidates, key=lambda v: (round(v[0], 12), -v[1]))
    summary = dict(selected_C=c, dev_auroc=auc,
        C_grid_dev_auroc={str(c): a for a, c, _, _ in candidates},
        **_threshold_from_dev(p, dy))
    return clf, p, summary


def train(data_dir, paths, output_dir):
    output = ignored_destination(output_dir)
    start = time.perf_counter()
    sources = source_hashes()
    artifacts = bind_artifacts(paths)  # Hashes only: no prior row-level predictions parsed.
    verify_hashes(data_dir, {n: EXPECTED_DATA[n] for n in ("train.jsonl", "dev.jsonl")})
    train_rows, dev_rows, audit = load_train_dev(data_dir, CONFIG["seed"], None, None)
    if (len(train_rows), len(dev_rows), audit["dev_quarantined_count"]) != (236998, 36390, 234):
        raise ValueError("Unexpected train/dev population")
    vectorizer = joblib.load(paths["sparse_pipeline"]).named_steps["tfidfvectorizer"]
    train_sparse = vectorizer.transform([edits(r["sent_a"], r["sent_b"]) for r in train_rows])
    dev_sparse = vectorizer.transform([edits(r["sent_a"], r["sent_b"]) for r in dev_rows])
    if train_sparse.shape[1] != 90341:
        raise ValueError("Unexpected frozen vocabulary size")
    train_dense = np.asarray([a + b for a, b in extract_feature_rows(train_rows, "train")])
    dev_dense = np.asarray([a + b for a, b in extract_feature_rows(dev_rows, "dev")])
    y = np.asarray([LABELS[r["label"]] for r in train_rows])
    dy = np.asarray([LABELS[r["label"]] for r in dev_rows])
    models, scores, summaries = {}, {}, {}
    for name in FEATURES:
        print(f"Fit model {name}", flush=True)
        scaler = StandardScaler()
        tx = design_matrix(scaler, dense_columns(train_dense, name),
                           train_sparse if name in CONFIG["sparse_models"] else None, fit=True)
        dx = design_matrix(scaler, dense_columns(dev_dense, name),
                           dev_sparse if name in CONFIG["sparse_models"] else None)
        clf, scores[name], summaries[name] = fit_selected(tx, y, dx, dy)
        models[name] = dict(scaler=scaler, classifier=clf, feature_names=list(FEATURES[name]))
        summaries[name]["total_columns"] = tx.shape[1]
    verify_hashes(data_dir, {n: EXPECTED_DATA[n] for n in ("train.jsonl", "dev.jsonl")})
    if source_hashes() != sources or bind_artifacts(paths) != artifacts:
        raise ValueError("Sources or preceding artifacts changed during fit")
    output.mkdir(parents=True)
    joblib.dump(dict(vectorizer=vectorizer, models=models), output / "models.joblib")
    # Verify serialization by replaying all development inputs, without fitting.
    restored = joblib.load(output / "models.joblib")
    replay_sparse = restored["vectorizer"].transform([edits(r["sent_a"], r["sent_b"]) for r in dev_rows])
    replay_errors = {}
    for name, state in restored["models"].items():
        matrix = design_matrix(state["scaler"], dense_columns(dev_dense, name),
                               replay_sparse if name in CONFIG["sparse_models"] else None)
        replay = state["classifier"].predict_proba(matrix)[:, 1]
        replay_errors[name] = float(np.max(np.abs(replay - scores[name])))
        if replay_errors[name] > 1e-12:
            raise ValueError("Serialized model does not reproduce development predictions")
    with (output / "dev_predictions.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["case_id", "gold_label", *[f"{name}_score" for name in FEATURES]])
        writer.writerows([row["case_id"], row["label"], *[float(scores[n][i]) for n in FEATURES]]
                         for i, row in enumerate(dev_rows))
    for name in sources:
        target = output / "source" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(REPO_ROOT / name, target)
    verify_hashes(output / "source", sources)
    manifest = dict(schema="vitaminc-mechanism-supplement-v1", status=STATUS,
        created_utc=datetime.now(UTC).isoformat(), config=CONFIG, runtime=runtime_versions(),
        platform=platform.platform(), sources_sha256=sources, data_sha256=EXPECTED_DATA,
        previous_artifacts_sha256=artifacts,
        models_sha256=sha256_file(output / "models.joblib"),
        dev_predictions_sha256=sha256_file(output / "dev_predictions.csv"),
        train_dev_audit=audit, model_selection=summaries,
        full_dev_serialization_replay_max_errors=replay_errors,
        train_dev_wall_seconds=time.perf_counter() - start,
        access_disclosure="Prior primary, sparse, and anchor test results were known. This fit read train/dev only; prior prediction files were hashed, not parsed.")
    dump(output / "lock.json", manifest)
    return manifest


def validate_lock(data_dir, fitted_dir, paths):
    manifest = json.loads((fitted_dir / "lock.json").read_text(encoding="utf-8"))
    if manifest["schema"] != "vitaminc-mechanism-supplement-v1" or manifest["config"] != CONFIG:
        raise ValueError("Frozen schema/config changed")
    if manifest["runtime"] != runtime_versions():
        raise ValueError("Runtime changed after freeze")
    if manifest["sources_sha256"] != source_hashes():
        raise ValueError("Current source changed after freeze")
    verify_hashes(fitted_dir / "source", manifest["sources_sha256"])
    verify_hashes(data_dir, manifest["data_sha256"])
    verify_hashes(fitted_dir, {"models.joblib": manifest["models_sha256"],
                            "dev_predictions.csv": manifest["dev_predictions_sha256"]})
    if bind_artifacts(paths) != manifest["previous_artifacts_sha256"]:
        raise ValueError("Prior artifacts changed after freeze")
    with (fitted_dir / "dev_predictions.csv").open(encoding="utf-8", newline="") as stream:
        dev = list(csv.DictReader(stream))
    audit = manifest["train_dev_audit"]
    if (len(dev) != 36390 or len({r["case_id"] for r in dev}) != len(dev) or
        sha256_text("\n".join(r["case_id"] for r in dev)) != audit["dev_selected_case_ids_sha256"]):
        raise ValueError("Frozen development identities changed")
    return manifest


def descriptive_contrast(y, left, right, pages, left_name, right_name):
    result = paired_page_bootstrap(y, left, right, pages,
        draws=CONFIG["bootstrap_draws"], seed=CONFIG["bootstrap_seed"])
    result.pop("practical_margin")
    result.pop("interval_above_margin")
    result["left_auroc"] = result.pop("lexical_auroc")
    result["right_auroc"] = result.pop("augmented_auroc")
    result["estimand"] = f"row_weighted_{right_name}_minus_{left_name}_auroc"
    result["status"] = "exploratory_descriptive_interval"
    return result


def score(data_dir, paths, fitted_dir, output_dir):
    output = ignored_destination(output_dir)
    manifest = validate_lock(data_dir, fitted_dir, paths)
    with (fitted_dir / "TEST_ACCESS_STARTED.json").open("x", encoding="utf-8") as stream:
        json.dump(dict(utc=datetime.now(UTC).isoformat(), output=str(output)), stream)
    output.mkdir(parents=True)
    start = time.perf_counter()
    primary = [json.loads(line) for line in paths["primary_predictions"].open(encoding="utf-8")]
    by_id = {r["case_id"]: r for r in primary}
    if len(primary) != 31048 or len(by_id) != len(primary):
        raise ValueError("Primary prediction identity population invalid")
    primary_lock = json.loads(paths["primary_lock"].read_text(encoding="utf-8"))
    earlier, cases = earlier_keys(data_dir)
    rows = list(read_rows(data_dir / "test.jsonl"))
    ids = [r["case_id"] for r in rows]
    if len(set(ids)) != len(ids) or set(ids) != set(by_id) or set(ids) & cases:
        raise ValueError("Test identities differ from original or overlap earlier IDs")
    clean = []
    for row in rows:
        original = by_id[row["case_id"]]
        reasons = quarantine_reason(row, earlier)
        expected = dict(gold_label=row["label"], primary_eligible=not reasons,
            quarantine_reasons=reasons, page_sha256=sha256_text(page_key(row["page"])),
            wiki_revision_id=row["wiki_revision_id"],
            input_pair_sha256=exact_unordered_pair_key(row["sent_a"], row["sent_b"]))
        if any(original[key] != value for key, value in expected.items()):
            raise ValueError("Test input, label, or eligibility differs from original")
        clean.append(not reasons)
    clean = np.asarray(clean)
    for eligible, key in ((True, "retained_case_ids_sha256"), (False, "excluded_case_ids_sha256")):
        if sha256_text("\n".join(sorted(r["case_id"] for i, r in enumerate(rows) if clean[i] == eligible))) != primary_lock[key]:
            raise ValueError("Original frozen eligibility digest differs")
    if (len(rows), int(clean.sum())) != (31048, 30828):
        raise ValueError("Unexpected score population")
    dense = np.asarray([a + b for a, b in extract_feature_rows(rows, "test")])
    state = joblib.load(fitted_dir / "models.joblib")
    sparse = state["vectorizer"].transform([edits(r["sent_a"], r["sent_b"]) for r in rows])
    scores = {}
    for name, model in state["models"].items():
        if model["feature_names"] != list(FEATURES[name]) or model["classifier"].classes_.tolist() != [0, 1]:
            raise ValueError("Invalid frozen feature or class order")
        matrix = design_matrix(model["scaler"], dense_columns(dense, name),
                               sparse if name in CONFIG["sparse_models"] else None)
        scores[name] = model["classifier"].predict_proba(matrix)[:, 1]
    inference_seconds = time.perf_counter() - start
    y = np.asarray([LABELS[r["label"]] for r in rows])
    with (output / "predictions.jsonl").open("w", encoding="utf-8", newline="\n") as stream:
        for i, row in enumerate(rows):
            stream.write(json.dumps(dict(case_id=row["case_id"], primary_eligible=bool(clean[i]),
                **{f"{name}_score": float(p[i]) for name, p in scores.items()}), sort_keys=True, allow_nan=False) + "\n")
    pages = [by_id[r["case_id"]]["page_sha256"] for i, r in enumerate(rows) if clean[i]]
    original = np.asarray([by_id[r["case_id"]]["gmee_augmented_score"] for r in rows])
    result = dict(status=STATUS,
        primary_clean={n: metrics(y[clean], p[clean], manifest["model_selection"][n]["threshold"]) for n, p in scores.items()},
        full_official={n: metrics(y, p, manifest["model_selection"][n]["threshold"]) for n, p in scores.items()},
        descriptive_contrasts=dict(
            original33_minus_A=descriptive_contrast(y[clean], scores["A"][clean], original[clean], pages, "A", "original33"),
            D_minus_C=descriptive_contrast(y[clean], scores["C"][clean], scores["D"][clean], pages, "C", "D")),
        inference_seconds_including_identity_features=inference_seconds,
        total_seconds_including_bootstrap=time.perf_counter() - start,
        supplement_lock_sha256=sha256_file(fitted_dir / "lock.json"),
        predictions_sha256=sha256_file(output / "predictions.jsonl"),
        runtime=runtime_versions(), scope="Feature-family association only; no per-rule, causal, natural-news, or confirmatory validation.")
    dump(output / "results.json", result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["train", "score"])
    for name in ("data-dir", "primary-dir", "primary-lock-dir", "sparse-fit-dir", "sparse-score-dir", "anchor-dir", "output-dir"):
        parser.add_argument("--" + name, type=Path, required=True)
    parser.add_argument("--fitted-dir", type=Path)
    args = parser.parse_args()
    paths = artifact_paths(args.primary_dir, args.primary_lock_dir, args.sparse_fit_dir, args.sparse_score_dir, args.anchor_dir)
    if args.command == "score" and args.fitted_dir is None:
        parser.error("score requires --fitted-dir")
    result = train(args.data_dir, paths, args.output_dir) if args.command == "train" else score(args.data_dir, paths, args.fitted_dir, args.output_dir)
    print(json.dumps(result, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
