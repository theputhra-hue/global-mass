"""Explicit fresh-artifact adapter for the unchanged historical mechanism runner.

The original runner pins the historical primary/sparse lock bytes. This adapter
accepts two explicitly supplied lock digests for a new reconstruction, records
that change in its frozen config, and adds itself to the source snapshot. All
model, data, identity, source, runtime and one-access checks remain in force.
It never changes the original experiment files or their saved results.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import run_vitaminc_mechanism as experiment


def configure(primary_digest, sparse_digest):
    if any(re.fullmatch(r"[0-9a-f]{64}", h) is None for h in (primary_digest, sparse_digest)):
        raise ValueError("Supply lowercase SHA-256 digests of the two new lock files")
    adapter = Path(__file__).relative_to(experiment.REPO_ROOT).as_posix()
    experiment.EXPECTED_PRIMARY_LOCK = primary_digest
    experiment.EXPECTED_SPARSE_LOCK = sparse_digest
    experiment.SOURCES = (*experiment.SOURCES, adapter)
    experiment.CONFIG = dict(experiment.CONFIG, reconstruction={
        "adapter": adapter,
        "expected_primary_lock_sha256": primary_digest,
        "expected_sparse_lock_sha256": sparse_digest,
        "scope": "New artifact reconstruction; not the historical original run",
    })
    experiment.STATUS = "exploratory_fresh_artifact_reconstruction_not_original_evidence"


def main():
    parser = argparse.ArgumentParser(description=__doc__, add_help=False)
    parser.add_argument("--expected-primary-lock-sha256", required=True)
    parser.add_argument("--expected-sparse-lock-sha256", required=True)
    options, remaining = parser.parse_known_args()
    configure(options.expected_primary_lock_sha256, options.expected_sparse_lock_sha256)
    sys.argv = [sys.argv[0], *remaining]
    experiment.main()


if __name__ == "__main__":
    main()
