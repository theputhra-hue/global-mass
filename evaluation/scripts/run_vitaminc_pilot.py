"""Exploratory VitaminC flagging pilot on official TRAIN and DEV only.

This script has no test input argument and never opens test.jsonl. It predicts
the authors' binary factual-revision label from raw sent_a/sent_b only. Outputs
are intentionally confined to the ignored .local-deployment directory.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import heapq
import json
import os
import platform
import re
import sys
import time
import warnings
from collections import Counter
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np
import rapidfuzz
import sklearn
from rapidfuzz.distance import Levenshtein
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, f1_score, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))
from app.services.evolution.text_changes import ALGORITHM_VERSION, analyze_text_change


PILOT_VERSION = "vitaminc-train-dev-pilot-v1"
OFFICIAL_TRAIN_SHA256 = "9ed654d11db34be1918af0abe83df348f462daefbdf1ee6a521ae7682ab3277b"
OFFICIAL_DEV_SHA256 = "fd1e6a3c15d53b7529e5c04533619c1ffa6091435aa6864842fe2f0e47363733"
C_GRID = (0.01, 0.1, 1.0, 10.0)
LABELS = {"not factual": 0, "factual": 1}
WORD_RE = re.compile(r"\b\w+\b", re.UNICODE)
MUTATION_TYPES = (
    "NUMERIC_DRIFT",
    "ENTITY_SUBSTITUTION",
    "POLARITY_SHIFT",
    "HEDGING_SHIFT",
    "ATTRIBUTION_SHIFT",
    "SCOPE_SHIFT",
    "FRAMING_SHIFT",
    "WORDING_DRIFT",
    "NEAR_DUPLICATE",
)
LEXICAL_NAMES = (
    "char_levenshtein_normalized",
    "token_jaccard",
    "len_a_chars",
    "len_b_chars",
    "len_delta_abs",
    "token_insertions",
    "token_deletions",
    "token_replacements",
)
GMEE_NAMES = (
    "gmee_similarity",
    "gmee_meaningful_change",
    "gmee_quantity_equivalent",
    *(f"gmee_has_{kind.lower()}" for kind in MUTATION_TYPES),
    *(f"gmee_count_{kind.lower()}" for kind in MUTATION_TYPES),
    "gmee_changed_span_count",
    "gmee_insert_span_count",
    "gmee_delete_span_count",
    "gmee_replace_span_count",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def page_key(page: str) -> str:
    """Mirror the pre-test release audit's title normalization exactly."""
    return page.strip().replace("_", " ").casefold()


def exact_unordered_pair_key(sent_a: str, sent_b: str) -> str:
    """Hash raw pair bytes in either order; do not normalize sentence text."""
    payload = json.dumps(sorted((sent_a, sent_b)), ensure_ascii=False)
    return sha256_text(payload)


def identity_keys(row: dict[str, str]) -> tuple[str, str, str]:
    return (
        page_key(row["page"]),
        row["wiki_revision_id"],
        exact_unordered_pair_key(row["sent_a"], row["sent_b"]),
    )


def read_rows(path: Path) -> Iterable[dict[str, str]]:
    required = {"case_id", "page", "wiki_revision_id", "sent_a", "sent_b", "label"}
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            try:
                raw = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path.name}:{line_number}: malformed JSON") from exc
            if not isinstance(raw, dict) or not required <= raw.keys():
                raise ValueError(f"{path.name}:{line_number}: missing official flagging fields")
            if any(not isinstance(raw[key], str) for key in required):
                raise ValueError(f"{path.name}:{line_number}: expected string fields")
            if not raw["case_id"] or raw["label"] not in LABELS:
                raise ValueError(f"{path.name}:{line_number}: invalid case ID or label")
            # This is a deliberate allowlist: derived diff fields never reach features.
            yield {key: raw[key] for key in required}


def _rank(seed: int, row: dict[str, str]) -> int:
    return int(sha256_text(f"{seed}:{row['case_id']}")[:16], 16)


def _offer(
    heaps: dict[str, list[tuple[int, str, dict[str, str]]]],
    row: dict[str, str],
    seed: int,
    max_rows: int,
) -> None:
    # Deterministic stratified bottom-k selection avoids one-class tiny pilots.
    factual_cap = (max_rows + 1) // 2
    cap = factual_cap if row["label"] == "factual" else max_rows - factual_cap
    if cap == 0:
        return
    heap = heaps.setdefault(row["label"], [])
    item = (-_rank(seed, row), row["case_id"], row)
    if len(heap) < cap:
        heapq.heappush(heap, item)
    elif item[:2] > heap[0][:2]:
        heapq.heapreplace(heap, item)


def _chosen(heaps: dict[str, list[tuple[int, str, dict[str, str]]]]) -> list[dict[str, str]]:
    return sorted((item[2] for heap in heaps.values() for item in heap), key=lambda r: r["case_id"])


def load_train_dev(
    data_dir: Path, seed: int, max_train: int | None, max_dev: int | None,
) -> tuple[list[dict[str, str]], list[dict[str, str]], dict[str, Any]]:
    train_path, dev_path = data_dir / "train.jsonl", data_dir / "dev.jsonl"
    if not train_path.is_file() or not dev_path.is_file():
        raise ValueError("data directory must contain official train.jsonl and dev.jsonl")
    train_pages: set[str] = set()
    train_revisions: set[str] = set()
    train_pairs: set[str] = set()
    train_seen: set[str] = set()
    train_counts: Counter[str] = Counter()
    train_rows: list[dict[str, str]] = []
    train_heaps: dict[str, list[tuple[int, str, dict[str, str]]]] = {}
    for row in read_rows(train_path):
        case = row["case_id"]
        if case in train_seen:
            raise ValueError(f"duplicate train case_id: {case}")
        train_seen.add(case)
        train_counts[row["label"]] += 1
        page, revision, pair = identity_keys(row)
        train_pages.add(page)
        train_revisions.add(revision)
        train_pairs.add(pair)
        if max_train is None:
            train_rows.append(row)
        else:
            _offer(train_heaps, row, seed, max_train)
    if max_train is not None:
        train_rows = _chosen(train_heaps)

    dev_seen: set[str] = set()
    dev_counts: Counter[str] = Counter()
    clean_counts: Counter[str] = Counter()
    quarantined: list[str] = []
    reasons: Counter[str] = Counter()
    dev_rows: list[dict[str, str]] = []
    dev_heaps: dict[str, list[tuple[int, str, dict[str, str]]]] = {}
    for row in read_rows(dev_path):
        case = row["case_id"]
        if case in dev_seen or case in train_seen:
            raise ValueError(f"duplicate case_id across train/dev: {case}")
        dev_seen.add(case)
        dev_counts[row["label"]] += 1
        page, revision, pair = identity_keys(row)
        hits = (
            ("page", page in train_pages),
            ("wiki_revision_id", revision in train_revisions),
            ("exact_unordered_pair", pair in train_pairs),
        )
        if any(hit for _, hit in hits):
            quarantined.append(case)
            reasons.update(name for name, hit in hits if hit)
            continue
        clean_counts[row["label"]] += 1
        if max_dev is None:
            dev_rows.append(row)
        else:
            _offer(dev_heaps, row, seed, max_dev)
    if max_dev is not None:
        dev_rows = _chosen(dev_heaps)
    train_rows.sort(key=lambda row: row["case_id"])
    dev_rows.sort(key=lambda row: row["case_id"])
    audit = {
        "identity_rule": "normalized page title OR wiki_revision_id OR raw exact unordered sentence pair",
        "quarantine_against": "full official train, even in bounded pilot mode",
        "train_full_counts": dict(sorted(train_counts.items())),
        "dev_full_counts": dict(sorted(dev_counts.items())),
        "dev_clean_counts": dict(sorted(clean_counts.items())),
        "dev_quarantined_count": len(quarantined),
        "dev_quarantine_reasons_nonexclusive": dict(sorted(reasons.items())),
        "dev_quarantined_case_ids_sha256": sha256_text("\n".join(sorted(quarantined))),
        "train_selected_count": len(train_rows),
        "dev_selected_count": len(dev_rows),
        "train_selected_case_ids_sha256": sha256_text("\n".join(r["case_id"] for r in train_rows)),
        "dev_selected_case_ids_sha256": sha256_text("\n".join(r["case_id"] for r in dev_rows)),
    }
    if set(train_counts) != set(LABELS) or set(clean_counts) != set(LABELS):
        raise ValueError("official train and clean dev must both contain both labels")
    if {r["label"] for r in train_rows} != set(LABELS) or {r["label"] for r in dev_rows} != set(LABELS):
        raise ValueError("selected train and dev must each contain both labels; raise bounded limits")
    return train_rows, dev_rows, audit


def _words(text: str) -> list[str]:
    return [word.casefold() for word in WORD_RE.findall(text)]


def feature_vectors(row: dict[str, str]) -> tuple[list[float], list[float]]:
    from difflib import SequenceMatcher

    a, b = row["sent_a"], row["sent_b"]
    a_words, b_words = _words(a), _words(b)
    a_set, b_set = set(a_words), set(b_words)
    union = a_set | b_set
    jaccard = len(a_set & b_set) / len(union) if union else 1.0
    inserted = deleted = replaced = 0
    matcher = SequenceMatcher(a=a_words, b=b_words, autojunk=False)
    for operation, i1, i2, j1, j2 in matcher.get_opcodes():
        if operation == "insert":
            inserted += j2 - j1
        elif operation == "delete":
            deleted += i2 - i1
        elif operation == "replace":
            replaced += max(i2 - i1, j2 - j1)
    lexical = [
        float(Levenshtein.normalized_distance(a, b)),
        jaccard,
        float(len(a)),
        float(len(b)),
        float(abs(len(a) - len(b))),
        float(inserted),
        float(deleted),
        float(replaced),
    ]
    analysis = analyze_text_change(a, b)
    types = Counter(change["mutation_type"] for change in analysis["changes"])
    spans = analysis["changed_spans"]
    span_ops = Counter(span["operation"] for span in spans)
    augmented_only = [
        float(analysis["similarity"]),
        float(analysis["meaningful_change"]),
        float(analysis["quantity_equivalent"]),
        *(float(kind in analysis["mutation_types"]) for kind in MUTATION_TYPES),
        *(float(types[kind]) for kind in MUTATION_TYPES),
        float(len(spans)),
        float(span_ops["insert"]),
        float(span_ops["delete"]),
        float(span_ops["replace"]),
    ]
    if len(lexical) != len(LEXICAL_NAMES) or len(augmented_only) != len(GMEE_NAMES):
        raise RuntimeError("feature declaration and extraction diverged")
    return lexical, augmented_only


def extract_feature_rows(rows: list[dict[str, str]], split: str) -> list[tuple[list[float], list[float]]]:
    vectors = []
    for index, row in enumerate(rows, 1):
        vectors.append(feature_vectors(row))
        if index % 5000 == 0 or index == len(rows):
            print(f"{split} features: {index}/{len(rows)}", flush=True)
    return vectors


def _threshold_from_dev(scores: np.ndarray, gold: np.ndarray) -> dict[str, float]:
    # Predeclared 101-point grid; ties prefer the higher decision threshold.
    choices = [(float(f1_score(gold, scores >= t / 100, average="macro", zero_division=0)), t / 100)
               for t in range(101)]
    macro_f1, threshold = max(choices, key=lambda pair: (pair[0], pair[1]))
    return {"threshold": threshold, "dev_macro_f1": macro_f1}


def fit_model(
    train_x: np.ndarray, train_y: np.ndarray, dev_x: np.ndarray, dev_y: np.ndarray,
    names: tuple[str, ...], seed: int,
) -> tuple[dict[str, Any], np.ndarray]:
    candidates = []
    fit_warnings: dict[str, list[str]] = {}
    for c in C_GRID:
        model = make_pipeline(
            StandardScaler(),
            LogisticRegression(C=c, penalty="l2", solver="liblinear", max_iter=1000, random_state=seed),
        )
        with warnings.catch_warnings(record=True) as captured:
            warnings.simplefilter("always", ConvergenceWarning)
            model.fit(train_x, train_y)
        fit_warnings[str(c)] = [str(item.message) for item in captured if issubclass(item.category, ConvergenceWarning)]
        scores = model.predict_proba(dev_x)[:, 1]
        auc = float(roc_auc_score(dev_y, scores))
        candidates.append((auc, c, model, scores))
    # Smaller C means stronger regularization.
    selected_auc, selected_c, selected_model, selected_scores = max(
        candidates, key=lambda item: (round(item[0], 12), -item[1])
    )
    scaler = selected_model.named_steps["standardscaler"]
    classifier = selected_model.named_steps["logisticregression"]
    threshold = _threshold_from_dev(selected_scores, dev_y)
    state = {
        "feature_names": list(names),
        "estimator": {
            "transform": "StandardScaler fitted on selected train rows",
            "classifier": "LogisticRegression",
            "penalty": "l2",
            "solver": "liblinear",
            "max_iter": 1000,
            "class_weight": None,
            "random_state": seed,
        },
        "selected_C": selected_c,
        "C_grid_dev_auroc": {str(c): auc for auc, c, _, _ in candidates},
        "C_grid_convergence_warnings": fit_warnings,
        "selection": "maximum clean dev AUROC; ties to smaller C",
        "class_order": classifier.classes_.tolist(),
        "standard_scaler_mean": scaler.mean_.tolist(),
        "standard_scaler_scale": scaler.scale_.tolist(),
        "logistic_coefficients": classifier.coef_[0].tolist(),
        "logistic_intercept": float(classifier.intercept_[0]),
        "dev_auroc": selected_auc,
        "dev_average_precision": float(average_precision_score(dev_y, selected_scores)),
        **threshold,
    }
    return state, selected_scores


def predict_from_state(state: dict[str, Any], matrix: np.ndarray) -> np.ndarray:
    """Reconstruct P(factual) from a frozen state for later held-out scoring."""
    values = np.asarray(matrix, dtype=float)
    if values.ndim != 2 or values.shape[1] != len(state["feature_names"]):
        raise ValueError("feature matrix shape does not match saved feature order")
    mean = np.asarray(state["standard_scaler_mean"], dtype=float)
    scale = np.asarray(state["standard_scaler_scale"], dtype=float)
    coefficients = np.asarray(state["logistic_coefficients"], dtype=float)
    logits = ((values - mean) / scale) @ coefficients + state["logistic_intercept"]
    return 1.0 / (1.0 + np.exp(-np.clip(logits, -700, 700)))


def run_pilot(
    data_dir: Path, output_dir: Path, seed: int = 1729,
    max_train: int | None = None, max_dev: int | None = None,
    invocation: list[str] | None = None,
    require_official_hashes: bool = True,
) -> dict[str, Any]:
    wall_start = time.perf_counter()
    allowed = (REPO_ROOT / ".local-deployment").resolve()
    destination = output_dir.resolve()
    if not destination.is_relative_to(allowed):
        raise ValueError("output directory must be under ignored .local-deployment")
    if destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
        raise ValueError("output directory must be new or empty")
    for flag, value in (("max_train", max_train), ("max_dev", max_dev)):
        if value is not None and value < 4:
            raise ValueError(f"{flag} must be at least 4")
    train_hash = sha256_file(data_dir / "train.jsonl")
    dev_hash = sha256_file(data_dir / "dev.jsonl")
    if require_official_hashes and (train_hash != OFFICIAL_TRAIN_SHA256 or dev_hash != OFFICIAL_DEV_SHA256):
        raise ValueError("train/dev bytes differ from the audited official release; refusing pilot")
    train, dev, audit = load_train_dev(data_dir, seed, max_train, max_dev)
    load_seconds = time.perf_counter() - wall_start
    train_vectors = extract_feature_rows(train, "train")
    dev_vectors = extract_feature_rows(dev, "dev")
    feature_seconds = time.perf_counter() - wall_start - load_seconds
    train_y = np.asarray([LABELS[row["label"]] for row in train])
    dev_y = np.asarray([LABELS[row["label"]] for row in dev])
    lexical_train = np.asarray([pair[0] for pair in train_vectors], dtype=float)
    lexical_dev = np.asarray([pair[0] for pair in dev_vectors], dtype=float)
    augmented_train = np.asarray([a + b for a, b in train_vectors], dtype=float)
    augmented_dev = np.asarray([a + b for a, b in dev_vectors], dtype=float)
    models: dict[str, Any] = {}
    scores: dict[str, np.ndarray] = {}
    for name, train_x, dev_x, features in (
        ("lexical", lexical_train, lexical_dev, LEXICAL_NAMES),
        ("gmee_augmented", augmented_train, augmented_dev, LEXICAL_NAMES + GMEE_NAMES),
    ):
        models[name], scores[name] = fit_model(train_x, train_y, dev_x, dev_y, features, seed)
    fit_seconds = time.perf_counter() - wall_start - load_seconds - feature_seconds
    if sha256_file(data_dir / "train.jsonl") != train_hash or sha256_file(data_dir / "dev.jsonl") != dev_hash:
        raise ValueError("train/dev bytes changed during pilot; refusing artifacts")

    destination.mkdir(parents=True, exist_ok=True)
    models_path = destination / "models.json"
    models_path.write_text(json.dumps(models, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    prediction_path = destination / "dev_predictions.csv"
    with prediction_path.open("w", encoding="utf-8", newline="") as stream:
        columns = ["case_id", "page_sha256", "wiki_revision_id", "input_pair_sha256", "gold_label",
                   "lexical_score", "gmee_augmented_score", "lexical_predicted", "gmee_augmented_predicted"]
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        for i, row in enumerate(dev):
            writer.writerow({
                "case_id": row["case_id"],
                "page_sha256": sha256_text(page_key(row["page"])),
                "wiki_revision_id": row["wiki_revision_id"],
                "input_pair_sha256": exact_unordered_pair_key(row["sent_a"], row["sent_b"]),
                "gold_label": row["label"],
                "lexical_score": float(scores["lexical"][i]),
                "gmee_augmented_score": float(scores["gmee_augmented"][i]),
                "lexical_predicted": int(scores["lexical"][i] >= models["lexical"]["threshold"]),
                "gmee_augmented_predicted": int(scores["gmee_augmented"][i] >= models["gmee_augmented"]["threshold"]),
            })
    manifest = {
        "pilot_version": PILOT_VERSION,
        "status": "exploratory_train_dev_only",
        "warning": "Development-set results are exploratory and selected on dev. No test file, label, or outcome was read or scored by this script. Do not report these as held-out paper results.",
        "dataset_task": "VitaminC real Wikipedia factual-revision flagging",
        "model_inputs": ["sent_a", "sent_b"],
        "seed": seed,
        "max_train": max_train,
        "max_dev": max_dev,
        "sampling": "deterministic case-id-hash bottom-k within each label when bounded",
        "invocation_argv": invocation,
        "hardware_os": {
            "platform": platform.platform(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "logical_cpu_count": os.cpu_count(),
        },
        "wall_seconds": {
            "load_and_quarantine": load_seconds,
            "feature_extraction": feature_seconds,
            "model_fit_and_dev_selection": fit_seconds,
            "total_before_manifest": time.perf_counter() - wall_start,
        },
        "C_grid": list(C_GRID),
        "dev_operating_threshold": "maximum macro-F1 over 0.00..1.00 by 0.01; ties prefer higher threshold",
        "source_sha256": {
            "train_jsonl": train_hash,
            "dev_jsonl": dev_hash,
            "pilot_script": sha256_file(Path(__file__)),
            "text_changes": sha256_file(REPO_ROOT / "backend/app/services/evolution/text_changes.py"),
            "quantities": sha256_file(REPO_ROOT / "backend/app/services/evolution/quantities.py"),
        },
        "versions": {
            "python": sys.version.split()[0],
            "numpy": np.__version__,
            "scikit_learn": sklearn.__version__,
            "rapidfuzz": rapidfuzz.__version__,
            "gmee_analyzer": ALGORITHM_VERSION,
        },
        "audit": audit,
        "model_state_sha256": sha256_file(models_path),
        "dev_predictions_sha256": sha256_file(prediction_path),
    }
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, required=True, help="extracted official vitaminc_flagging directory")
    parser.add_argument("--output-dir", type=Path, required=True, help="new/empty path under .local-deployment")
    parser.add_argument("--seed", type=int, default=1729)
    parser.add_argument("--max-train", type=int)
    parser.add_argument("--max-dev", type=int)
    args = parser.parse_args(argv)
    try:
        manifest = run_pilot(args.data_dir, args.output_dir, args.seed, args.max_train, args.max_dev,
                             invocation=[str(Path(__file__).resolve()), *(argv if argv is not None else sys.argv[1:])])
    except (ValueError, OSError) as exc:
        print(f"REFUSED: {exc}", file=sys.stderr)
        return 2
    print(manifest["warning"])
    print(f"Pilot artifacts: {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
