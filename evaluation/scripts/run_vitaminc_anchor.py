"""Pinned author checkpoint: dev timing and separately frozen supplementary test.

This addition follows the primary test result. It uses no labels for inference.
All source/model/input hashes are checked before opening test input records.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import shutil
import time
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "evaluation/config/vitaminc_anchor.json"
PLAN = ROOT / "docs/VITAMINC_ANCHOR_SUPPLEMENT.md"


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1048576), b""):
            h.update(block)
    return h.hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8")


def destination(path):
    path = path.resolve()
    if not path.is_relative_to((ROOT / ".local-deployment").resolve()) or path.exists():
        raise ValueError("Use a new output path inside ignored .local-deployment")
    return path


def setup(model_dir, config):
    import torch
    import transformers
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    for name, h in config["model_files_sha256"].items():
        if sha(model_dir / name) != h:
            raise ValueError(f"Checkpoint file mismatch: {name}")
    actual = dict(python=platform.python_version(), torch=torch.__version__, transformers=transformers.__version__)
    for name in actual:
        if actual[name] != config["runtime"][name]:
            raise ValueError(f"Runtime differs from fixed config: {name}")
    if not torch.cuda.is_available():
        raise ValueError("Fixed CUDA runtime unavailable; do not silently change precision/device")
    torch.set_num_threads(config["torch_num_threads"])
    torch.backends.cuda.matmul.allow_tf32 = False
    torch.backends.cudnn.allow_tf32 = False
    start = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir, local_files_only=True)
    if [model.config.id2label[i] for i in (0, 1)] != config["label_order"]:
        raise ValueError("Model class mapping differs from authors' task")
    if (type(tokenizer).__name__ != config["runtime"]["tokenizer_class"] or
        type(model).__name__ != config["runtime"]["model_class"]):
        raise ValueError("Wrong model/tokenizer class")
    model = model.float().to(config["device"]).eval()
    torch.cuda.synchronize()
    metadata = dict(runtime=actual, gpu=torch.cuda.get_device_name(),
                    platform=platform.platform(), load_seconds=time.perf_counter() - start)
    return tokenizer, model, metadata


def forward(tokenizer, model, batch, config):
    import torch
    features = tokenizer([(r["sent_a"], r["sent_b"]) for r in batch],
        max_length=config["max_seq_length"], padding=config["padding"],
        truncation=config["truncation"], return_tensors="pt")
    features = {k: v.to(config["device"]) for k, v in features.items()}
    with torch.inference_mode():
        probabilities = torch.softmax(model(**features).logits, dim=1)[:, 1]
    return probabilities.cpu().tolist()


def infer(rows, output, model_dir, config):
    import torch
    tokenizer, model, metadata = setup(model_dir, config)
    forward(tokenizer, model, rows[:config["batch_size"]], config)
    torch.cuda.synchronize()
    torch.cuda.reset_peak_memory_stats()
    start = time.perf_counter()
    count_long = 0
    max_tokens = 0
    path = output / "anchor_predictions.jsonl"
    with path.open("x", encoding="utf-8", newline="\n") as f:
        for start_i in range(0, len(rows), config["batch_size"]):
            batch = rows[start_i:start_i + config["batch_size"]]
            lengths = [len(tokenizer(r["sent_a"], r["sent_b"], truncation=False, padding=False)["input_ids"])
                       for r in batch]
            count_long += sum(n > config["max_seq_length"] for n in lengths)
            max_tokens = max(max_tokens, max(lengths))
            p = forward(tokenizer, model, batch, config)
            for r, score, length in zip(batch, p, lengths):
                if not 0 <= score <= 1:
                    raise ValueError("Invalid probability")
                f.write(json.dumps(dict(case_id=r["case_id"], factual_probability=score,
                    primary_eligible=r.get("primary_eligible"), untruncated_tokens=length)) + "\n")
            if start_i % 1024 == 0:
                print(f"Anchor inferred {min(start_i + len(batch), len(rows))}/{len(rows)}", flush=True)
    torch.cuda.synchronize()
    metadata.update(rows=len(rows), inference_seconds=time.perf_counter()-start,
        peak_cuda_allocated_bytes=torch.cuda.max_memory_allocated(),
        input_pairs_truncated=count_long, maximum_untruncated_tokens=max_tokens,
        predictions_sha256=sha(path), config=config)
    return metadata


def primary_info(primary_dir):
    report = json.loads((primary_dir / "results.json").read_text(encoding="utf-8"))
    predictions = primary_dir / "test_predictions.jsonl"
    if sha(predictions) != report["predictions_sha256"]:
        raise ValueError("Primary predictions do not match report")
    return dict(primary_results_sha256=sha(primary_dir / "results.json"),
                primary_predictions_sha256=sha(predictions), original_lock_sha256=report["local_lock_sha256"])


def source_hashes():
    return {str(p.relative_to(ROOT)).replace("\\", "/"): sha(p) for p in (Path(__file__), CONFIG, PLAN)}


def pilot(data_dir, model_dir, output_dir):
    output = destination(output_dir)
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    cpu_csv = ROOT / ".local-deployment/research-data/vitaminc/anchor_pilot/pilot_100_dev_probabilities.csv"
    with cpu_csv.open(encoding="utf-8", newline="") as f:
        cpu = list(csv.DictReader(f))
    ids = [r["case_id"] for r in cpu]
    wanted = set(ids)
    found = {}
    with (data_dir / "dev.jsonl").open(encoding="utf-8") as f:
        for line in f:
            raw = json.loads(line)
            if raw["case_id"] in wanted:
                found[raw["case_id"]] = {k: raw[k] for k in ("case_id", "sent_a", "sent_b")}
    if set(found) != wanted or len(ids) != 100:
        raise ValueError("Dev timing sample differs from CPU pilot")
    output.mkdir(parents=True)
    metadata = infer([found[i] for i in ids], output, model_dir, config)
    gpu = [json.loads(line) for line in (output / "anchor_predictions.jsonl").open(encoding="utf-8")]
    metadata.update(status="dev_timing_only_no_test_access", cpu_reference_sha256=sha(cpu_csv),
                    max_absolute_probability_difference_vs_cpu=max(
                        abs(g["factual_probability"] - float(c["prob_factual"])) for g, c in zip(gpu, cpu)))
    write(output / "pilot.json", metadata)
    return metadata


def freeze(data_dir, model_dir, primary_dir, output_dir):
    output = destination(output_dir)
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    for file, h in config["model_files_sha256"].items():
        if sha(model_dir / file) != h:
            raise ValueError("Checkpoint differs from recipe")
    primary = primary_info(primary_dir)
    test_hash = sha(data_dir / "test.jsonl")
    if test_hash != "0e1094b357d72716febc75ebccf24581b558d0a3e6ae69c23d23f892aeed3a3a":
        raise ValueError("Test data differs from audited release")
    output.mkdir(parents=True)
    for name in source_hashes():
        target = output / "source" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    lock = dict(schema="vitaminc-anchor-supplement-v1", created_utc=datetime.now(UTC).isoformat(),
        status="supplementary_after_primary_result_not_confirmatory", sources_sha256=source_hashes(),
        config=config, test_sha256=test_hash, **primary)
    write(output / "lock.json", lock)
    return dict(lock_sha256=sha(output / "lock.json"), **lock)


def predict(data_dir, model_dir, primary_dir, frozen_dir, output_dir):
    output = destination(output_dir)
    lock = json.loads((frozen_dir / "lock.json").read_text(encoding="utf-8"))
    if lock["sources_sha256"] != source_hashes():
        raise ValueError("Supplement source/config/plan changed")
    for path, h in lock["sources_sha256"].items():
        if sha(frozen_dir / "source" / path) != h:
            raise ValueError("Supplement archive changed")
    primary = primary_info(primary_dir)
    if any(lock[k] != v for k, v in primary.items()) or sha(data_dir / "test.jsonl") != lock["test_sha256"]:
        raise ValueError("Input artifacts changed")
    with (frozen_dir / "TEST_ACCESS_STARTED.json").open("x", encoding="utf-8") as f:
        json.dump(dict(utc=datetime.now(UTC).isoformat(), output=str(output)), f)
    output.mkdir(parents=True)
    eligible = {}
    with (primary_dir / "test_predictions.jsonl").open(encoding="utf-8") as f:
        for line in f:
            raw = json.loads(line)
            eligible[raw["case_id"]] = raw["primary_eligible"]
    rows = []
    with (data_dir / "test.jsonl").open(encoding="utf-8") as f:
        for line in f:
            raw = json.loads(line)
            r = {key: raw[key] for key in ("case_id", "sent_a", "sent_b")}
            r["primary_eligible"] = eligible[r["case_id"]]
            rows.append(r)
    if len(rows) != 31048 or len({r["case_id"] for r in rows}) != 31048 or set(eligible) != {r["case_id"] for r in rows}:
        raise ValueError("Rows do not match primary comparison")
    metadata = infer(rows, output, model_dir, lock["config"])
    metadata.update(status=lock["status"], supplement_lock_sha256=sha(frozen_dir / "lock.json"), **primary)
    write(output / "manifest.json", metadata)
    return metadata


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=["pilot", "freeze", "predict"])
    for name in ("data-dir", "model-dir", "output-dir"):
        p.add_argument("--" + name, type=Path, required=True)
    p.add_argument("--primary-dir", type=Path)
    p.add_argument("--frozen-dir", type=Path)
    a = p.parse_args()
    if a.command == "pilot":
        result = pilot(a.data_dir, a.model_dir, a.output_dir)
    elif a.command == "freeze":
        result = freeze(a.data_dir, a.model_dir, a.primary_dir, a.output_dir)
    else:
        result = predict(a.data_dir, a.model_dir, a.primary_dir, a.frozen_dir, a.output_dir)
    print(json.dumps(result, indent=2))
