"""Developer review of visitor requests; approval grants viewing only."""
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, require_data_access
from app.api.developer_access import require_developer
from app.core.ops_security import record_audit
from app.models.user import User
from app.services.identity.access import list_requests, review_request

router = APIRouter(dependencies=[Depends(require_data_access)])
AccessStatus = Literal["all", "pending", "approved", "rejected"]


class AccessDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["approve", "reject"]
    expected_revision: int = Field(strict=True, ge=1)


@router.get("/accounts")
async def requests(
    access_status: AccessStatus = "all", offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db_session),
    developer: User = Depends(require_developer),
) -> dict[str, Any]:
    return await list_requests(db, access_status, offset, limit)


@router.post("/accounts/{user_id}/review")
async def review(
    user_id: uuid.UUID, body: AccessDecision, request: Request,
    db: AsyncSession = Depends(get_db_session), developer: User = Depends(require_developer),
) -> dict[str, Any]:
    result = await review_request(db, user_id, body.decision, body.expected_revision, developer.id)
    await record_audit(db, actor=developer.email, action=f"visitor.{result['access_status']}", target=str(user_id),
                       detail={"role": "viewer", "expected_revision": body.expected_revision}, request=request)
    return result
