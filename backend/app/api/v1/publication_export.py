"""Local-only export download, using a stable read snapshot and no AI inference."""
import asyncio
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, ValidationError
from sqlalchemy import text

from app.api.developer_access import require_local_pipeline
from app.core.config import get_settings
from app.db.postgres import async_session_maker
from app.schemas.publication import PublicationProvenance
from app.services.publications.export import export_snapshot

router = APIRouter(dependencies=[Depends(require_local_pipeline)])


@router.get("/export-hints")
async def export_hints() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[4]
    revision = await asyncio.to_thread(subprocess.run, ["git", "rev-parse", "HEAD"], cwd=root, capture_output=True, text=True, check=False)
    models: dict[str, str] = {}
    try:
        manifest = json.loads((root / ".local-deployment/models.json").read_text(encoding="utf8"))
        models = {row["role"]: row["revision"] for row in manifest["models"] if row.get("revision")}
    except (OSError, KeyError, TypeError, ValueError):
        pass
    settings = get_settings()
    # Only non-secret algorithm configuration contributes to this public fingerprint.
    config = {key: getattr(settings, key) for key in (
        "EMBEDDING_MODEL", "NLI_MODEL", "NLI_MODEL_REVISION", "NLI_CONFIDENCE_MIN", "LLM_BACKEND",
        "LLM_MODEL", "EVOLUTION_SIMILARITY_THRESHOLD", "SIMILAR_TO_THRESHOLD", "BERTOPIC_MIN_TOPIC_SIZE")}
    return {"source_commit": revision.stdout.strip() if revision.returncode == 0 else "",
            "config_sha256": hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest(),
            "model_revisions": models,
            "notice": "These describe the current local configuration, not historical runs. Verify they match your selected analysis period."}


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provenance: PublicationProvenance
    reviewed: Literal[True]


@router.post("/export")
async def export_file(body: ExportRequest) -> Response:
    try:
        async with async_session_maker() as db, db.begin():
            if db.get_bind().dialect.name == "postgresql":
                await db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
            snapshot = await export_snapshot(db, body.provenance)
    except ValidationError as exc:
        raise HTTPException(422, "Some analysis records do not meet the publication contract. Review missing metadata, lengths, scores and provenance.") from exc
    data = snapshot.canonical_bytes()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Export exceeds 10 MiB. Choose a smaller analysis period.")
    return Response(data, media_type="application/json", headers={
        "Content-Disposition": f'attachment; filename="gmee-publication-{snapshot.run_id}.json"',
        "X-Content-SHA256": snapshot.sha256(), "Cache-Control": "no-store"})
