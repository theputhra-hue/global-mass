"""Only one reviewed release wins a concurrent publication revision."""
import asyncio
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import delete

from app.db.postgres import async_session_maker, engine
from app.models.publication import (
    PublicationHead,
    PublicationUpload,
    PublishedArticleRow,
    PublishedClaimRow,
    PublishedRelationshipRow,
)
from app.schemas.publication import PublicationSnapshot
from app.services.publications.store import activate
from tests.test_publication_contract import snapshot_payload

pytestmark = pytest.mark.integration


async def test_concurrent_publications_switch_exactly_one_complete_release():
    await engine.dispose()
    snapshots = [PublicationSnapshot.model_validate(snapshot_payload()) for _ in range(2)]
    ids = [s.run_id for s in snapshots]
    actor = uuid.uuid4()
    async with async_session_maker() as db:
        head = await db.get(PublicationHead, 1)
        assert head is not None
        saved = {key: getattr(head, key) for key in ("run_id", "revision", "published_at", "published_by")}
        for snapshot in snapshots:
            db.add(PublicationUpload(run_id=snapshot.run_id, digest=snapshot.sha256(), uploaded_by=actor, payload=snapshot.model_dump(mode="json")))
        await db.commit()
    start = asyncio.Event()

    async def publish(snapshot: PublicationSnapshot) -> int:
        async with async_session_maker() as db:
            await start.wait()
            try:
                await activate(db, snapshot.run_id, snapshot.sha256(), saved["revision"], actor)
                return 200
            except HTTPException as exc:
                return exc.status_code

    try:
        tasks = [asyncio.create_task(publish(s)) for s in snapshots]
        start.set()
        assert sorted(await asyncio.gather(*tasks)) == [200, 409]
        async with async_session_maker() as db:
            head = await db.get(PublicationHead, 1)
            assert head is not None and head.run_id in ids
            assert head.revision == saved["revision"] + 1
            snapshot = next(s for s in snapshots if s.run_id == head.run_id)
            for a in snapshot.articles:
                assert await db.get(PublishedArticleRow, (snapshot.run_id, a.id)) is not None
            for c in snapshot.claims:
                assert await db.get(PublishedClaimRow, (snapshot.run_id, c.id)) is not None
    finally:
        async with async_session_maker() as db:
            head = await db.get(PublicationHead, 1)
            assert head is not None
            for key, value in saved.items():
                setattr(head, key, value)
            await db.flush()
            for model in (PublishedRelationshipRow, PublishedClaimRow, PublishedArticleRow, PublicationUpload):
                await db.execute(delete(model).where(model.run_id.in_(ids)))
            await db.commit()
        await engine.dispose()
