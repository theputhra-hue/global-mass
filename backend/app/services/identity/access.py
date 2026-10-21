"""Developer account directory and atomic visitor viewing-access decisions."""
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import HTTPException
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import RoleEnum, User
from app.repositories import session_repository


def account_json(user: User) -> dict[str, Any]:
    return {"id": str(user.id), "email": user.email, "full_name": user.full_name,
            "access_status": user.access_status, "revision": user.access_revision,
            "created_at": user.created_at, "reviewed_at": user.access_reviewed_at,
            "role": user.role.value, "is_active": user.is_active}


async def list_requests(db: AsyncSession, access_status: str, offset: int, limit: int) -> dict[str, Any]:
    groups = (await db.execute(select(User.access_status, func.count()).group_by(User.access_status))).all()
    counts = {key: 0 for key in ("pending", "approved", "rejected", "paused", "banned")}
    counts.update({str(key): count for key, count in groups})
    counts["all"] = sum(counts.values())
    query = select(User)
    if access_status != "all":
        query = query.where(User.access_status == access_status)
    rows = await db.scalars(query.order_by(User.created_at.desc(), User.id.desc()).offset(offset).limit(limit))
    return {"items": [account_json(user) for user in rows], "counts": counts,
            "total": counts[access_status], "limit": limit, "offset": offset}


async def review_request(db: AsyncSession, user_id: uuid.UUID, decision: Literal["approve", "reject"], expected_revision: int, reviewer_id: uuid.UUID) -> dict[str, Any]:
    status = "approved" if decision == "approve" else "rejected"
    reviewed_at = datetime.now(UTC)
    # Compare-and-swap prevents stale tabs/two developers replacing each other's
    # decision. The target predicate excludes developers and all writing roles.
    changed = await db.execute(update(User).where(
        User.id == user_id, User.role == RoleEnum.viewer, User.is_active.is_(True),
        User.access_status == "pending", User.access_revision == expected_revision,
    ).values(access_status=status, access_revision=User.access_revision + 1,
             access_reviewed_at=reviewed_at, access_reviewed_by=reviewer_id).returning(User.id))
    if changed.scalar_one_or_none() is None:
        await db.rollback()
        raise HTTPException(409, "This request is no longer pending or changed. Refresh the list before reviewing.")
    await db.commit()
    user = await db.get(User, user_id, populate_existing=True)
    assert user is not None
    return account_json(user)


async def control_account(db: AsyncSession, user_id: uuid.UUID, action: Literal["allow", "pause", "ban"], expected_revision: int, reviewer_id: uuid.UUID) -> dict[str, Any]:
    status = {"allow": "approved", "pause": "paused", "ban": "banned"}[action]
    now = datetime.now(UTC)
    values: dict[str, Any] = {"access_status": status, "access_revision": User.access_revision + 1,
                              "access_reviewed_at": now, "access_reviewed_by": reviewer_id}
    # Allow always means viewing only. Staff roles and disabled identities are
    # protected independently of any UI controls or submitted account metadata.
    if action == "allow":
        values["role"] = RoleEnum.viewer
    else:
        values["access_epoch"] = User.access_epoch + 1
    changed = await db.execute(update(User).where(
        User.id == user_id, User.id != reviewer_id,
        User.role.in_([RoleEnum.viewer, RoleEnum.user]), User.is_active.is_(True),
        User.access_revision == expected_revision,
        or_(User.access_status != status, User.role == RoleEnum.user) if action == "allow" else User.access_status != status,
        User.access_status != "banned" if action == "pause" else User.id == user_id,
    ).values(**values).returning(User.id))
    if changed.scalar_one_or_none() is None:
        await db.rollback()
        raise HTTPException(409, "Account changed, is already in this state, or is protected. Refresh accounts before continuing.")
    if action != "allow":
        await session_repository.revoke_all_for_user(db, user_id, now)
    await db.commit()
    user = await db.get(User, user_id, populate_existing=True)
    assert user is not None
    return account_json(user)
