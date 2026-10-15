"""Developer-only validation/staging; never replaces the live corpus."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.api.developer_access import can_upload, require_developer
from app.models.publication import PublicationUpload
from app.models.user import User
from app.schemas.publication import PublicationSnapshot

router = APIRouter()
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.get("/access")
async def upload_access(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return {"allowed": can_upload(user), "max_bytes": MAX_UPLOAD_BYTES, "mode": "staging"}


def receipt(row: PublicationUpload, *, replayed: bool = False) -> dict[str, Any]:
    payload = row.payload
    return {"run_id": str(row.run_id), "sha256": row.digest,
            "uploaded_at": row.uploaded_at, "status": "staged", "replayed": replayed,
            "articles": len(payload["articles"]), "claims": len(payload["claims"]),
            "relationships": len(payload["relationships"])}


@router.get("")
async def list_uploads(
    user: User = Depends(require_developer),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    rows = (await db.scalars(select(PublicationUpload).order_by(
        PublicationUpload.uploaded_at.desc()).limit(10))).all()
    return {"items": [receipt(row) for row in rows]}


@router.post("/upload")
async def upload_snapshot(
    request: Request,
    user: User = Depends(require_developer),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    # Bound actual streamed bytes, regardless of declared Content-Length.
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File exceeds the 10 MiB upload limit.")
        body.extend(chunk)
    try:
        snapshot = PublicationSnapshot.model_validate_json(bytes(body))
    except ValidationError as exc:
        # Avoid reflecting uploaded text/private fields in error responses.
        raise HTTPException(422, "Invalid publication file. Check its schema, IDs, references, scores and provenance.") from exc
    digest = snapshot.sha256()
    row = await db.get(PublicationUpload, snapshot.run_id)
    if row:
        if row.digest != digest:
            raise HTTPException(409, "This run ID already exists with different data.")
        return receipt(row, replayed=True)
    row = PublicationUpload(run_id=snapshot.run_id, digest=digest,
                            uploaded_by=user.id, payload=snapshot.model_dump(mode="json"))
    db.add(row)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await db.get(PublicationUpload, uuid.UUID(str(snapshot.run_id)))
        if existing is None or existing.digest != digest:
            raise HTTPException(409, "This run ID already exists with different data.") from None
        return receipt(existing, replayed=True)
    await db.refresh(row)
    return receipt(row)
