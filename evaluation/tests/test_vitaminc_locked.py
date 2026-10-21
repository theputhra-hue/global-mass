import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import run_vitaminc_locked as locked


class LockedEvaluationTests(unittest.TestCase):
    def test_serialized_state_matches_sklearn_probability(self):
        # Unequal means/scales and an intercept expose missing transforms.
        x = np.array([[2, 50], [3, 90], [8, 15], [7, 22], [1, 100], [9, 30]], dtype=float)
        y = [0, 0, 1, 1, 0, 1]
        model = make_pipeline(StandardScaler(), LogisticRegression(C=.1, solver="liblinear"))
        model.fit(x, y)
        scaler, clf = model.named_steps["standardscaler"], model.named_steps["logisticregression"]
        state = {"feature_names": ["a", "b"], "class_order": clf.classes_.tolist(),
                 "standard_scaler_mean": scaler.mean_.tolist(), "standard_scaler_scale": scaler.scale_.tolist(),
                 "logistic_coefficients": clf.coef_[0].tolist(), "logistic_intercept": float(clf.intercept_[0])}
        held = np.array([[1, 65], [6, 30], [10, 9]], dtype=float)
        np.testing.assert_allclose(locked.frozen_probabilities(state, held, ("a", "b")),
                                   model.predict_proba(held)[:, 1], atol=1e-14)
        with self.assertRaises(ValueError):
            locked.frozen_probabilities(state, held, ("b", "a"))
        state["class_order"] = [1, 0]
        with self.assertRaises(ValueError):
            locked.frozen_probabilities(state, held, ("a", "b"))

    def test_input_only_reader_accepts_absent_labels(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "unlabeled.jsonl"
            row = dict(case_id="1", page=" Page_Name ", wiki_revision_id="17", sent_a="", sent_b="Added")
            path.write_text(json.dumps(row) + "\n", encoding="utf-8")
            result = list(locked.input_rows(path))
            self.assertEqual(result, [row])
            keys = ({"page name"}, set(), set())
            self.assertEqual(locked.quarantine_reason(result[0], keys), ["page"])

    def test_input_group_diagnostics_requires_only_input_fields(self):
        rows = [
            {"case_id": "a", "page": "Page One", "wiki_revision_id": "r1", "sent_a": "A", "sent_b": "B"},
            {"case_id": "b", "page": "Page One", "wiki_revision_id": "r2", "sent_a": "C", "sent_b": "D"},
            {"case_id": "c", "page": "Page Two", "wiki_revision_id": "r3", "sent_a": "E", "sent_b": "F"},
        ]
        diagnostics = locked.input_group_diagnostics(rows)
        self.assertEqual(diagnostics["component_count"], 2)
        self.assertEqual(diagnostics["largest_component_rows"], 2)
        self.assertEqual(diagnostics["rows_in_nontrivial_components"], 2)
        self.assertIn("normalized page-title hash", diagnostics["grouping_rule"])

    def test_tampered_model_fails_before_test_access(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            data = root / "data"
            data.mkdir()
            (data / "test.jsonl").write_text("opaque bytes", encoding="utf-8")
            for name in ("fit_models.json", "analysis_plan.md", "fit_dev_predictions.csv"):
                (root / name).write_text("original", encoding="utf-8")
            locked.dump(root / "fit_manifest.json", {
                "dev_predictions_sha256": locked.sha256_file(root / "fit_dev_predictions.csv")})
            lock = {"schema": "vitaminc-local-analysis-freeze-v1", "sources_sha256": {},
                    "runtime_versions": locked.runtime_versions(),
                    "data_sha256": {"test.jsonl": locked.sha256_file(data / "test.jsonl")},
                    "models_sha256": locked.sha256_file(root / "fit_models.json"),
                    "fit_manifest_sha256": locked.sha256_file(root / "fit_manifest.json"),
                    "protocol_sha256": locked.sha256_file(root / "analysis_plan.md")}
            locked.dump(root / "lock.json", lock)
            self.assertEqual(locked.validate_lock(data, root), lock)
            (root / "fit_models.json").write_text("changed", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Frozen artifact changed"):
                locked.validate_lock(data, root)
            self.assertFalse((root / "TEST_ACCESS_STARTED.json").exists())

    def test_repeat_score_refused_before_parsing_data(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / "TEST_ACCESS_STARTED.json").write_text("previous attempt", encoding="utf-8")
            with patch.object(locked, "ignored_destination", return_value=root / "new-output"), \
                 patch.object(locked, "validate_lock", return_value={}):
                with self.assertRaises(FileExistsError):
                    locked.score(root / "missing-data", root, root / "new-output")
            self.assertFalse((root / "new-output").exists())


if __name__ == "__main__":
    unittest.main()
