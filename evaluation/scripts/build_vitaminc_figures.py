"""Render aggregate paper figures from saved predictions, without inference."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import average_precision_score, precision_recall_curve, roc_auc_score, roc_curve


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main(primary_dir, output_dir, sparse_dir=None, anchor_dir=None):
    report = json.loads((primary_dir / "results.json").read_text(encoding="utf-8"))
    path = primary_dir / "test_predictions.jsonl"
    if digest(path) != report["predictions_sha256"]:
        raise ValueError("Primary predictions do not match result receipt")
    full_rows = [json.loads(line) for line in path.open(encoding="utf-8")]
    if len(full_rows) != 31048 or len({r["case_id"] for r in full_rows}) != 31048:
        raise ValueError("Primary identities differ from the audited population")
    eligibility = {r["case_id"]: r["primary_eligible"] for r in full_rows}
    rows = [r for r in full_rows if r["primary_eligible"]]
    if len(rows) != 30828:
        raise ValueError("Primary clean population differs from the study")
    ids = [r["case_id"] for r in rows]
    y = np.array([r["gold_label"] == "factual" for r in rows])
    series = {"Lexical summaries": [r["lexical_score"] for r in rows],
              "GMEE features": [r["gmee_augmented_score"] for r in rows]}
    inputs = {str(path): digest(path), str(primary_dir / "results.json"): digest(primary_dir / "results.json")}
    for folder, file, key, label in ((sparse_dir, "predictions.jsonl", "sparse_score", "Sparse edit text (supp.)"),
                                    (anchor_dir, "anchor_predictions.jsonl", "factual_probability", "ALBERT (supp.)")):
        if folder is None:
            continue
        pred = folder / file
        supplement_report = folder / "results.json"
        supplement = json.loads(supplement_report.read_text(encoding="utf-8"))
        if digest(pred) != supplement["predictions_sha256"]:
            raise ValueError(f"Supplement predictions do not match the receipt: {label}")
        supplement_rows = [json.loads(line) for line in pred.open(encoding="utf-8")]
        found = {r["case_id"]: r for r in supplement_rows}
        if len(supplement_rows) != 31048 or set(found) != set(eligibility):
            raise ValueError(f"Supplement identities differ: {label}")
        if any(r["primary_eligible"] != eligibility[i] for i, r in found.items()):
            raise ValueError(f"Supplement eligibility differs: {label}")
        series[label] = [found[i][key] for i in ids]
        inputs[str(pred)] = digest(pred)
        inputs[str(supplement_report)] = digest(supplement_report)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False,
                         "axes.spines.right": False, "pdf.fonttype": 42, "svg.fonttype": "none"})
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.1), constrained_layout=True)
    colors = ["#687786", "#007A7C", "#B26916", "#7C4D9E"]
    summaries = {}
    for (name, p), color in zip(series.items(), colors):
        auc, ap = roc_auc_score(y, p), average_precision_score(y, p)
        fpr, tpr, _ = roc_curve(y, p)
        precision, recall, _ = precision_recall_curve(y, p)
        axes[0].plot(fpr, tpr, color=color, lw=1.8, label=f"{name}: {auc:.3f}")
        axes[1].plot(recall, precision, color=color, lw=1.8, label=f"{name}: {ap:.3f}")
        summaries[name] = {"auroc": auc, "average_precision": ap}
    axes[0].plot([0, 1], [0, 1], color="#aaa", lw=.8, ls="--")
    axes[1].axhline(float(y.mean()), color="#aaa", lw=.8, ls="--")
    for ax, xlabel, ylabel, title in zip(axes, ("False positive rate", "Recall"),
            ("True positive rate", "Precision"), ("A  Receiver operating characteristic", "B  Precision–recall")):
        ax.set(xlim=(0, 1), ylim=(0, 1.01), xlabel=xlabel, ylabel=ylabel, title=title)
        ax.legend(loc="lower right" if ax is axes[0] else "lower left", frameon=False, fontsize=8)
        ax.grid(alpha=.15)
    output_dir.mkdir(parents=True, exist_ok=True)
    for ext in ("pdf", "svg", "png"):
        fig.savefig(output_dir / f"vitaminc_discrimination.{ext}", dpi=220)
    plt.close(fig)
    comparisons = [report["primary_comparison"], report["dependence_sensitivity"]["comparison"]]
    fig, ax = plt.subplots(figsize=(7, 2.5), constrained_layout=True)
    for i, result in enumerate(comparisons):
        lo, hi = result["ci95"]
        d = result["delta_auroc"]
        ax.errorbar(d, 1-i, xerr=[[d-lo], [hi-d]], fmt="o", color="#007A7C", capsize=5, lw=2)
        ax.annotate(f"{d:.3f} [{lo:.3f}, {hi:.3f}]", (hi+.002, 1-i), va="center", fontsize=9)
    ax.axvline(0, color="#555", lw=.8)
    ax.axvline(.02, color="#B26916", ls="--", lw=1, label="Predeclared +0.02 margin")
    ax.set(yticks=[1, 0], yticklabels=["Page groups (primary)", "Connected groups (sensitivity)"],
           ylim=(-.6, 1.5), xlim=(-.005, .16), xlabel="AUROC difference: GMEE features − lexical summaries")
    ax.legend(frameon=False, fontsize=8, loc="upper left")
    ax.grid(axis="x", alpha=.15)
    for ext in ("pdf", "svg", "png"):
        fig.savefig(output_dir / f"vitaminc_primary_contrast.{ext}", dpi=220)
    plt.close(fig)
    artifact = {"status": "figures_from_existing_predictions_no_new_inference", "rows": len(rows),
                "factual": int(y.sum()), "input_sha256": inputs, "series": summaries,
                "script_sha256": digest(Path(__file__)),
                "outputs_sha256": {p.name: digest(p) for p in output_dir.glob("vitaminc_*.*") if p.suffix != ".json"}}
    (output_dir / "figures_manifest.json").write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(artifact["series"], indent=2))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--primary-dir", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, required=True)
    p.add_argument("--sparse-dir", type=Path)
    p.add_argument("--anchor-dir", type=Path)
    args = p.parse_args()
    main(args.primary_dir, args.output_dir, args.sparse_dir, args.anchor_dir)
