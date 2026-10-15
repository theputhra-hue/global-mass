"""Account-owned, immutable comparison snapshots with editable analyst notes."""
import asyncio
import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.api.v1.graph import MutationCompareRequest
from app.models.investigation import Investigation
from app.models.user import User
from app.services.evolution.text_changes import analyze_text_change


def private_response(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Vary"] = "Authorization"


router = APIRouter(dependencies=[Depends(private_response)])
Status = Literal["open", "reviewed", "archived"]


class CaseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=160)
    notes: str = Field(default="", max_length=4000)
    comparison: MutationCompareRequest

    @field_validator("title")
    @classmethod
    def nonblank_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Provide a case title")
        return value.strip()


class CaseUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(strict=True, ge=1)
    notes: str = Field(max_length=4000)
    status: Status


def serialize(case: Investigation, *, detail: bool = False) -> dict[str, Any]:
    result: dict[str, Any] = {
        "id": str(case.id), "title": case.title, "notes": case.notes,
        "status": case.status, "revision": case.revision,
        "created_at": case.created_at, "updated_at": case.updated_at,
        "snapshot_sha256": case.snapshot_sha256,
    }
    if detail:
        result["snapshot"] = case.snapshot
    return result


@router.post("", status_code=201)
async def create_case(body: CaseCreate, db: AsyncSession = Depends(get_db_session), user: User = Depends(get_current_user)) -> dict[str, Any]:
    owner = user.id
    # Serialize quota decisions for this owner on PostgreSQL.
    await db.execute(select(User.id).where(User.id == owner).with_for_update())
    total = await db.scalar(select(func.count()).select_from(Investigation).where(Investigation.owner_id == owner)) or 0
    if total >= 200:
        raise HTTPException(409, "This account has reached the 200-case storage limit. Export existing cases for your records.")
    comparison = body.comparison
    analysis = await asyncio.to_thread(
        analyze_text_change, comparison.older_text, comparison.newer_text,
        older_timestamp=comparison.older_timestamp, newer_timestamp=comparison.newer_timestamp,
        context_note=comparison.context_note,
        provenance_url=str(comparison.provenance_url) if comparison.provenance_url else None,
    )
    captured = datetime.now(UTC)
    snapshot = {
        "schema_version": "gmee-case-v1", "captured_at": captured.isoformat(),
        "inputs": comparison.model_dump(mode="json", exclude={"include_summary"}),
        "analysis": analysis,
        "interpretation": "Server-computed text comparison; not observed propagation, a truth verdict or independent gold annotation. Source links are supplied references, not verified evidence.",
    }
    digest = hashlib.sha256(json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()
    case = Investigation(owner_id=owner, title=body.title, notes=body.notes, snapshot=snapshot, snapshot_sha256=digest, status="open", revision=1, created_at=captured, updated_at=captured)
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return serialize(case, detail=True)


@router.get("")
async def list_cases(
    q: str = Query(default="", max_length=160), archived: bool = False,
    limit: int = Query(default=20, ge=1, le=50), offset: int = Query(default=0, ge=0, le=200),
    db: AsyncSession = Depends(get_db_session), user: User = Depends(get_current_user),
) -> dict[str, Any]:
    filters: list[Any] = [Investigation.owner_id == user.id]
    filters.append(Investigation.status == "archived" if archived else Investigation.status != "archived")
    if q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        filters.append(Investigation.title.ilike(f"%{escaped}%", escape="\\"))
    total = await db.scalar(select(func.count()).select_from(Investigation).where(*filters)) or 0
    rows = await db.scalars(select(Investigation).where(*filters).order_by(Investigation.updated_at.desc(), Investigation.id.desc()).offset(offset).limit(limit))
    return {"items": [serialize(case) for case in rows], "total": total, "limit": limit, "offset": offset}


@router.get("/{case_id}")
async def get_case(case_id: uuid.UUID, db: AsyncSession = Depends(get_db_session), user: User = Depends(get_current_user)) -> dict[str, Any]:
    case = await db.scalar(select(Investigation).where(Investigation.id == case_id, Investigation.owner_id == user.id))
    if case is None:
        raise HTTPException(404, "Case not found")
    return serialize(case, detail=True)


@router.post("/{case_id}/review")
async def review_case(case_id: uuid.UUID, body: CaseUpdate, db: AsyncSession = Depends(get_db_session), user: User = Depends(get_current_user)) -> dict[str, Any]:
    # The owner predicate and expected revision are part of the single write.
    result = await db.execute(update(Investigation).where(
        Investigation.id == case_id, Investigation.owner_id == user.id, Investigation.revision == body.revision,
    ).values(notes=body.notes, status=body.status, revision=Investigation.revision + 1, updated_at=datetime.now(UTC)).returning(Investigation.id))
    if result.scalar_one_or_none() is None:
        exists = await db.scalar(select(Investigation.id).where(Investigation.id == case_id, Investigation.owner_id == user.id))
        if exists is None:
            raise HTTPException(404, "Case not found")
        raise HTTPException(409, "This case changed in another window. Reload before saving your notes.")
    await db.commit()
    return await get_case(case_id, db, user)
