"""Supplementary train/dev-selected sparse edit baseline, after primary results.

Train and freeze before test scoring. No original lock/source is modified.
"""
from __future__ import annotations

import argparse
import csv
import difflib
import json
import platform
import sys
import time
import warnings
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.exceptions import ConvergenceWarning
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import make_pipeline

from run_vitaminc_pilot import (LABELS, REPO_ROOT, WORD_RE, _threshold_from_dev,
                               load_train_dev, page_key, sha256_file, sha256_text)
from run_vitaminc_locked import EXPECTED_DATA, dump, ignored_destination, metrics
from vitaminc_statistics import paired_page_bootstrap

CONFIG = dict(C_grid=[0.1, 1., 10.], seed=1729, max_features=100000, min_df=3,
              ngram_range=[1, 2], sublinear_tf=True, max_iter=1000,
              solver="liblinear", class_weight=None, penalty="l2")
PLAN = REPO_ROOT / "docs/VITAMINC_TEXT_BASELINE_SUPPLEMENT.md"


def edits(a, b):
    old, new = WORD_RE.findall(a.casefold()), WORD_RE.findall(b.casefold())
    result = []
    for op, i, j, k, l in difflib.SequenceMatcher(a=old, b=new, autojunk=False).get_opcodes():
        if op == "equal":
            continue
        result.extend("old_" + w for w in old[i:j])
        result.extend("new_" + w for w in new[k:l])
    return " ".join(result)


def source_hashes():
    names = [Path(__file__), PLAN, REPO_ROOT / "evaluation/scripts/run_vitaminc_pilot.py",
             REPO_ROOT / "evaluation/scripts/run_vitaminc_locked.py",
             REPO_ROOT / "evaluation/scripts/vitaminc_statistics.py"]
    return {str(p.relative_to(REPO_ROOT)).replace("\\", "/"): sha256_file(p) for p in names}


def train(data_dir, primary_dir, output_dir):
    output = ignored_destination(output_dir)
    start = time.perf_counter()
    for split in ("train", "dev"):
        if sha256_file(data_dir / f"{split}.jsonl") != EXPECTED_DATA[f"{split}.jsonl"]:
            raise ValueError("Data differs from official release")
    train_rows, dev_rows, audit = load_train_dev(data_dir, CONFIG["seed"], None, None)
    if audit["dev_quarantined_count"] != 234:
        raise ValueError("Unexpected dev exclusions")
    train_docs = [edits(r["sent_a"], r["sent_b"]) for r in train_rows]
    dev_docs = [edits(r["sent_a"], r["sent_b"]) for r in dev_rows]
    y = np.array([LABELS[r["label"]] for r in train_rows])
    dy = np.array([LABELS[r["label"]] for r in dev_rows])
    vec = TfidfVectorizer(ngram_range=(1, 2), min_df=3, max_features=100000,
                          sublinear_tf=True, norm="l2", lowercase=False)
    tx, dx = vec.fit_transform(train_docs), vec.transform(dev_docs)
    print(f"Sparse train {tx.shape}, nnz={tx.nnz}; clean dev {dx.shape}", flush=True)
    choices = []
    for c in CONFIG["C_grid"]:
        clf = LogisticRegression(C=c, solver="liblinear", max_iter=1000, random_state=1729)
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always", ConvergenceWarning)
            clf.fit(tx, y)
        if any(issubclass(w.category, ConvergenceWarning) for w in caught):
            raise ValueError("Convergence warning; stop before test")
        s = clf.predict_proba(dx)[:, 1]
        auc = float(roc_auc_score(dy, s))
        choices.append((auc, c, clf, s))
        print(f"C={c}: dev AUROC={auc:.6f}", flush=True)
    auc, c, clf, s = max(choices, key=lambda x: (round(x[0], 12), -x[1]))
    threshold = _threshold_from_dev(s, dy)
    output.mkdir(parents=True)
    joblib.dump(make_pipeline(vec, clf), output / "pipeline.joblib")
    with (output / "dev_predictions.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["case_id", "gold_label", "sparse_score"])
        writer.writerows((r["case_id"], r["label"], float(p)) for r, p in zip(dev_rows, s))
    for name, digest in source_hashes().items():
        target = output / "source" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((REPO_ROOT / name).read_bytes())
        if sha256_file(target) != digest:
            raise ValueError("Source changed during freeze")
    report = json.loads((primary_dir / "results.json").read_text(encoding="utf-8"))
    if sha256_file(primary_dir / "test_predictions.jsonl") != report["predictions_sha256"]:
        raise ValueError("Primary prediction hash mismatch")
    manifest = dict(
        schema="vitaminc-sparse-supplement-v1", created_utc=datetime.now(UTC).isoformat(),
        status="supplementary_after_primary_result_not_confirmatory", config=CONFIG,
        sources_sha256=source_hashes(), data_sha256=EXPECTED_DATA,
        pipeline_sha256=sha256_file(output / "pipeline.joblib"),
        primary_results_sha256=sha256_file(primary_dir / "results.json"),
        primary_predictions_sha256=report["predictions_sha256"],
        selected_C=c, dev_auroc=auc, C_grid_dev_auroc={str(c): a for a, c, _, _ in choices},
        threshold=threshold["threshold"], dev_macro_f1=threshold["dev_macro_f1"],
        vocabulary_features=tx.shape[1], train_rows=tx.shape[0], dev_rows=dx.shape[0],
        dev_predictions_sha256=sha256_file(output / "dev_predictions.csv"),
        train_dev_wall_seconds=time.perf_counter() - start,
        runtime=dict(python=platform.python_version(), sklearn=sklearn.__version__, numpy=np.__version__))
    dump(output / "lock.json", manifest)
    return manifest


def score(data_dir, primary_dir, fitted_dir, output_dir):
    output = ignored_destination(output_dir)
    manifest = json.loads((fitted_dir / "lock.json").read_text(encoding="utf-8"))
    if source_hashes() != manifest["sources_sha256"] or CONFIG != manifest["config"]:
        raise ValueError("Source/config changed after supplement freeze")
    runtime = dict(python=platform.python_version(), sklearn=sklearn.__version__, numpy=np.__version__)
    if runtime != manifest["runtime"]:
        raise ValueError("Runtime changed after fit")
    if sha256_file(fitted_dir / "pipeline.joblib") != manifest["pipeline_sha256"]:
        raise ValueError("Fitted pipeline changed")
    if sha256_file(data_dir / "test.jsonl") != manifest["data_sha256"]["test.jsonl"]:
        raise ValueError("Test bytes changed")
    if (sha256_file(primary_dir / "results.json") != manifest["primary_results_sha256"] or
        sha256_file(primary_dir / "test_predictions.jsonl") != manifest["primary_predictions_sha256"]):
        raise ValueError("Primary artifacts changed")
    with (fitted_dir / "TEST_ACCESS_STARTED.json").open("x", encoding="utf-8") as f:
        json.dump(dict(utc=datetime.now(UTC).isoformat(), output=str(output)), f)
    output.mkdir(parents=True)
    start = time.perf_counter()
    pipeline = joblib.load(fitted_dir / "pipeline.joblib")
    primary = [json.loads(line) for line in (primary_dir / "test_predictions.jsonl").open(encoding="utf-8")]
    by_id = {r["case_id"]: r for r in primary}
    docs, ids = [], []
    with (data_dir / "test.jsonl").open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            ids.append(r["case_id"])
            docs.append(edits(r["sent_a"], r["sent_b"]))
    if len(set(ids)) != len(ids) or set(ids) != set(by_id):
        raise ValueError("Prediction identities differ from primary")
    p = pipeline.predict_proba(docs)[:, 1]
    inference_seconds = time.perf_counter() - start
    rows = [by_id[i] for i in ids]
    y = np.array([LABELS[r["gold_label"]] for r in rows])
    clean = np.array([r["primary_eligible"] for r in rows])
    with (output / "predictions.jsonl").open("w", encoding="utf-8", newline="\n") as f:
        for i, r in enumerate(rows):
            f.write(json.dumps(dict(case_id=r["case_id"], sparse_score=float(p[i]), primary_eligible=bool(clean[i]))) + "\n")
    comparison = paired_page_bootstrap(y[clean], p[clean],
        [r["gmee_augmented_score"] for r in rows if r["primary_eligible"]],
        [r["page_sha256"] for r in rows if r["primary_eligible"]], draws=2000, seed=20261019)
    comparison["sparse_auroc"] = comparison.pop("lexical_auroc")
    comparison["estimand"] = "augmented_minus_sparse_auroc_descriptive"
    comparison.pop("interval_above_margin")
    comparison.pop("practical_margin")
    result = dict(status="post_primary_supplementary_not_confirmatory", primary_clean=metrics(y[clean], p[clean], manifest["threshold"]),
        full_official=metrics(y, p, manifest["threshold"]), augmented_minus_sparse=comparison,
        inference_seconds=inference_seconds, supplement_lock_sha256=sha256_file(fitted_dir / "lock.json"),
        predictions_sha256=sha256_file(output / "predictions.jsonl"))
    dump(output / "results.json", result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["train", "score"])
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--primary-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--fitted-dir", type=Path)
    args = parser.parse_args()
    result = (train(args.data_dir, args.primary_dir, args.output_dir) if args.command == "train" else
              score(args.data_dir, args.primary_dir, args.fitted_dir, args.output_dir))
    print(json.dumps(result, indent=2))
