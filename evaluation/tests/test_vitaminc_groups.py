"""Synthetic checks for input-only connected dependence groups."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from vitaminc_groups import connected_input_groups


class InputGroupsTests(unittest.TestCase):
    def test_transitive_chain_and_order_independence(self):
        rows = [
            {
                "case_id": case, "page_sha256": page,
                "wiki_revision_id": revision, "input_pair_sha256": pair,
            }
            for case, page, revision, pair in (
                ("a", "page-1", "r-1", "pair-1"),
                ("b", "page-1", "r-2", "pair-2"),
                ("c", "page-2", "r-2", "pair-3"),
                ("d", "page-3", "r-3", "pair-3"),
                ("e", "page-4", "", "pair-4"),
                ("f", "page-5", "", "pair-5"),
            )
        ]
        result = connected_input_groups(rows)
        self.assertEqual(result["component_count"], 3)
        self.assertEqual(result["largest_component_rows"], 4)
        self.assertEqual(result["rows_in_nontrivial_components"], 4)
        self.assertEqual(len(set(result["group_ids"][:4])), 1)
        self.assertNotEqual(result["group_ids"][4], result["group_ids"][5])
        reversed_result = connected_input_groups(list(reversed(rows)))
        self.assertEqual(
            dict(zip((r["case_id"] for r in rows), result["group_ids"])),
            dict(zip(
                (r["case_id"] for r in reversed(rows)),
                reversed_result["group_ids"],
            )),
        )

    def test_requires_unique_cases_and_string_keys(self):
        row = {
            "case_id": "a", "page_sha256": "page",
            "wiki_revision_id": "r", "input_pair_sha256": "pair",
        }
        with self.assertRaises(ValueError):
            connected_input_groups([row, row])
        with self.assertRaises(ValueError):
            connected_input_groups([{**row, "input_pair_sha256": None}])


if __name__ == "__main__":
    unittest.main()
