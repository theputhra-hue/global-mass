"""Developer-only validation/staging; never replaces the live corpus."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.api.developer_access import can_upload, require_developer
from app.core.config import get_settings
from app.models.publication import PublicationHead, PublicationUpload
from app.models.user import User
from app.schemas.publication import PublicationSnapshot
from app.services.publications import store as publication_store


def private_response(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Vary"] = "Authorization"


router = APIRouter(dependencies=[Depends(private_response)])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.get("/access")
async def upload_access(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return {"allowed": can_upload(user), "max_bytes": MAX_UPLOAD_BYTES,
            "mode": "publishing" if get_settings().PUBLICATION_ACTIVATION_ENABLED else "staging"}


@router.get("/status")
async def public_status(db: AsyncSession = Depends(get_db_session)) -> dict[str, Any]:
    return await publication_store.status(db)


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
    return {"items": await publication_store.history(db)}


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
    # Bounded storage on the free deployment; never silently delete prior releases.
    await db.scalar(select(PublicationHead).where(PublicationHead.id == 1).with_for_update())
    if (await db.scalar(select(func.count()).select_from(PublicationUpload)) or 0) >= get_settings().PUBLICATION_MAX_UPLOADS:
        raise HTTPException(409, "Release storage limit reached. Ask an operator to archive old releases before uploading.")
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


@router.get("/{run_id}/review")
async def review_upload(
    run_id: uuid.UUID, user: User = Depends(require_developer),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    # Review needs bounded metadata/samples, not the whole multi-megabyte file.
    payload = PublicationUpload.payload
    statement = select(
        PublicationUpload.run_id, PublicationUpload.digest, PublicationUpload.uploaded_at,
        payload["generated_at"].as_string().label("generated_at"),
        payload["provenance"].label("provenance"),
        payload["schema_version"].as_string().label("schema_version"),
        func.json_array_length(payload["topic_map"]["topics"]).label("topic_count"),
        func.json_array_length(payload["topic_map"]["assignments"]).label("mapped_articles"),
        *(func.json_array_length(payload["city_network"][key]).label("city_" + key)
          for key in ("roads", "highways", "themes", "superways")),
        *(func.json_array_length(payload[key]).label(key)
          for key in ("articles", "claims", "relationships")),
        *(payload[key][index].label(f"{key}_{index}")
          for key in ("articles", "claims") for index in range(5)),
    ).where(PublicationUpload.run_id == run_id)
    row = (await db.execute(statement)).mappings().one_or_none()
    if row is None:
        raise HTTPException(404, "Upload not found.")
    return {"run_id": str(row["run_id"]), "sha256": row["digest"],
            "uploaded_at": row["uploaded_at"], "status": "staged", "replayed": False,
            **{key: row[key] for key in ("articles", "claims", "relationships")},
            "generated_at": row["generated_at"], "provenance": row["provenance"],
            "schema_version": row["schema_version"],
            "article_map": {"topics": row["topic_count"], "articles": row["mapped_articles"]} if row["schema_version"] in ("2", "3") else None,
            "city_network": {key: row["city_" + key] for key in ("roads", "highways", "themes", "superways")} if row["schema_version"] == "3" else None,
            "sample_articles": [row[f"articles_{index}"] for index in range(5) if row[f"articles_{index}"] is not None],
            "sample_claims": [row[f"claims_{index}"] for index in range(5) if row[f"claims_{index}"] is not None],
            "current": await publication_store.status(db)}


class PublishRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    expected_revision: int = Field(ge=0)
    reviewed: bool


@router.post("/{run_id}/publish")
async def publish_upload(
    run_id: uuid.UUID, body: PublishRequest,
    user: User = Depends(require_developer), db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    if not get_settings().PUBLICATION_ACTIVATION_ENABLED:
        raise HTTPException(403, "Publication activation is disabled on this server.")
    if not body.reviewed:
        raise HTTPException(422, "Review the analysis and confirm publication first.")
    return await publication_store.activate(db, run_id, body.sha256, body.expected_revision, user.id)
