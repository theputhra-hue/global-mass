"""Explicit runtime and provenance options for host and Docker map builders."""
import argparse
import re
import subprocess
from pathlib import Path

CLOUD_SNAPSHOT_LIMIT = 10 * 1024 * 1024
LOCAL_SNAPSHOT_LIMIT = 64 * 1024 * 1024


def add_runtime_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--configured-environment", action="store_true",
        help="Use the existing database environment (for Docker Compose).",
    )
    parser.add_argument(
        "--source-commit", help="Full source revision when Git is absent in the image.",
    )
    parser.add_argument(
        "--local-only", action="store_true",
        help="Allow a local snapshot over the cloud's 10 MiB upload limit (max 64 MiB).",
    )


def validate_source_commit(value: str) -> str:
    if not re.fullmatch(r"[0-9a-f]{40}", value):
        raise ValueError("Supply the full 40-character source commit")
    return value


def configure_runtime(args: argparse.Namespace) -> str:
    supplied = getattr(args, "source_commit", None)
    if supplied is None:
        supplied = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, timeout=20,
        ).strip()
    source_commit = validate_source_commit(str(supplied))
    if not getattr(args, "configured_environment", False):
        from scripts.serve_local import configure
        configure("https://global-mass.onrender.com")
    return source_commit


def write_snapshot(output: Path, body: bytes, *, local_only: bool = False) -> None:
    limit = LOCAL_SNAPSHOT_LIMIT if local_only else CLOUD_SNAPSHOT_LIMIT
    if len(body) > limit:
        raise RuntimeError(
            f"Complete export exceeds {limit // (1024 * 1024)} MiB; no data was truncated"
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    # Refuse replacement even if another process creates the output after preflight.
    with output.open("xb") as dest:
        try:
            dest.write(body)
        except BaseException:
            # Do not leave a partial export masquerading as a resumable result.
            dest.close()
            output.unlink()
            raise
