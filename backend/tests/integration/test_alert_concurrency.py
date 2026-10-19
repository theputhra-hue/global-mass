"""Alert evaluation and acknowledgement are atomic across PostgreSQL sessions."""
import asyncio
import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import delete, select

from app.api.v1.alerts import acknowledge_alert
from app.db.postgres import async_session_maker, engine
from app.models.evolution import Alert
from app.services.operations.alerts import _upsert_alert

pytestmark = pytest.mark.integration


async def test_concurrent_alert_evaluation_and_acknowledgement() -> None:
    await engine.dispose()
    subject = f"fixture:{uuid.uuid4().hex}"
    item = {
        "kind": "MUTATION", "subject_key": subject, "title": "Fixture alert",
        "severity": "WARNING", "body": "Concurrent fixture", "claim_id": None,
        "payload": {"fixture": True},
    }
    ready = asyncio.Event()

    async def evaluate() -> bool:
        async with async_session_maker() as db:
            await ready.wait()
            inserted = await _upsert_alert(db, item, datetime.now(UTC))
            await db.commit()
            return inserted

    try:
        evaluations = [asyncio.create_task(evaluate()) for _ in range(6)]
        ready.set()
        assert (await asyncio.gather(*evaluations)).count(True) == 1
        async with async_session_maker() as db:
            alert = (await db.scalars(select(Alert).where(Alert.subject_key == subject))).one()
            alert_id = alert.id

        ready.clear()

        async def acknowledge() -> str:
            async with async_session_maker() as db:
                await ready.wait()
                result = await acknowledge_alert(alert_id, db)
                return str(result["acknowledged_at"])

        acknowledgements = [asyncio.create_task(acknowledge()) for _ in range(6)]
        ready.set()
        stamps = await asyncio.gather(*acknowledgements)
        assert len(set(stamps)) == 1
        async with async_session_maker() as db:
            alert = (await db.scalars(select(Alert).where(Alert.id == alert_id))).one()
            assert alert.acknowledged_at is not None
            assert alert.acknowledged_at.isoformat() == stamps[0]
    finally:
        async with async_session_maker() as db:
            await db.execute(delete(Alert).where(Alert.subject_key == subject))
            await db.commit()
        await engine.dispose()
