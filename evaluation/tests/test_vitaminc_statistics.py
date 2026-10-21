import sys
import unittest
from pathlib import Path

import numpy as np
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from vitaminc_statistics import RankedAUC, paired_page_bootstrap


class StatisticsTests(unittest.TestCase):
    def test_weighted_auc_matches_explicit_cluster_duplicates_and_ties(self):
        y = np.array([0, 1, 0, 1, 1, 0])
        scores = np.array([0.1, 0.1, 0.8, 0.8, 0.9, 0.9])
        # Page A has first three rows, B the fourth, C the final two.
        weights = np.array([2, 2, 2, 0, 1, 1])
        repeated = np.repeat(np.arange(len(y)), weights)
        self.assertAlmostEqual(RankedAUC.from_scores(y, scores).evaluate(weights),
                               roc_auc_score(y[repeated], scores[repeated]))
        self.assertAlmostEqual(RankedAUC.from_scores(y, scores).evaluate(),
                               roc_auc_score(y, scores))

    def test_auc_endpoints_and_undefined_draw(self):
        y = [0, 0, 1, 1]
        self.assertEqual(RankedAUC.from_scores(y, y).evaluate(), 1.0)
        self.assertEqual(RankedAUC.from_scores(y, [1, 1, 0, 0]).evaluate(), 0.0)
        self.assertEqual(RankedAUC.from_scores(y, [0.5] * 4).evaluate(), 0.5)
        self.assertIsNone(RankedAUC.from_scores(y, y).evaluate([1, 1, 0, 0]))

    def test_pairing_reproducibility_and_undefined_group_draws(self):
        args = ([0, 0, 1, 1], [.1, .2, .3, .4], [.1, .2, .3, .4],
                ["negative_page", "negative_page", "positive_page", "positive_page"])
        first = paired_page_bootstrap(*args, draws=100, seed=7)
        self.assertEqual(first, paired_page_bootstrap(*args, draws=100, seed=7))
        self.assertEqual(first["ci95"], [0., 0.])
        self.assertGreater(first["undefined_draws"], 0)
        self.assertEqual(first["valid_draws"] + first["undefined_draws"], 100)
        self.assertFalse(first["interval_above_margin"])

    def test_material_gain_sign_and_symmetric_models(self):
        y = [0, 1, 0, 1, 0, 1]
        pages = ["a", "a", "b", "b", "c", "c"]
        improvement = paired_page_bootstrap(y, [1 - n for n in y], y, pages, draws=40)
        self.assertEqual(improvement["delta_auroc"], 1.)
        self.assertEqual(improvement["ci95"], [1., 1.])
        self.assertTrue(improvement["interval_above_margin"])

    def test_reject_invalid_inputs(self):
        with self.assertRaises(ValueError):
            RankedAUC.from_scores([0, 2], [.1, .2])
        with self.assertRaises(ValueError):
            RankedAUC.from_scores([0, 1], [.1, float("nan")])
        with self.assertRaises(ValueError):
            RankedAUC.from_scores([0, 1], [.1])
        with self.assertRaises(ValueError):
            paired_page_bootstrap([0, 1], [0, 1], [0, 1], ["a", "a"])
        with self.assertRaises(ValueError):
            paired_page_bootstrap([1, 1], [0, 1], [0, 1], ["a", "b"])


if __name__ == "__main__":
    unittest.main()
