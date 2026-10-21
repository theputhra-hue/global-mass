"""Select reproducible qualitative error cases from saved primary predictions.

Selection: 12 distinct pages for each augmented false-positive/false-negative
stratum, using fixed hash ranks; one ranked case from each selected page. This
is an error-focused qualitative sample, not a prevalence estimate or new gold.
"""
import argparse
import hashlib
import json
from pathlib import Path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rank(value):
    return hashlib.sha256(("20261019:" + value).encode()).hexdigest()


def main(primary_dir, data_dir, output_dir):
    repo = Path(__file__).resolve().parents[2]
    output_dir = output_dir.resolve()
    if not output_dir.is_relative_to((repo / ".local-deployment").resolve()) or output_dir.exists():
        raise ValueError("Use a new ignored output directory")
    result = json.loads((primary_dir / "results.json").read_text(encoding="utf-8"))
    if sha(primary_dir / "test_predictions.jsonl") != result["predictions_sha256"]:
        raise ValueError("Primary prediction integrity failure")
    all_rows = [json.loads(line) for line in (primary_dir / "test_predictions.jsonl").open(encoding="utf-8")]
    chosen = []
    for label, predicted in (("not factual", 1), ("factual", 0)):
        candidates = [r for r in all_rows if r["primary_eligible"] and r["gold_label"] == label
                      and r["gmee_augmented_predicted"] == predicted]
        groups = {}
        for r in candidates:
            groups.setdefault(r["page_sha256"], []).append(r)
        for page in sorted(groups, key=rank)[:12]:
            case = min(groups[page], key=lambda r: rank(r["case_id"]))
            case["sample_stratum"] = "false_positive" if predicted else "false_negative"
            chosen.append(case)
    by_id = {r["case_id"]: r for r in chosen}
    with (data_dir / "test.jsonl").open(encoding="utf-8") as stream:
        for line in stream:
            raw = json.loads(line)
            if raw["case_id"] in by_id:
                by_id[raw["case_id"]].update({k: raw[k] for k in ("sent_a", "sent_b", "page")})
    if len(by_id) != 24 or any("sent_a" not in r for r in chosen):
        raise ValueError("Error sample incomplete")
    output_dir.mkdir(parents=True)
    out = output_dir / "cases.jsonl"
    out.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in chosen), encoding="utf-8")
    manifest = {"status": "qualitative_AI_review_sample_not_gold", "seed": 20261019,
                "strata": {"augmented_false_positive": 12, "augmented_false_negative": 12},
                "selection": "hash-rank distinct pages then hash-rank one eligible error case per selected page",
                "predictions_sha256": result["predictions_sha256"], "source_data_sha256": sha(data_dir / "test.jsonl"),
                "sample_sha256": sha(out), "script_sha256": sha(Path(__file__)),
                "case_ids": [r["case_id"] for r in chosen]}
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    for name in ("primary-dir", "data-dir", "output-dir"):
        p.add_argument("--" + name, type=Path, required=True)
    args = p.parse_args()
    main(args.primary_dir, args.data_dir, args.output_dir)
