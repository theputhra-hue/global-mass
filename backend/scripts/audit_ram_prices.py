"""Read-only RAM-price candidate audit of an existing publication file.

python -m scripts.audit_ram_prices --snapshot ../publication-outbox/release.json --output ../output/core/ram-prices.json
"""

import argparse
import hashlib
import json
from datetime import UTC, date, datetime
from pathlib import Path

from app.schemas.publication import PublicationSnapshot
from app.services.topic_audit import audit_ram_prices


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--since", type=date.fromisoformat)
    parser.add_argument("--until", type=date.fromisoformat)
    args = parser.parse_args()
    if args.snapshot.stat().st_size > 10 * 1024 * 1024:
        parser.error("Snapshot exceeds the publication format's 10 MiB limit.")
    raw = args.snapshot.read_bytes()
    report = audit_ram_prices(PublicationSnapshot.model_validate_json(raw), since=args.since, until=args.until)
    report.update(input_file_sha256=hashlib.sha256(raw).hexdigest(), audited_at=datetime.now(UTC).isoformat())
    output = args.output.resolve()
    root = Path(__file__).resolve().parents[2]
    if not output.is_relative_to(root / "output") and not output.is_relative_to(root / "publication-outbox"):
        parser.error("Write private audit results only under output/ or publication-outbox/.")
    if output.exists():
        parser.error("Output already exists; choose a new path to preserve previous receipts.")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print(json.dumps({"topic": report["topic"], "run_id": report["run_id"], "counts": report["counts"]}))


if __name__ == "__main__":
    main()
