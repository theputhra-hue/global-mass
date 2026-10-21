"""Aggregate the fixed anchor's saved predictions; never run model inference.

This post-inference implementation follows the already frozen metric recipe.
It preserves the original predictions, checks their identities and hashes, and
refuses to overwrite a summary. No threshold or model selection occurs here.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import sklearn
from sklearn.metrics import (average_precision_score, brier_score_loss,
                             confusion_matrix, f1_score, log_loss, roc_auc_score)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def rows(path):
    result = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
    if len(result) != 31048 or len({r["case_id"] for r in result}) != 31048:
        raise ValueError("Expected exactly 31,048 unique original case identifiers")
    return result


def metrics(y, p):
    return dict(rows=len(y), factual=int(y.sum()), not_factual=int((y == 0).sum()),
                auroc=float(roc_auc_score(y, p)),
                average_precision=float(average_precision_score(y, p)),
                macro_f1=float(f1_score(y, p >= 0.5, average="macro")),
                brier_score=float(brier_score_loss(y, p)),
                log_loss=float(log_loss(y, p, labels=[0, 1])), threshold=0.5,
                confusion_matrix=confusion_matrix(y, p >= 0.5, labels=[0, 1]).tolist())


def summarize(primary_dir, anchor_dir, frozen_dir):
    output = anchor_dir / "results.json"
    if output.exists():
        raise ValueError("A summary already exists; preserve it")
    lock_path, manifest_path = frozen_dir / "lock.json", anchor_dir / "manifest.json"
    lock, manifest = read(lock_path), read(manifest_path)
    primary_report_path = primary_dir / "results.json"
    primary_pred_path = primary_dir / "test_predictions.jsonl"
    anchor_pred_path = anchor_dir / "anchor_predictions.jsonl"
    primary_report = read(primary_report_path)
    expected = dict(primary_results_sha256=sha(primary_report_path),
                    primary_predictions_sha256=sha(primary_pred_path),
                    original_lock_sha256=primary_report["local_lock_sha256"])
    for name, value in expected.items():
        if lock[name] != value or manifest[name] != value:
            raise ValueError(f"Changed primary artifact: {name}")
    if manifest["supplement_lock_sha256"] != sha(lock_path):
        raise ValueError("Anchor lock does not match inference manifest")
    if manifest["predictions_sha256"] != sha(anchor_pred_path):
        raise ValueError("Anchor prediction digest mismatch")
    if primary_report["predictions_sha256"] != expected["primary_predictions_sha256"]:
        raise ValueError("Primary prediction digest mismatch")
    if manifest["config"] != lock["config"]:
        raise ValueError("Inference recipe differs from frozen plan")
    for rel, digest in lock["sources_sha256"].items():
        if sha(frozen_dir / "source" / rel) != digest:
            raise ValueError(f"Frozen source changed: {rel}")
    primary, anchor = rows(primary_pred_path), rows(anchor_pred_path)
    if [r["case_id"] for r in primary] != [r["case_id"] for r in anchor]:
        raise ValueError("Anchor and primary row order/identities differ")
    if any(type(a["primary_eligible"]) is not bool or
           a["primary_eligible"] != p["primary_eligible"] for a, p in zip(anchor, primary)):
        raise ValueError("Primary eligibility mismatch")
    if any(r["gold_label"] not in ("factual", "not factual") for r in primary):
        raise ValueError("Unknown gold label")
    y = np.array([r["gold_label"] == "factual" for r in primary], dtype=int)
    p = np.array([r["factual_probability"] for r in anchor], dtype=float)
    mask = np.array([r["primary_eligible"] for r in primary], dtype=bool)
    lengths = np.array([r["untruncated_tokens"] for r in anchor], dtype=int)
    if mask.sum() != 30828 or not np.isfinite(p).all() or ((p < 0) | (p > 1)).any():
        raise ValueError("Unexpected eligibility or invalid probabilities")
    truncation = lengths > lock["config"]["max_seq_length"]
    if int(truncation.sum()) != manifest["input_pairs_truncated"]:
        raise ValueError("Truncation accounting differs")
    result = dict(schema="vitaminc-anchor-summary-v1", created_utc=datetime.now(UTC).isoformat(),
        status="supplementary_descriptive_after_primary_result", **expected,
        supplement_lock_sha256=sha(lock_path), manifest_sha256=sha(manifest_path),
        predictions_sha256=sha(anchor_pred_path), summary_script_sha256=sha(Path(__file__)),
        runtime=dict(python=platform.python_version(), numpy=np.__version__, sklearn=sklearn.__version__),
        clean_test=metrics(y[mask], p[mask]), full_test=metrics(y, p),
        truncation=dict(clean_rows=int(truncation[mask].sum()), full_rows=int(truncation.sum()),
                        max_untruncated_tokens=int(lengths.max())),
        measurement=dict(inference_seconds=manifest["inference_seconds"],
                         peak_cuda_allocated_bytes=manifest["peak_cuda_allocated_bytes"],
                         gpu=manifest["gpu"],
                         caveat="Includes token-length audit; excludes setup/warmup. No matched speed claim."),
        inference_note="Metrics only from saved predictions; no rescore, fitting, or selection.")
    with output.open("x", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(result, indent=2, sort_keys=True, allow_nan=False) + "\n")
    return dict(results_sha256=sha(output), **result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("primary-dir", "anchor-dir", "frozen-dir"):
        parser.add_argument("--" + name, type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(summarize(args.primary_dir, args.anchor_dir, args.frozen_dir), indent=2))
