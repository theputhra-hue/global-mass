"""A case snapshot survives competing PostgreSQL review edits unchanged."""
import asyncio
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import delete

from app.api.v1.casebook import (
    CaseCreate,
    CaseUpdate,
    create_case,
    get_case,
    review_case,
)
from app.api.v1.graph import MutationCompareRequest
from app.db.postgres import async_session_maker, engine
from app.models.investigation import Investigation
from app.models.user import RoleEnum, User

pytestmark = pytest.mark.integration


async def test_casebook_concurrent_reviews_have_one_winner() -> None:
    await engine.dispose()
    user = User(id=uuid.uuid4(),email=f"case-fixture-{uuid.uuid4().hex}@example.com",hashed_password="test-only",role=RoleEnum.user,is_active=True)
    owner_id = user.id
    try:
        async with async_session_maker() as db:
            db.add(user)
            await db.commit()
            original = await create_case(CaseCreate(title="Concurrent fixture",comparison=MutationCompareRequest(older_text="The agency found 10 survivors.",newer_text="The agency found 12 survivors.")),db,user)
        case_id = uuid.UUID(original["id"])
        start = asyncio.Event()

        async def edit(note: str) -> dict[str, object] | HTTPException:
            async with async_session_maker() as db:
                await start.wait()
                try:
                    return await review_case(case_id,CaseUpdate(revision=1,notes=note,status="reviewed"),db,user)
                except HTTPException as exc:
                    return exc

        tasks = [asyncio.create_task(edit(note)) for note in ("left","right")]
        start.set()
        results = await asyncio.gather(*tasks)
        failures = [result for result in results if isinstance(result,HTTPException)]
        assert len(failures)==1 and failures[0].status_code==409
        async with async_session_maker() as db:
            latest = await get_case(case_id,db,user)
        assert latest["revision"]==2 and latest["notes"] in {"left","right"}
        assert latest["snapshot"]==original["snapshot"]
        assert latest["snapshot_sha256"]==original["snapshot_sha256"]
    finally:
        async with async_session_maker() as db:
            await db.execute(delete(Investigation).where(Investigation.owner_id==owner_id))
            await db.execute(delete(User).where(User.id==owner_id))
            await db.commit()
        await engine.dispose()
