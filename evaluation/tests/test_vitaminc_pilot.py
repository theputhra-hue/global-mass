"""Small synthetic checks for the train/dev-only VitaminC pilot."""

import csv
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import f1_score

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))
import run_vitaminc_pilot as pilot


def _row(case, page, revision, a, b, label):
    return {
        "case_id": case,
        "page": page,
        "wiki_revision_id": revision,
        "sent_a": a,
        "sent_b": b,
        "label": label,
        "diff_viz": "POISONED: should not be read as a feature",
        "sent_a_diff": "POISONED",
        "sent_b_diff": "POISONED",
    }


def _write(path, rows):
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")


def _synthetic_dataset(data_dir):
    data_dir.mkdir()
    train = [
        _row("t1", "Page One", "1", "The tally was 20.", "The tally was 30.", "factual"),
        _row("t2", "Page Two", "2", "Mira joined in 2010.", "Mira joined in 2012.", "factual"),
        _row("t3", "Page Three", "3", "The hall opened Monday.", "The hall opened Tuesday.", "factual"),
        _row("t4", "Page Four", "4", "A won the race.", "B won the race.", "not factual"),
        _row("t5", "Page Five", "5", "The town is very large.", "The town is large.", "not factual"),
        _row("t6", "Page Six", "6", "The museum reopened.", "The museum has reopened.", "not factual"),
    ]
    dev = [
        _row("d1", "Page_One", "71", "Other first.", "Other second.", "factual"),
        _row("d2", "New Page", "2", "Another first.", "Another second.", "not factual"),
        _row("d3", "Other Page", "73", "The tally was 30.", "The tally was 20.", "factual"),
        _row("d4", "Clean Four", "74", "The cost is 5 dollars.", "The cost is 8 dollars.", "factual"),
        _row("d5", "Clean Five", "75", "", "A fresh claim was added.", "factual"),
        _row("d6", "Clean Six", "76", "The report was quick.", "The report was speedy.", "not factual"),
        _row("d7", "Clean Seven", "77", "It was located there.", "It was situated there.", "not factual"),
    ]
    _write(data_dir / "train.jsonl", train)
    _write(data_dir / "dev.jsonl", dev)
    # If the pilot ever opens test.jsonl this deliberately malformed file fails.
    (data_dir / "test.jsonl").write_text("THIS MUST NEVER BE PARSED\n", encoding="utf-8")
    return train, dev


def test_raw_pair_identity_and_bounded_quarantine_uses_full_train(tmp_path):
    data_dir = tmp_path / "data"
    _synthetic_dataset(data_dir)
    assert pilot.exact_unordered_pair_key("A", "B") == pilot.exact_unordered_pair_key("B", "A")
    assert pilot.exact_unordered_pair_key("A", "B") != pilot.exact_unordered_pair_key("a", "B")
    train, dev, audit = pilot.load_train_dev(data_dir, seed=1729, max_train=4, max_dev=4)
    assert len(train) == 4 and len(dev) == 4
    assert audit["dev_quarantined_count"] == 3
    assert audit["dev_quarantine_reasons_nonexclusive"] == {
        "exact_unordered_pair": 1,
        "page": 1,
        "wiki_revision_id": 1,
    }
    assert {row["case_id"] for row in dev} == {"d4", "d5", "d6", "d7"}
    assert any(not row["sent_a"] for row in dev)  # deletion/addition remains eligible


def test_feature_extraction_ignores_released_diff_fields():
    row = _row("x", "P", "1", "The route was 1 km.", "The route was 1000 m.", "not factual")
    before = pilot.feature_vectors(row)
    row["diff_viz"] = "factual label leaked"
    row["sent_a_diff"] = row["sent_b_diff"] = "factual factual"
    assert pilot.feature_vectors(row) == before
    assert len(before[0]) == len(pilot.LEXICAL_NAMES)
    assert len(before[1]) == len(pilot.GMEE_NAMES)
    assert before[1][2] == 1.0  # frozen analyzer's quantity equivalence indicator


def test_dev_threshold_reproduces_reported_macro_f1():
    scores = np.array([0.04, 0.25, 0.62, 0.91])
    gold = np.array([0, 1, 0, 1])
    chosen = pilot._threshold_from_dev(scores, gold)
    observed = f1_score(gold, scores >= chosen["threshold"], average="macro", zero_division=0)
    assert observed == chosen["dev_macro_f1"]
    assert 0 <= chosen["threshold"] <= 1


def test_pilot_writes_reproducible_train_dev_artifacts_without_test(tmp_path, monkeypatch):
    original_root = pilot.REPO_ROOT
    data_dir = tmp_path / "data"
    _synthetic_dataset(data_dir)
    for relative in (
        "backend/app/services/evolution/text_changes.py",
        "backend/app/services/evolution/quantities.py",
    ):
        source = original_root / relative
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    monkeypatch.setattr(pilot, "REPO_ROOT", tmp_path)
    output = tmp_path / ".local-deployment" / "pilot-run"
    manifest = pilot.run_pilot(data_dir, output, max_train=4, max_dev=4,
                               invocation=["synthetic-test"], require_official_hashes=False)
    assert manifest["status"] == "exploratory_train_dev_only"
    assert set(manifest["source_sha256"]) == {
        "train_jsonl", "dev_jsonl", "pilot_script", "text_changes", "quantities"
    }
    assert manifest["audit"]["dev_quarantined_count"] == 3
    assert manifest["invocation_argv"] == ["synthetic-test"]
    assert "test" not in manifest["source_sha256"]
    states = json.loads((output / "models.json").read_text())
    assert set(states) == {"lexical", "gmee_augmented"}
    with (output / "dev_predictions.csv").open(newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 4
    assert {row["case_id"] for row in rows} == {"d4", "d5", "d6", "d7"}
    assert all("sent_a" not in row and "sent_b" not in row for row in rows)
    _, dev, _ = pilot.load_train_dev(data_dir, seed=1729, max_train=4, max_dev=4)
    features = [pilot.feature_vectors(row) for row in dev]
    for name, vectors in (
        ("lexical", np.array([a for a, _ in features])),
        ("gmee_augmented", np.array([a + b for a, b in features])),
    ):
        reconstructed = pilot.predict_from_state(states[name], vectors)
        assert np.allclose(reconstructed, [float(row[f"{name}_score"]) for row in rows])
        gold = np.array([pilot.LABELS[row["gold_label"]] for row in rows])
        observed = f1_score(gold, reconstructed >= states[name]["threshold"], average="macro", zero_division=0)
        assert observed == states[name]["dev_macro_f1"]

