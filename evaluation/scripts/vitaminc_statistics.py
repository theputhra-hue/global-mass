"""Paired, page-cluster uncertainty for the fixed VitaminC comparison.

No dataset I/O. Rows are equally weighted in the target AUROC; pages are the
bootstrap sampling unit. Each draw samples G of the G distinct pages with
replacement, retaining every row of each sampled page with its multiplicity.
Both models use exactly the same draw. Intervals are percentile intervals,
not a guarantee about population coverage or independence of Wikipedia pages.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def _validated(labels, scores):
    y = np.asarray(labels)
    s = np.asarray(scores, dtype=float)
    if y.ndim != 1 or s.ndim != 1 or len(y) != len(s) or not len(y):
        raise ValueError("Labels and scores must be nonempty, aligned 1-D vectors")
    if not np.isin(y, (0, 1)).all() or not np.isfinite(s).all():
        raise ValueError("Expected binary labels and finite scores")
    return y.astype(int), s


@dataclass
class RankedAUC:
    """Cache score ordering; calculate tie-aware AUROC under row weights."""

    labels: np.ndarray
    order: np.ndarray
    tie_starts: np.ndarray

    @classmethod
    def from_scores(cls, labels, scores):
        y, s = _validated(labels, scores)
        order = np.argsort(s, kind="stable")
        starts = np.r_[0, np.flatnonzero(np.diff(s[order])) + 1]
        return cls(y[order], order, starts)

    def evaluate(self, weights=None):
        if weights is None:
            w = np.ones(len(self.order), dtype=float)
        else:
            w = np.asarray(weights, dtype=float)
            if w.shape != self.order.shape or not np.isfinite(w).all() or (w < 0).any():
                raise ValueError("Weights must be aligned, finite, and nonnegative")
            w = w[self.order]
        positives = np.add.reduceat(w * self.labels, self.tie_starts)
        negatives = np.add.reduceat(w * (1 - self.labels), self.tie_starts)
        p, n = positives.sum(), negatives.sum()
        if p == 0 or n == 0:
            return None
        smaller_negatives = np.cumsum(negatives) - negatives
        return float(np.dot(positives, smaller_negatives + 0.5 * negatives) / (p * n))


def paired_page_bootstrap(labels, lexical_scores, augmented_scores, pages, *,
                          draws=2000, seed=20261019, margin=0.02):
    """AUROC(augmented)-AUROC(lexical), with paired page-bootstrap CI."""
    y, left = _validated(labels, lexical_scores)
    _, right = _validated(labels, augmented_scores)
    page_list = list(pages)
    if len(page_list) != len(y) or any(not isinstance(p, str) or not p for p in page_list):
        raise ValueError("Every row must have a nonempty string page group")
    if not isinstance(draws, int) or draws < 2:
        raise ValueError("At least two bootstrap draws are required")
    if not np.isfinite(margin) or margin < 0:
        raise ValueError("Practical margin must be nonnegative and finite")
    groups, inverse = np.unique(page_list, return_inverse=True)
    if len(groups) < 2:
        raise ValueError("At least two page groups are required")
    a, b = RankedAUC.from_scores(y, left), RankedAUC.from_scores(y, right)
    auc_a, auc_b = a.evaluate(), b.evaluate()
    if auc_a is None or auc_b is None:
        raise ValueError("The comparison requires both label classes")
    rng = np.random.default_rng(seed)
    probabilities = np.full(len(groups), 1 / len(groups))
    differences = []
    for _ in range(draws):
        counts = rng.multinomial(len(groups), probabilities)
        weights = counts[inverse]
        draw_a, draw_b = a.evaluate(weights), b.evaluate(weights)
        if draw_a is not None and draw_b is not None:
            differences.append(draw_b - draw_a)
    interval = np.quantile(differences, (0.025, 0.975)).tolist() if differences else None
    sufficient = len(differences) >= 0.95 * draws
    return {
        "method": "paired_page_cluster_percentile_bootstrap",
        "estimand": "row_weighted_augmented_minus_lexical_auroc",
        "rows": len(y), "pages": len(groups),
        "class_support": {"not factual": int((y == 0).sum()), "factual": int(y.sum())},
        "seed": seed, "requested_draws": draws,
        "valid_draws": len(differences), "undefined_draws": draws - len(differences),
        "lexical_auroc": auc_a, "augmented_auroc": auc_b,
        "delta_auroc": auc_b - auc_a, "ci95": interval,
        "practical_margin": margin,
        "sufficient_valid_draws": sufficient,
        "interval_above_margin": bool(sufficient and interval is not None and interval[0] > margin),
    }
