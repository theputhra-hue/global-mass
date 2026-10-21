"""The local candidate frame has stable hashes and never exports source text."""

import hashlib
import json
import tempfile
import unittest
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from scripts.export_candidate_manifest import (
    build_manifest,
    candidate_record,
    output_paths,
    records_bytes,
    validate_snapshot_meta,
)


class CandidateManifestTest(unittest.TestCase):
    def test_unlabeled_hashed_record_and_ignored_output_guard(self):
        article_a = uuid.UUID(int=1)
        article_b = uuid.UUID(int=2)
        row: dict[str, Any] = {
            "pair_id": uuid.UUID(int=3),
            "claim_a_id": uuid.UUID(int=4),
            "claim_b_id": uuid.UUID(int=5),
            "article_a_id": article_a,
            "article_b_id": article_b,
            "canonical_article_a_id": None,
            "canonical_article_b_id": article_a,
            "article_content_hash_a": "article-hash-a",
            "article_content_hash_b": "article-hash-b",
            "claim_text_a": "The  10 people arrived.",
            "claim_text_b": "the 10 people arrived.",
            "source_a_id": uuid.UUID(int=6),
            "source_b_id": uuid.UUID(int=7),
            "source_a_name": "A",
            "source_b_name": "B",
            "source_a_type": "rss",
            "source_b_type": "rss",
            "source_a_identifier": "https://example.org/feed",
            "source_b_identifier": "https://example.net/feed",
            "article_url_a": "https://example.org/1",
            "article_url_b": "https://example.net/2",
            "domain_a": "example.org",
            "domain_b": "example.net",
            "language_a": "en",
            "language_b": "en",
            "published_at_a": datetime(2026, 10, 1, tzinfo=UTC),
            "published_at_b": datetime(2026, 10, 2, tzinfo=UTC),
            "sampled_at": datetime(2026, 10, 3, tzinfo=UTC),
            "bucket": "b75",
            "sim_score": 0.8,
            "sampling_provenance": {},
        }
        record = candidate_record(row)
        data = records_bytes([record])
        self.assertTrue(record["duplicate_hints"]["same_normalized_claim_text"])
        self.assertTrue(record["duplicate_hints"]["same_canonical_article"])
        self.assertEqual(record["absolute_publication_gap_days"], 1)
        self.assertEqual(
            record["claim_text_sha256_a"],
            hashlib.sha256(row["claim_text_a"].encode()).hexdigest(),
        )
        self.assertNotIn(row["claim_text_a"].encode(), data)
        self.assertNotIn(b'"label"', data)
        self.assertNotIn(b'"event_id"', data)
        manifest = build_manifest(
            [record], "pilot-v1",
            {
                "database_name": "fixture", "snapshot_at": row["sampled_at"],
                "database_snapshot_id": "1:2:",
                "transaction_isolation": "repeatable read",
                "transaction_read_only": "on",
                "article_count": 2, "claim_count": 2, "pair_count": 1,
            },
            data, "exporter-hash",
        )
        self.assertEqual(manifest["records_sha256"], hashlib.sha256(data).hexdigest())
        self.assertEqual(manifest["empty_sampling_provenance_count"], 1)
        self.assertEqual(manifest["null_sampling_provenance_count"], 0)
        self.assertEqual(manifest["source_eval_pairs"], 1)
        self.assertEqual(json.loads(data)["sampling_bucket"], "b75")
        null_row = {**row, "sampling_provenance": None}
        null_record = candidate_record(null_row)
        self.assertIsNone(null_record["sampling_provenance"])
        self.assertEqual(
            build_manifest(
                [null_record], "pilot-v1", {
                    "database_name": "fixture", "snapshot_at": row["sampled_at"],
                    "database_snapshot_id": "1:2:",
                    "transaction_isolation": "repeatable read",
                    "transaction_read_only": "on", "article_count": 2,
                    "claim_count": 2, "pair_count": 1,
                }, records_bytes([null_record]), "exporter-hash",
            )["null_sampling_provenance_count"], 1,
        )
        missing_hashes = {
            **row, "article_content_hash_a": None,
            "article_content_hash_b": None,
        }
        self.assertFalse(
            candidate_record(missing_hashes)["duplicate_hints"][
                "same_article_content_hash"
            ]
        )
        validate_snapshot_meta({
            "transaction_isolation": "repeatable read",
            "transaction_read_only": "on", "pair_count": 1,
        }, 1)
        with self.assertRaises(ValueError):
            validate_snapshot_meta({
                "transaction_isolation": "read committed",
                "transaction_read_only": "on", "pair_count": 1,
            }, 1)
        with self.assertRaises(ValueError):
            validate_snapshot_meta({
                "transaction_isolation": "repeatable read",
                "transaction_read_only": "off", "pair_count": 1,
            }, 1)
        with self.assertRaises(ValueError):
            validate_snapshot_meta({
                "transaction_isolation": "repeatable read",
                "transaction_read_only": "on", "pair_count": 2,
            }, 1)
        with tempfile.TemporaryDirectory() as temp:
            cwd = Path(temp)
            allowed = cwd / "publication-outbox" / "pilot.jsonl"
            self.assertEqual(output_paths(allowed, cwd)[0], allowed)
            with self.assertRaises(ValueError):
                output_paths(cwd / "tracked.jsonl", cwd)


if __name__ == "__main__":
    unittest.main()
