"""Compare trusted local original/reconstructed artifacts without running models.

No row identifiers or text are emitted. Joblib inputs must be trusted local
artifacts; do not use this verifier on untrusted downloaded serialized models.
Acceptance criteria are in docs/VITAMINC_RECONSTRUCTION_PLAN_V1.md.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np

CPU_TOL = 1e-10
GPU_TOL = 1e-6
ORIGINAL = {
    "primary_fit": "vitaminc-pilot-full-train-dev-linux-20261019",
    "primary_lock": "vitaminc-lock-v1-20261019",
    "primary": "vitaminc-score-v1-20261019",
    "sparse_fit": "vitaminc-sparse-fit-v1", "sparse": "vitaminc-sparse-score-v1",
    "anchor_lock": "vitaminc-anchor-lock-v1", "anchor": "vitaminc-anchor-score-v1",
    "mechanism_fit": "vitaminc-mechanism-fit-v1", "mechanism": "vitaminc-mechanism-score-v1",
}
FRESH = {k: "repro-01-" + k.replace("_", "-") +
         ("" if k.endswith(("_fit", "_lock")) else "-score") for k in ORIGINAL}
ORIGINAL_PINS = {
    ("primary_lock", "lock.json"): "b7f1e136e8b1238d3fe41908e45f6b9115d924bbd128aa258d0189d945446e0b",
    ("sparse_fit", "lock.json"): "8fda206c919c1108df8c7dd60983bf0fce198f0431b24d7572b86f022dad2dbf",
    ("anchor_lock", "lock.json"): "c91d745f0efae61f83ce48d66efc25a43835cb1935cf246b8ad58bc468b252fe",
    ("mechanism_fit", "lock.json"): "b0094d747787768135cf5c1707ea92a690e9d17a55dadb4e501efd219fc41d71",
    ("primary", "results.json"): "15e18b6290e6bccc71a83f3fdde4f9f93a6732964ed7a6498ec5a20260b718fd",
    ("sparse", "results.json"): "29bb3d50f0621c3e38ad23206ec75c4ece827d3fca32e78dd3d53dfe8cdb0a03",
    ("anchor", "results.json"): "90faaf3520ce9e9b701c7c46b59d40db0408f333fe5b9ddc70d84a49d87f63fb",
    ("mechanism", "results.json"): "f44bb6bc4a16f3fe081ad07c36e62d0e0ba45e70675f0d6fb194492c9beee300",
}
ADAPTER = "evaluation/scripts/reconstruct_vitaminc_mechanism.py"
ADAPTER_SHA256 = "60012a36ca8beb03be2b07ec42543f499835f800abe72b14eb267a6ce80dd4d8"
CSV_HEADERS = {
    "primary_fit_dev": ["case_id", "page_sha256", "wiki_revision_id",
                        "input_pair_sha256", "gold_label", "lexical_score",
                        "gmee_augmented_score", "lexical_predicted",
                        "gmee_augmented_predicted"],
    "sparse_fit_dev": ["case_id", "gold_label", "sparse_score"],
    "mechanism_fit_dev": ["case_id", "gold_label", "A_score", "B_score",
                          "C_score", "D_score"],
}


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1048576), b""):
            digest.update(block)
    return digest.hexdigest()


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def exact_equal(a, b):
    """Keep Boolean eligibility distinct from integer 0/1 in metadata."""
    if type(a) is not type(b):
        return False
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(exact_equal(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return len(a) == len(b) and all(exact_equal(x, y) for x, y in zip(a, b))
    return a == b


class Comparison:
    def __init__(self):
        self.failures = []
        self.max_errors = {}
        self.hashes = {}
        self.checks = 0

    def check(self, condition, name):
        self.checks += 1
        if not condition:
            self.failures.append(name)

    def record_error(self, name, error):
        # Nonfinite mismatches must still produce a valid JSON failure receipt.
        if not math.isfinite(error) or self.max_errors.get(name, 0) is None:
            self.max_errors[name] = None
        else:
            self.max_errors[name] = max(self.max_errors.get(name, 0), error)

    def compare(self, a, b, name, tolerance=CPU_TOL):
        """Never print values: these may include local row/group identities."""
        if name.rsplit("/", 1)[-1] in ("threshold", "selected_C", "decision_threshold"):
            tolerance = 0
        if isinstance(a, dict) and isinstance(b, dict):
            self.check(a.keys() == b.keys(), name + ":keys")
            for k in a.keys() & b.keys():
                self.compare(a[k], b[k], name + "/" + k,
                             0 if k in ("threshold", "selected_C") else tolerance)
        elif isinstance(a, list) and isinstance(b, list):
            self.check(len(a) == len(b), name + ":length")
            for i, (x, y) in enumerate(zip(a, b)):
                self.compare(x, y, name + "/" + str(i), tolerance)
        elif isinstance(a, float) or isinstance(b, float):
            valid = (isinstance(a, (int, float)) and isinstance(b, (int, float))
                     and math.isfinite(a) and math.isfinite(b))
            error = abs(a - b) if valid else float("inf")
            group = "/".join(name.split("/")[:2])
            self.record_error(group, error)
            self.check(valid and error <= tolerance, name + ":numeric")
        else:
            self.check(type(a) is type(b) and a == b, name + ":exact")

    def array(self, a, b, name, tolerance=CPU_TOL):
        a, b = np.asarray(a), np.asarray(b)
        same = a.shape == b.shape
        self.check(same, name + ":shape")
        if same:
            error = float(np.max(np.abs(a - b), initial=0))
            self.record_error(name, error)
            self.check(math.isfinite(error) and error <= tolerance, name + ":numeric")

    def bind(self, path, digest, name):
        actual = sha(path)
        self.hashes[name] = actual
        self.check(actual == digest, name + ":hash")

    def rows(self, old, new, name, scores, tolerance=CPU_TOL, thresholds=None):
        def load(path, label):
            with path.open(encoding="utf-8", newline="") as stream:
                if path.suffix == ".csv":
                    reader = csv.DictReader(stream)
                    self.check(reader.fieldnames == CSV_HEADERS[name],
                               name + "/" + label + ":csv_header")
                    rows = list(reader)
                    for row in rows:
                        for key in scores:
                            row[key] = float(row[key])
                    return rows
                return [json.loads(line) for line in stream]
        a, b = load(old, "original"), load(new, "fresh")
        self.check(len(a) == len(b), name + ":row_count")
        self.check(len({r["case_id"] for r in a}) == len(a), name + ":original_unique")
        self.check(len({r["case_id"] for r in b}) == len(b), name + ":fresh_unique")
        errors = {k: 0.0 for k in scores}
        exact = True
        finite = True
        classifications = {k: True for k in scores}
        for x, y in zip(a, b):
            exact &= exact_equal({k: v for k, v in x.items() if k not in scores},
                                 {k: v for k, v in y.items() if k not in scores})
            for key in scores:
                v, w = x[key], y[key]
                finite &= math.isfinite(v) and math.isfinite(w)
                error = abs(v - w) if math.isfinite(v) and math.isfinite(w) else float("inf")
                errors[key] = max(errors[key], error)
                if thresholds is not None:
                    classifications[key] &= (v >= thresholds[key]) == (w >= thresholds[key])
        self.check(exact, name + ":ordered_identity_labels_eligibility_metadata")
        self.check(finite, name + ":finite")
        for key, error in errors.items():
            self.record_error(name + "/" + key, error)
            self.check(math.isfinite(error) and error <= tolerance,
                       name + "/" + key + ":probability")
            if thresholds is not None:
                self.check(classifications[key], name + "/" + key + ":classification")
        old_hash, new_hash = sha(old), sha(new)
        self.hashes[name] = {
            "original": old_hash, "fresh": new_hash,
            "byte_identical": old_hash == new_hash, "rows": len(b),
        }


def check_mechanism_adapter(c, original, fresh, primary_digest, sparse_digest):
    """Only the disclosed adapter metadata/source may differ from the recipe."""
    base_config = {k: v for k, v in fresh["config"].items() if k != "reconstruction"}
    c.compare(original["config"], base_config, "mechanism_fit/base_config", 0)
    expected = dict(adapter=ADAPTER,
                    expected_primary_lock_sha256=primary_digest,
                    expected_sparse_lock_sha256=sparse_digest,
                    scope="New artifact reconstruction; not the historical original run")
    c.compare(expected, fresh["config"].get("reconstruction"),
              "mechanism_fit/reconstruction")
    c.compare({**original["sources_sha256"], ADAPTER: ADAPTER_SHA256},
              fresh["sources_sha256"], "mechanism_fit/expected_sources")
    c.check(fresh["status"] == "exploratory_fresh_artifact_reconstruction_not_original_evidence",
            "mechanism_fit:reconstruction_status")


def bind_internal_chain(c, dirs, reports, label):
    """Bind the consumed model copies, predecessor artifacts, and anchor manifest."""
    primary = read(dirs["primary_lock"] / "lock.json")
    fit = read(dirs["primary_fit"] / "manifest.json")
    for filename, field in (("models.json", "models_sha256"),
                            ("manifest.json", "fit_manifest_sha256")):
        c.bind(dirs["primary_fit"] / filename, primary[field], label + "/fit/" + filename)
        c.bind(dirs["primary_lock"] / ("fit_" + filename), primary[field],
               label + "/locked_fit/" + filename)
    c.bind(dirs["primary_fit"] / "models.json", fit["model_state_sha256"],
           label + "/fit_manifest_models")
    for path in (dirs["primary_fit"] / "dev_predictions.csv",
                 dirs["primary_lock"] / "fit_dev_predictions.csv"):
        c.bind(path, fit["dev_predictions_sha256"],
               label + "/fit_dev/" + path.parent.name)
    c.bind(dirs["primary_lock"] / "analysis_plan.md", primary["protocol_sha256"],
           label + "/locked_plan")

    sparse = read(dirs["sparse_fit"] / "lock.json")
    c.bind(dirs["sparse_fit"] / "pipeline.joblib", sparse["pipeline_sha256"],
           label + "/sparse_pipeline")
    c.bind(dirs["sparse_fit"] / "dev_predictions.csv", sparse["dev_predictions_sha256"],
           label + "/sparse_dev")
    predecessor = {
        "primary_results_sha256": dirs["primary"] / "results.json",
        "primary_predictions_sha256": dirs["primary"] / "test_predictions.jsonl",
        "original_lock_sha256": dirs["primary_lock"] / "lock.json",
    }
    anchor_lock = read(dirs["anchor_lock"] / "lock.json")
    manifest = read(dirs["anchor"] / "manifest.json")
    c.bind(dirs["anchor"] / "manifest.json", reports["anchor"]["manifest_sha256"],
           label + "/anchor_manifest")
    for field, path in predecessor.items():
        for stage, metadata in (("anchor_lock", anchor_lock), ("anchor_manifest", manifest),
                                ("anchor_results", reports["anchor"])):
            c.bind(path, metadata[field], label + "/" + stage + "/" + field)
        if field in sparse:
            c.bind(path, sparse[field], label + "/sparse/" + field)
    c.compare(anchor_lock["config"], manifest["config"], label + "/anchor_manifest_config", 0)
    runtime = anchor_lock["config"]["runtime"]
    c.compare({k: runtime[k] for k in ("python", "torch", "transformers")},
              manifest["runtime"], label + "/anchor_manifest_runtime", 0)
    c.bind(dirs["anchor_lock"] / "lock.json", manifest["supplement_lock_sha256"],
           label + "/anchor_manifest_lock")
    c.bind(dirs["anchor"] / "anchor_predictions.jsonl", manifest["predictions_sha256"],
           label + "/anchor_manifest_predictions")

    mechanism = read(dirs["mechanism_fit"] / "lock.json")
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
    c.check(paths.keys() == mechanism["previous_artifacts_sha256"].keys(),
            label + "/mechanism:predecessor_keys")
    for name, path in paths.items():
        c.bind(path, mechanism["previous_artifacts_sha256"][name],
               label + "/mechanism_predecessor/" + name)
    for filename, key in (("models.joblib", "models_sha256"),
                           ("dev_predictions.csv", "dev_predictions_sha256")):
        c.bind(dirs["mechanism_fit"] / filename, mechanism[key],
               label + "/mechanism/" + filename)


def verify(original_root, fresh_root, data_dir, model_dir, comparison=None):
    c = comparison if comparison is not None else Comparison()
    old = {k: original_root / v for k, v in ORIGINAL.items()}
    new = {k: fresh_root / v for k, v in FRESH.items()}
    for (stage, filename), digest in ORIGINAL_PINS.items():
        c.bind(old[stage] / filename, digest, "original_pin/" + stage + "/" + filename)
    reports = {k: (read(old[k] / "results.json"), read(new[k] / "results.json"))
               for k in ("primary", "sparse", "anchor", "mechanism")}
    sections = {
        "primary": ["primary_clean", "secondary_full_official", "primary_comparison",
                    "dependence_sensitivity", "quarantine_reasons_nonexclusive"],
        "sparse": ["primary_clean", "full_official", "augmented_minus_sparse"],
        "anchor": ["clean_test", "full_test", "truncation"],
        "mechanism": ["primary_clean", "full_official", "descriptive_contrasts"],
    }
    predictions = {
        "primary": ("test_predictions.jsonl", ["lexical_score", "gmee_augmented_score"]),
        "sparse": ("predictions.jsonl", ["sparse_score"]),
        "anchor": ("anchor_predictions.jsonl", ["factual_probability"]),
        "mechanism": ("predictions.jsonl", [n + "_score" for n in "ABCD"]),
    }
    for stage, (a, b) in reports.items():
        tol = GPU_TOL if stage == "anchor" else CPU_TOL
        for key in sections[stage]:
            c.compare(a[key], b[key], stage + "/" + key, tol)
        filename, scores = predictions[stage]
        if stage == "primary":
            thresholds = {n + "_score": a["primary_clean"][n]["threshold"]
                          for n in ("lexical", "gmee_augmented")}
        elif stage == "mechanism":
            thresholds = {n + "_score": a["primary_clean"][n]["threshold"] for n in "ABCD"}
        else:
            thresholds = {scores[0]: a["clean_test" if stage == "anchor" else "primary_clean"]["threshold"]}
        c.rows(old[stage] / filename, new[stage] / filename, stage + "_test",
               scores, tol, thresholds)
        for label, dirs, report in (("original", old, a), ("fresh", new, b)):
            c.bind(dirs[stage] / filename, report["predictions_sha256"],
                   label + "/" + stage + "_predictions")
            c.hashes[label + "/" + stage + "_results"] = sha(dirs[stage] / "results.json")

    c.compare(read(old["primary_fit"] / "models.json"),
              read(new["primary_fit"] / "models.json"), "primary_fit/models")
    af, bf = (read(d["primary_fit"] / "manifest.json") for d in (old, new))
    for field in ("audit", "C_grid", "dev_operating_threshold", "max_dev", "max_train",
                  "model_inputs", "pilot_version", "sampling", "seed", "source_sha256",
                  "versions"):
        c.compare(af[field], bf[field], "primary_fit/manifest/" + field, 0)
    lock_keys = {
        "primary_lock": ["bootstrap", "clean_test_rows", "data_sha256", "dev_state_replay",
                         "excluded_case_ids_sha256", "retained_case_ids_sha256",
                         "protocol_sha256", "quarantined_test_rows", "runtime_versions",
                         "sources_sha256", "test_input_dependence"],
        "sparse_fit": ["C_grid_dev_auroc", "config", "data_sha256", "dev_auroc",
                       "dev_macro_f1", "dev_rows", "runtime", "selected_C",
                       "sources_sha256", "threshold", "train_rows", "vocabulary_features"],
        "anchor_lock": ["config", "sources_sha256", "test_sha256"],
        "mechanism_fit": ["data_sha256", "full_dev_serialization_replay_max_errors",
                          "model_selection", "runtime", "train_dev_audit"],
    }
    for key, fields in lock_keys.items():
        a, b = read(old[key] / "lock.json"), read(new[key] / "lock.json")
        for field in fields:
            c.compare(a[field], b[field], key + "/" + field)
        c.hashes[key + "/original_lock"] = sha(old[key] / "lock.json")
        c.hashes[key + "/fresh_lock"] = sha(new[key] / "lock.json")
        source_root = fresh_root.parents[1]
        for path, digest in b["sources_sha256"].items():
            c.bind(source_root / path, digest, key + "/source/" + path)
            c.bind(new[key] / "source" / path, digest, key + "/snapshot/" + path)
        for path, digest in a["sources_sha256"].items():
            c.bind(old[key] / "source" / path, digest, key + "/original_snapshot/" + path)
    check_mechanism_adapter(c, read(old["mechanism_fit"] / "lock.json"),
                            read(new["mechanism_fit"] / "lock.json"),
                            sha(new["primary_lock"] / "lock.json"),
                            sha(new["sparse_fit"] / "lock.json"))
    primary = read(new["primary_lock"] / "lock.json")
    for filename, digest in primary["data_sha256"].items():
        c.bind(data_dir / filename, digest, "inputs/data/" + filename)
    anchor_config = read(new["anchor_lock"] / "lock.json")["config"]
    for filename, digest in anchor_config["model_files_sha256"].items():
        c.bind(model_dir / filename, digest, "inputs/checkpoint/" + filename)
    for label, dirs, i in (("original", old, 0), ("fresh", new, 1)):
        bind_internal_chain(c, dirs, {k: pair[i] for k, pair in reports.items()}, label)
        c.bind(source_root / "evaluation/scripts/summarize_vitaminc_anchor.py",
               reports["anchor"][i]["summary_script_sha256"], label + "/anchor_summary_source")
    for stage, fit, lock_field in [
        ("primary", "primary_lock", "local_lock_sha256"),
        ("sparse", "sparse_fit", "supplement_lock_sha256"),
        ("anchor", "anchor_lock", "supplement_lock_sha256"),
        ("mechanism", "mechanism_fit", "supplement_lock_sha256"),
    ]:
        for label, dirs, i in (("original", old, 0), ("fresh", new, 1)):
            c.bind(dirs[fit] / "lock.json", reports[stage][i][lock_field],
                   label + "/" + stage + "_lock")
        c.check((new[fit] / "TEST_ACCESS_STARTED.json").is_file(), stage + ":access_marker")
    for key, filename, scores in [
        ("primary_fit", "dev_predictions.csv", ["lexical_score", "gmee_augmented_score"]),
        ("sparse_fit", "dev_predictions.csv", ["sparse_score"]),
        ("mechanism_fit", "dev_predictions.csv", [n + "_score" for n in "ABCD"]),
    ]:
        if key == "primary_fit":
            models = read(old[key] / "models.json")
            thresholds = {n + "_score": models[n]["threshold"]
                          for n in ("lexical", "gmee_augmented")}
        elif key == "sparse_fit":
            thresholds = {"sparse_score": read(old[key] / "lock.json")["threshold"]}
        else:
            models = read(old[key] / "lock.json")["model_selection"]
            thresholds = {n + "_score": models[n]["threshold"] for n in "ABCD"}
        c.rows(old[key] / filename, new[key] / filename, key + "_dev",
               scores, thresholds=thresholds)
        meta = read(new[key] / ("manifest.json" if key == "primary_fit" else "lock.json"))
        c.bind(new[key] / filename, meta["dev_predictions_sha256"], "fresh/" + key + "_dev")

    # Bind trusted serialized bytes before loading; stop if any chain/source check failed.
    if c.failures:
        return c
    ap, bp = (joblib.load(d["sparse_fit"] / "pipeline.joblib") for d in (old, new))
    av, bv = (p.named_steps["tfidfvectorizer"] for p in (ap, bp))
    c.check(av.vocabulary_ == bv.vocabulary_, "sparse:exact_vocabulary_and_order")
    c.array(av.idf_, bv.idf_, "sparse_fit/idf")
    for attr in ("coef_", "intercept_", "classes_", "n_iter_"):
        c.array(getattr(ap.named_steps["logisticregression"], attr),
                getattr(bp.named_steps["logisticregression"], attr), "sparse_fit/" + attr,
                0 if attr in ("classes_", "n_iter_") else CPU_TOL)
    am, bm = (joblib.load(d["mechanism_fit"] / "models.joblib") for d in (old, new))
    mechanism_lock = read(new["mechanism_fit"] / "lock.json")
    c.bind(new["mechanism_fit"] / "models.joblib", mechanism_lock["models_sha256"], "fresh/mechanism_models")
    c.check(am["vectorizer"].vocabulary_ == bm["vectorizer"].vocabulary_ == bv.vocabulary_,
            "mechanism:exact_frozen_sparse_vocabulary")
    c.array(am["vectorizer"].idf_, bm["vectorizer"].idf_, "mechanism_fit/idf")
    c.array(bm["vectorizer"].idf_, bv.idf_, "mechanism_fit/fresh_sparse_idf", 0)
    for name in "ABCD":
        a, b = am["models"][name], bm["models"][name]
        c.compare(a["feature_names"], b["feature_names"], "mechanism_features/" + name)
        for part, attrs in [("scaler", ("mean_", "scale_", "var_")),
                            ("classifier", ("coef_", "intercept_", "classes_", "n_iter_"))]:
            for attr in attrs:
                c.array(getattr(a[part], attr), getattr(b[part], attr),
                        "mechanism_fit/" + name + "/" + part + "/" + attr,
                        0 if attr in ("classes_", "n_iter_") else CPU_TOL)
    return c


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original-runs", type=Path, required=True)
    p.add_argument("--fresh-runs", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--plan", type=Path, required=True)
    p.add_argument("--data-dir", type=Path, required=True)
    p.add_argument("--model-dir", type=Path, required=True)
    args = p.parse_args()
    if args.output.exists():
        raise ValueError("Preserve previous reports; use a new output file")
    c = Comparison()
    try:
        verify(args.original_runs.resolve(), args.fresh_runs.resolve(),
               args.data_dir.resolve(), args.model_dir.resolve(), c)
    except Exception as exc:
        # Do not expose raw exception text: a malformed artifact might include row IDs.
        # Preserve the failure receipt even for missing files/schema or unreadable models.
        c.check(False, "verification_aborted:" + type(exc).__name__)
    result = {
        "schema": "vitaminc-isolated-reconstruction-comparison-v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "Same-team artifact reconstruction; prior results known; not independent or new held-out evidence",
        "inherited_primary_disclosure_correction": (
            "Fresh primary locks retain historical access wording from unchanged code. "
            "It does not describe this reconstruction: all original outcomes were known."),
        "plan_sha256": sha(args.plan), "verifier_sha256": sha(Path(__file__)),
        "cpu_absolute_tolerance": CPU_TOL, "gpu_absolute_tolerance": GPU_TOL,
        "passed": not c.failures, "checks": c.checks,
        "failures": c.failures, "max_absolute_errors": c.max_errors,
        "artifact_hashes": c.hashes,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True, allow_nan=False) + "\n")
    print(json.dumps({"passed": result["passed"], "checks": c.checks,
                      "failures": c.failures, "output": str(args.output)}))
    if c.failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
