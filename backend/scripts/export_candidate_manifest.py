"""Export a read-only, unlabeled inventory of the current claim-pair bank.

Run from the repository root with the backend's configured database:

    python backend/scripts/export_candidate_manifest.py \
      --output publication-outbox/candidate-frame-v1.jsonl \
      --snapshot-id candidate-frame-v1

The output is confined to the Git-ignored publication-outbox directory. It
contains URLs and identifiers but no article or claim text, votes, or inferred
event labels. This is a candidate inventory, not human gold or a probability
sample. Existing pair sampling provenance is preserved exactly, including {}.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SCHEMA_VERSION = "gmee-candidate-frame-v2"
OUTBOX = "publication-outbox"


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.replace(tzinfo=value.tzinfo or UTC).astimezone(UTC).isoformat()


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _normalized_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _enum_value(value: Any) -> str | None:
    if value is None:
        return None
    return str(getattr(value, "value", value))


def candidate_record(row: dict[str, Any]) -> dict[str, Any]:
    """Reduce a DB row to research metadata; never emit copyrighted text."""
    a_id, b_id = str(row["article_a_id"]), str(row["article_b_id"])
    canonical_a = str(row["canonical_article_a_id"] or row["article_a_id"])
    canonical_b = str(row["canonical_article_b_id"] or row["article_b_id"])
    text_a, text_b = row["claim_text_a"], row["claim_text_b"]
    normalized_a, normalized_b = _normalized_text(text_a), _normalized_text(text_b)
    date_a, date_b = row["published_at_a"], row["published_at_b"]
    provenance = row["sampling_provenance"]
    if provenance is not None and not isinstance(provenance, dict):
        raise ValueError("sampling provenance must be an object or null")
    content_hash_a = row["article_content_hash_a"]
    content_hash_b = row["article_content_hash_b"]
    return {
        "pair_id": str(row["pair_id"]),
        "claim_a_id": str(row["claim_a_id"]),
        "claim_b_id": str(row["claim_b_id"]),
        "article_a_id": a_id,
        "article_b_id": b_id,
        "canonical_article_a_id": canonical_a,
        "canonical_article_b_id": canonical_b,
        "article_content_hash_a": row["article_content_hash_a"],
        "article_content_hash_b": row["article_content_hash_b"],
        "claim_text_sha256_a": _sha256(text_a),
        "claim_text_sha256_b": _sha256(text_b),
        "claim_normalized_sha256_a": _sha256(normalized_a),
        "claim_normalized_sha256_b": _sha256(normalized_b),
        "source_a_id": str(row["source_a_id"]),
        "source_b_id": str(row["source_b_id"]),
        "source_a_name": row["source_a_name"],
        "source_b_name": row["source_b_name"],
        "source_a_type": _enum_value(row["source_a_type"]),
        "source_b_type": _enum_value(row["source_b_type"]),
        "source_a_identifier": row["source_a_identifier"],
        "source_b_identifier": row["source_b_identifier"],
        "article_url_a": row["article_url_a"],
        "article_url_b": row["article_url_b"],
        "domain_a": row["domain_a"],
        "domain_b": row["domain_b"],
        "language_a": row["language_a"],
        "language_b": row["language_b"],
        "published_at_a": _iso(date_a),
        "published_at_b": _iso(date_b),
        "absolute_publication_gap_days": (
            round(abs((date_a - date_b).total_seconds()) / 86400, 6)
            if date_a is not None and date_b is not None else None
        ),
        "sampled_at": _iso(row["sampled_at"]),
        "sampling_bucket": row["bucket"],
        "stored_cosine_score": row["sim_score"],
        "sampling_provenance": provenance,
        "duplicate_hints": {
            "same_article": a_id == b_id,
            "same_canonical_article": canonical_a == canonical_b,
            "same_article_content_hash": (
                bool(content_hash_a) and content_hash_a == content_hash_b
            ),
            "same_normalized_claim_text": (
                bool(normalized_a) and normalized_a == normalized_b
            ),
            "same_source": row["source_a_id"] == row["source_b_id"],
            "same_domain": (
                row["domain_a"] is not None and row["domain_a"] == row["domain_b"]
            ),
        },
        "rights_status": "unreviewed",
    }


def records_bytes(records: list[dict[str, Any]]) -> bytes:
    return "".join(
        json.dumps(
            record, sort_keys=True, ensure_ascii=False,
            separators=(",", ":"), allow_nan=False,
        ) + "\n"
        for record in sorted(records, key=lambda item: item["pair_id"])
    ).encode("utf-8")


def build_manifest(
    records: list[dict[str, Any]], snapshot_id: str, db_meta: dict[str, Any],
    data: bytes, exporter_sha256: str,
) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "snapshot_id": snapshot_id,
        "snapshot_at_utc": _iso(db_meta["snapshot_at"]),
        "database_name": db_meta["database_name"],
        "database_snapshot_id": db_meta["database_snapshot_id"],
        "transaction_isolation": db_meta["transaction_isolation"],
        "transaction_read_only": db_meta["transaction_read_only"],
        "source_corpus_articles": db_meta["article_count"],
        "source_corpus_claims": db_meta["claim_count"],
        "source_eval_pairs": db_meta["pair_count"],
        "record_count": len(records),
        "pair_ids_sha256": _sha256("\n".join(sorted(r["pair_id"] for r in records))),
        "records_sha256": hashlib.sha256(data).hexdigest(),
        "exporter_sha256": exporter_sha256,
        "sampling_buckets": dict(sorted(
            Counter(r["sampling_bucket"] for r in records).items()
        )),
        "empty_sampling_provenance_count": sum(
            r["sampling_provenance"] == {} for r in records
        ),
        "null_sampling_provenance_count": sum(
            r["sampling_provenance"] is None for r in records
        ),
        "rights_status": "unreviewed_per_source",
        "annotation_status": "unlabeled_inventory_only",
        "event_status": "not_curated_or_assigned_by_this_export",
        "limitations": [
            "No pair labels or event IDs are exported or inferred.",
            (
                "The historical pair bank has unknown inclusion probabilities "
                "and is not a probability sample."
            ),
            "Stored cosine and duplicate hints are triage metadata, not ground truth.",
            "Source text redistribution rights require a separate per-source review.",
        ],
    }


def output_paths(output: Path, cwd: Path) -> tuple[Path, Path]:
    root = (cwd / OUTBOX).resolve()
    if root != cwd.resolve() / OUTBOX:
        raise ValueError("publication-outbox must be a directory, not a symlink")
    path = output.resolve()
    if path.suffix != ".jsonl" or not path.is_relative_to(root):
        raise ValueError(f"--output must be a .jsonl file inside {root}")
    manifest = Path(str(path) + ".manifest.json")
    if path.exists() or manifest.exists():
        raise ValueError("snapshot already exists; choose a new ID/path")
    return path, manifest


def validate_snapshot_meta(meta: dict[str, Any], row_count: int) -> None:
    if meta["transaction_isolation"] != "repeatable read":
        raise ValueError("database transaction is not repeatable read")
    if meta["transaction_read_only"] != "on":
        raise ValueError("database transaction is not read only")
    if row_count != meta["pair_count"]:
        raise ValueError("joined candidate rows differ from source eval pair count")


async def collect_candidate_rows(
    db: Any,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Select only source/pair metadata and transient claim text for hashing."""
    from sqlalchemy import func, select, text
    from sqlalchemy.orm import aliased

    from app.models.article import Article
    from app.models.claim import Claim
    from app.models.eval import EvalPair
    from app.models.source import Source

    ca, cb = aliased(Claim), aliased(Claim)
    aa, ab = aliased(Article), aliased(Article)
    sa, sb = aliased(Source), aliased(Source)
    statement = (
        select(
            EvalPair.id.label("pair_id"), EvalPair.claim_a_id, EvalPair.claim_b_id,
            EvalPair.bucket, EvalPair.sim_score, EvalPair.sampled_at,
            EvalPair.sampling_provenance,
            ca.claim_text.label("claim_text_a"), cb.claim_text.label("claim_text_b"),
            ca.article_id.label("article_a_id"), cb.article_id.label("article_b_id"),
            aa.canonical_article_id.label("canonical_article_a_id"),
            ab.canonical_article_id.label("canonical_article_b_id"),
            aa.content_hash.label("article_content_hash_a"),
            ab.content_hash.label("article_content_hash_b"),
            aa.url.label("article_url_a"), ab.url.label("article_url_b"),
            aa.domain.label("domain_a"), ab.domain.label("domain_b"),
            aa.language.label("language_a"), ab.language.label("language_b"),
            aa.published_at.label("published_at_a"),
            ab.published_at.label("published_at_b"),
            sa.id.label("source_a_id"), sb.id.label("source_b_id"),
            sa.name.label("source_a_name"), sb.name.label("source_b_name"),
            sa.type.label("source_a_type"), sb.type.label("source_b_type"),
            sa.url_or_identifier.label("source_a_identifier"),
            sb.url_or_identifier.label("source_b_identifier"),
        )
        .join(ca, ca.id == EvalPair.claim_a_id)
        .join(cb, cb.id == EvalPair.claim_b_id)
        .join(aa, aa.id == ca.article_id)
        .join(ab, ab.id == cb.article_id)
        .join(sa, sa.id == aa.source_id)
        .join(sb, sb.id == ab.source_id)
        .order_by(EvalPair.id)
    )
    meta_query = text(
        "SELECT current_database() AS database_name, "
        "transaction_timestamp() AS snapshot_at, "
        "txid_current_snapshot()::text AS database_snapshot_id, "
        "current_setting('transaction_isolation') AS transaction_isolation, "
        "current_setting('transaction_read_only') AS transaction_read_only"
    )
    meta = dict((await db.execute(meta_query)).mappings().one())
    if meta["transaction_isolation"] != "repeatable read":
        raise ValueError("database transaction is not repeatable read")
    if meta["transaction_read_only"] != "on":
        raise ValueError("database transaction is not read only")
    article_count = select(func.count()).select_from(Article)
    claim_count = select(func.count()).select_from(Claim)
    pair_count = select(func.count()).select_from(EvalPair)
    meta["article_count"] = (await db.execute(article_count)).scalar_one()
    meta["claim_count"] = (await db.execute(claim_count)).scalar_one()
    meta["pair_count"] = (await db.execute(pair_count)).scalar_one()
    result = await db.execute(statement)
    rows = [candidate_record(dict(row._mapping)) for row in result.all()]
    validate_snapshot_meta(meta, len(rows))
    return rows, meta


async def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--snapshot-id", required=True)
    args = parser.parse_args(argv)
    try:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", args.snapshot_id):
            raise ValueError("--snapshot-id must be 1-128 safe identifier characters")
        output, manifest_path = output_paths(args.output, Path.cwd())
        from app.services.eval.dataset import snapshot_session

        async with snapshot_session() as db:
            records, db_meta = await collect_candidate_rows(db)
        if not records:
            raise ValueError("no eval pairs found; no empty snapshot written")
        data = records_bytes(records)
        exporter_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        manifest = build_manifest(
            records, args.snapshot_id, db_meta, data, exporter_sha256
        )
        output.parent.mkdir(parents=True, exist_ok=True)
        created_output = False
        created_manifest = False
        try:
            with output.open("xb") as file:
                created_output = True
                file.write(data)
            with manifest_path.open("xb") as file:
                created_manifest = True
                manifest_text = json.dumps(
                    manifest, sort_keys=True, ensure_ascii=False, indent=2
                ) + "\n"
                file.write(manifest_text.encode("utf-8"))
        except OSError:
            if created_manifest:
                manifest_path.unlink(missing_ok=True)
            if created_output:
                output.unlink(missing_ok=True)
            raise
    except (ValueError, OSError) as exc:
        print(f"REFUSED: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        # Database driver exceptions can include connection strings. Never print
        # their message, which may contain credentials or private article text.
        print(
            f"REFUSED: candidate snapshot failed ({type(exc).__name__})",
            file=sys.stderr,
        )
        return 2
    print(f"Exported {len(records)} unlabeled candidate pairs to {output}")
    print(f"SHA-256 {manifest['records_sha256']}; manifest {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
