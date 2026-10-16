"""Status polling must not materialize the full release or mix staged data."""
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import event

from app.models.publication import PublicationHead, PublicationUpload
from app.services.publications.store import history, status
from tests.test_publication_contract import snapshot_payload


async def test_status_without_a_head_or_release_is_empty(db_session):
    empty = await status(db_session)
    assert empty["revision"] == 0 and empty["run_id"] is None
    assert empty["counts"] == {"articles": 0, "claims": 0, "relationships": 0}
    db_session.add(PublicationHead(id=1, revision=0))
    await db_session.commit()
    assert await status(db_session) == empty


async def test_status_extracts_metadata_without_fetching_the_release(db_session):
    payload = snapshot_payload()
    payload["articles"][0]["title"] = "Private fixture padding " * 100_000
    run_id = UUID(payload["run_id"])
    stamp = datetime(2026, 10, 16, tzinfo=UTC)
    db_session.add_all([
        PublicationUpload(run_id=run_id, digest="a" * 64, uploaded_by=uuid4(), payload=payload),
        PublicationUpload(run_id=uuid4(), digest="b" * 64, uploaded_by=uuid4(), payload=snapshot_payload()),
        PublicationHead(id=1, run_id=run_id, revision=7, published_at=stamp),
    ])
    await db_session.commit()
    db_session.expunge_all()
    columns: list[str] = []

    def capture_columns(conn, cursor, statement, parameters, context, executemany):
        columns.extend(column[0] for column in cursor.description or [])

    engine = db_session.bind.sync_engine
    event.listen(engine, "after_cursor_execute", capture_columns)
    try:
        result = await status(db_session)
    finally:
        event.remove(engine, "after_cursor_execute", capture_columns)
    assert result["revision"] == 7 and result["run_id"] == str(run_id)
    assert result["generated_at"] == payload["generated_at"]
    assert result["analysis_completed_at"] == payload["provenance"]["analysis_completed_at"]
    assert result["sha256"] == "a" * 64
    assert result["counts"] == {"articles": 1, "claims": 2, "relationships": 1}
    assert len(columns) == 9 and "payload" not in columns
    assert not any(isinstance(row, PublicationUpload) for row in db_session.identity_map.values())


async def test_history_is_bounded_and_does_not_load_payloads(db_session):
    for day in range(1, 13):
        payload = snapshot_payload()
        db_session.add(PublicationUpload(
            run_id=UUID(payload["run_id"]), digest=str(day).zfill(64),
            uploaded_by=uuid4(), uploaded_at=datetime(2026, 10, day, tzinfo=UTC),
            payload=payload,
        ))
    await db_session.commit()
    db_session.expunge_all()
    rows = await history(db_session)
    assert len(rows) == 10
    assert [int(row["sha256"]) for row in rows] == list(range(12, 2, -1))
    assert all(row["articles"] == 1 and row["claims"] == 2 and row["relationships"] == 1 for row in rows)
    assert all(row["status"] == "staged" and row["replayed"] is False and "payload" not in row for row in rows)
    assert not any(isinstance(row, PublicationUpload) for row in db_session.identity_map.values())
