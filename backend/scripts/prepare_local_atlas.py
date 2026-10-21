"""Export and activate a complete local-only atlas without changing source records.

Run inside the configured local backend. Export includes every local article,
not just articles with completed claim extraction. Historical model provenance
is explicitly unknown; the later map builder records its own pinned model.
"""
import argparse
import asyncio
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.postgres import async_session_maker
from app.models.publication import PublicationHead, PublicationUpload
from app.models.user import User
from app.schemas.publication import (
    PublicationSnapshot,
    PublishedArticle,
    PublishedClaim,
    PublishedRelationship,
)
from app.services.publications.store import activate
from scripts.map_runtime import (
    LOCAL_SNAPSHOT_LIMIT,
    validate_source_commit,
    write_snapshot,
)

SOURCE_TABLES = (
    "articles", "claims", "claim_relationships", "sources", "eval_pairs", "eval_pair_labels",
)
RECORD_TYPES: dict[str, type[BaseModel]] = {
    "articles": PublishedArticle,
    "claims": PublishedClaim,
    "relationships": PublishedRelationship,
}


def require_local_database() -> None:
    """Fail closed for remote database URLs; never print connection credentials."""
    url = make_url(get_settings().POSTGRES_URL)
    local_hosts = {"localhost", "127.0.0.1", "::1", "postgres", "gmee_postgres"}
    if url.get_backend_name() != "postgresql" or url.host not in local_hosts:
        raise RuntimeError("This command only accepts the local PostgreSQL database")


async def fingerprints(db: AsyncSession) -> dict[str, dict[str, Any]]:
    result = {}
    for table in SOURCE_TABLES:
        row = (await db.execute(text(
            "SELECT count(*) AS count, "
            "md5(coalesce(string_agg(digest, '' ORDER BY digest), '')) AS digest "
            f"FROM (SELECT md5(to_jsonb(t)::text) AS digest FROM {table} t) d"
        ))).mappings().one()
        result[table] = dict(row)
    return result


async def source_records(db: AsyncSession) -> dict[str, list[dict[str, Any]]]:
    """The same projection is used for export and exact activation verification."""
    statements = {
        "articles": (
            "SELECT a.id, coalesce(s.name, 'Unknown source') AS source_name, "
            "a.title, a.url, coalesce(nullif(a.domain,''), 'unknown') AS domain, "
            "a.author, a.language, a.word_count, a.published_at "
            "FROM articles a LEFT JOIN sources s ON s.id=a.source_id ORDER BY a.id"
        ),
        "claims": (
            "SELECT id, article_id, claim_text AS text, extracted_at, confidence, "
            "verdict, verdict_probability, verdict_rationale AS rationale "
            "FROM claims ORDER BY id"
        ),
        "relationships": (
            "SELECT id, from_claim_id, to_claim_id, relationship_type, score, created_at "
            "FROM claim_relationships ORDER BY id"
        ),
    }
    result = {}
    for key, statement in statements.items():
        result[key] = [dict(row) for row in (await db.execute(text(statement))).mappings()]
    return result


def records_digest(records: dict[str, list[dict[str, Any]]]) -> str:
    normalized = {
        key: sorted(
            [model.model_validate(row).model_dump(mode="json") for row in records[key]],
            key=lambda row: row["id"],
        )
        for key, model in RECORD_TYPES.items()
    }
    body = json.dumps(normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(body.encode("utf8")).hexdigest()


async def ensure_idle(db: AsyncSession) -> None:
    if await db.scalar(text("SELECT count(*) FROM pipeline_jobs WHERE status='running'")):
        raise RuntimeError("Wait for the active pipeline to complete")


async def export_base(output: Path, source_commit: str) -> None:
    require_local_database()
    validate_source_commit(source_commit)
    audit_path = output.with_suffix(".audit.json")
    if output == audit_path or output.exists() or audit_path.exists():
        raise RuntimeError("Choose new snapshot and audit paths instead of overwriting")
    async with async_session_maker() as db, db.begin():
        await db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
        await ensure_idle(db)
        before = await fingerprints(db)
        records = await source_records(db)
    now = datetime.now(UTC)
    times = [row["extracted_at"] for row in records["claims"]]
    declaration = {
        "scope": "local_database_complete", "historical_claim_model_revision": "not_recorded",
    }
    payload = {
        "schema_version": "1", "run_id": str(uuid4()), "generated_at": now,
        "provenance": {
            "analysis_started_at": min(times, default=now),
            "analysis_completed_at": max(times, default=now),
            "source_commit": source_commit,
            "config_sha256": hashlib.sha256(
                json.dumps(declaration, sort_keys=True).encode()
            ).hexdigest(),
            "model_revisions": {"historical_claim_analysis": "not_recorded_in_source_database"},
        },
        **records,
    }
    snapshot = PublicationSnapshot.model_validate(payload)
    write_snapshot(output, snapshot.canonical_bytes(), local_only=True)
    receipt = {
        "scope": "local_database_only", "source_commit": source_commit,
        "fingerprints": before, "base_sha256": snapshot.sha256(),
        "records_sha256": records_digest(records),
        "historical_claim_provenance": declaration,
    }
    write_snapshot(audit_path, json.dumps(receipt, indent=2).encode("utf8"))
    print(json.dumps({
        "phase": "base_exported", **{key: len(rows) for key, rows in records.items()},
        "sha256": snapshot.sha256(),
    }), flush=True)


async def activate_local(path: Path, audit_path: Path, operator_id: UUID) -> None:
    require_local_database()
    if path.stat().st_size > LOCAL_SNAPSHOT_LIMIT or audit_path.stat().st_size > 1024 * 1024:
        raise RuntimeError("Snapshot or audit exceeds the local file size limit")
    snapshot = PublicationSnapshot.model_validate_json(path.read_bytes())
    if not snapshot.topic_map or not snapshot.city_network:
        raise RuntimeError("The complete topic map and city network must be built before activation")
    audit = json.loads(audit_path.read_text(encoding="utf8"))
    if (audit.get("scope") != "local_database_only"
            or audit.get("source_commit") != snapshot.provenance.source_commit
            or set(audit.get("fingerprints", {})) != set(SOURCE_TABLES)):
        raise RuntimeError("Use the original complete local export audit")
    async with async_session_maker() as db:
        operator = await db.get(User, operator_id, with_for_update=True)
        if operator is None or operator.role != "admin" or not operator.is_active:
            raise RuntimeError("Use an existing active local administrator as the operation owner")
        # store.activate commits its transaction. Hold SHARE locks until that commit,
        # so a collector cannot alter source rows between verification and activation.
        await db.execute(text(
            f"LOCK TABLE {', '.join(SOURCE_TABLES)}, pipeline_jobs IN SHARE MODE NOWAIT"
        ))
        await ensure_idle(db)
        if await fingerprints(db) != audit["fingerprints"]:
            raise RuntimeError("Source records changed; reconcile the snapshot before activation")
        current_records = await source_records(db)
        current_digest = records_digest(current_records)
        snapshot_records = {
            key: [row.model_dump(mode="json") for row in getattr(snapshot, key)]
            for key in RECORD_TYPES
        }
        if records_digest(snapshot_records) != current_digest:
            raise RuntimeError("Snapshot records do not exactly match the local collection")
        if audit.get("records_sha256", current_digest) != current_digest:
            raise RuntimeError("Export audit does not match the local source records")
        head = await db.get(PublicationHead, 1)
        if head is None:
            raise RuntimeError("Migrate the local database before preparing the map")
        revision = head.revision
        digest = snapshot.sha256()
        old = await db.get(PublicationUpload, snapshot.run_id)
        if old is not None and old.digest != digest:
            raise RuntimeError("Existing release has a different digest")
        if old is None:
            db.add(PublicationUpload(
                run_id=snapshot.run_id, digest=digest, uploaded_by=operator_id,
                payload=snapshot.model_dump(mode="json"),
            ))
            await db.flush()
        result = await activate(db, snapshot.run_id, digest, revision, operator_id)
        if await fingerprints(db) != audit["fingerprints"]:
            raise RuntimeError("Source fingerprint changed after activation; inspect the operation")
    receipt = {
        "scope": "local_database_only", "status": "active", "release": result,
        "source_fingerprints_unchanged": True, "records_sha256": current_digest,
        "topics": len(snapshot.topic_map.topics), "roads": len(snapshot.city_network.roads),
    }
    path.with_suffix(".activation.json").write_text(
        json.dumps(receipt, indent=2, default=str), encoding="utf8",
    )
    print(json.dumps(receipt, default=str), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    export = commands.add_parser("export")
    export.add_argument("--output", type=Path, required=True)
    export.add_argument("--source-commit", required=True)
    activate_cmd = commands.add_parser("activate")
    activate_cmd.add_argument("--snapshot", type=Path, required=True)
    activate_cmd.add_argument("--base-audit", type=Path, required=True)
    activate_cmd.add_argument("--operator-id", type=UUID, required=True)
    args = parser.parse_args()
    if args.command == "export":
        asyncio.run(export_base(args.output, args.source_commit))
    else:
        asyncio.run(activate_local(args.snapshot, args.base_audit, args.operator_id))


if __name__ == "__main__":
    main()
