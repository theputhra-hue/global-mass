"""Guards for local atlas exports and activation against the actual source corpus."""
import argparse
import copy
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.publication import PublicationHead, PublicationUpload
from app.models.user import User
from app.schemas.publication import PublicationSnapshot
from scripts import map_runtime, prepare_local_atlas
from tests.test_city_network import city_payload


def test_runtime_preserves_configured_environment_and_requires_full_revision(monkeypatch):
    configure = MagicMock()
    monkeypatch.setattr("scripts.serve_local.configure", configure)
    args = argparse.Namespace(configured_environment=True, source_commit="a" * 40)
    assert map_runtime.configure_runtime(args) == "a" * 40
    configure.assert_not_called()
    args.configured_environment = False
    args.source_commit = "a9e0b79"
    with pytest.raises(ValueError, match="40-character"):
        map_runtime.configure_runtime(args)
    configure.assert_not_called()


def test_snapshot_requires_explicit_local_limit_and_never_replaces(tmp_path):
    body = b"x" * (map_runtime.CLOUD_SNAPSHOT_LIMIT + 1)
    target = tmp_path / "snapshot.json"
    with pytest.raises(RuntimeError, match="no data was truncated"):
        map_runtime.write_snapshot(target, body)
    assert not target.exists()
    map_runtime.write_snapshot(target, body, local_only=True)
    assert target.read_bytes() == body
    with pytest.raises(FileExistsError):
        map_runtime.write_snapshot(target, b"changed", local_only=True)
    assert target.read_bytes() == body
    with pytest.raises(RuntimeError):
        map_runtime.write_snapshot(
            tmp_path / "too-large.json", b"x" * (map_runtime.LOCAL_SNAPSHOT_LIMIT + 1),
            local_only=True,
        )


@pytest.mark.parametrize("host", ["localhost", "127.0.0.1", "[::1]", "postgres", "gmee_postgres"])
def test_local_database_guard_accepts_loopback_and_compose_hosts(monkeypatch, host):
    monkeypatch.setattr(prepare_local_atlas, "get_settings", lambda: SimpleNamespace(
        POSTGRES_URL=f"postgresql+asyncpg://user:secret@{host}/test",
    ))
    prepare_local_atlas.require_local_database()


def test_local_database_guard_refuses_cloud_without_disclosing_credentials(monkeypatch):
    monkeypatch.setattr(prepare_local_atlas, "get_settings", lambda: SimpleNamespace(
        POSTGRES_URL="postgresql+asyncpg://private-user:private-password@cloud.example/db",
    ))
    with pytest.raises(RuntimeError, match="only accepts the local PostgreSQL") as exc:
        prepare_local_atlas.require_local_database()
    assert "private" not in str(exc.value) and "cloud.example" not in str(exc.value)


@pytest.fixture
def local_operation(monkeypatch, tmp_path):
    snapshot = PublicationSnapshot.model_validate(city_payload())
    records = {
        key: [row.model_dump(mode="json") for row in getattr(snapshot, key)]
        for key in prepare_local_atlas.RECORD_TYPES
    }
    fingerprints = {key: {"count": 3, "digest": "a" * 32}
                    for key in prepare_local_atlas.SOURCE_TABLES}
    audit = {"scope": "local_database_only", "source_commit": "a" * 40,
             "fingerprints": fingerprints}
    path, audit_path = tmp_path / "city.json", tmp_path / "base.audit.json"
    path.write_bytes(snapshot.canonical_bytes())
    audit_path.write_text(json.dumps(audit), encoding="utf8")
    owner = uuid4()
    db = MagicMock()
    db.__aenter__ = AsyncMock(return_value=db)
    db.__aexit__ = AsyncMock(return_value=False)
    transaction = MagicMock()
    transaction.__aenter__ = AsyncMock()
    transaction.__aexit__ = AsyncMock(return_value=False)
    db.begin.return_value = transaction
    db.execute = AsyncMock()
    db.scalar = AsyncMock(return_value=0)
    db.flush = AsyncMock()
    operator = SimpleNamespace(role="admin", is_active=True)

    async def get(model, key, **kwargs):
        if model is User:
            return operator
        if model is PublicationHead:
            return SimpleNamespace(revision=4)
        if model is PublicationUpload:
            return None
        raise AssertionError(model)

    db.get = AsyncMock(side_effect=get)
    monkeypatch.setattr(prepare_local_atlas, "require_local_database", lambda: None)
    monkeypatch.setattr(prepare_local_atlas, "async_session_maker", lambda: db)
    monkeypatch.setattr(prepare_local_atlas, "source_records", AsyncMock(return_value=records))
    monkeypatch.setattr(prepare_local_atlas, "fingerprints", AsyncMock(return_value=fingerprints))
    activation = AsyncMock(return_value={"revision": 5})
    monkeypatch.setattr(prepare_local_atlas, "activate", activation)
    return SimpleNamespace(
        snapshot=snapshot, records=records, audit=audit, path=path, audit_path=audit_path,
        owner=owner, db=db, operator=operator, activation=activation,
    )


async def test_export_includes_articles_without_claims_and_records_unknown_provenance(local_operation, tmp_path):
    op = local_operation
    # Use database-shaped datetime objects; the public serialization is normalized.
    for key in prepare_local_atlas.RECORD_TYPES:
        op.records[key] = [row.model_dump() for row in getattr(op.snapshot, key)]
    output = tmp_path / "exported-base.json"
    await prepare_local_atlas.export_base(output, "a" * 40)
    result = PublicationSnapshot.model_validate_json(output.read_bytes())
    assert len(result.articles) == 4 and len(result.claims) == 2
    assert result.relationships == op.snapshot.relationships
    assert result.provenance.model_revisions == {
        "historical_claim_analysis": "not_recorded_in_source_database",
    }
    assert "REPEATABLE READ READ ONLY" in str(op.db.execute.call_args_list[0].args[0])
    audit = json.loads(output.with_suffix(".audit.json").read_text())
    assert audit["records_sha256"] == prepare_local_atlas.records_digest(op.records)
    assert audit["base_sha256"] == result.sha256()
    op.db.add.assert_not_called()
    op.activation.assert_not_called()


async def test_activation_matches_every_source_record_and_locks_until_commit(local_operation):
    op = local_operation
    # Records do not need the same arbitrary list order to match the source.
    op.records["claims"].reverse()
    await prepare_local_atlas.activate_local(op.path, op.audit_path, op.owner)
    statement = str(op.db.execute.call_args_list[0].args[0])
    assert statement.startswith("LOCK TABLE ") and statement.endswith("IN SHARE MODE NOWAIT")
    assert all(table in statement for table in prepare_local_atlas.SOURCE_TABLES)
    op.activation.assert_awaited_once_with(
        op.db, op.snapshot.run_id, op.snapshot.sha256(), 4, op.owner,
    )
    assert op.db.get.call_args_list[0].kwargs == {"with_for_update": True}
    receipt = json.loads(op.path.with_suffix(".activation.json").read_text())
    assert receipt["source_fingerprints_unchanged"] is True
    assert receipt["records_sha256"] == prepare_local_atlas.records_digest(op.records)


@pytest.mark.parametrize("fault", ["changed_article", "changed_claim", "omitted_relationship", "changed_score"])
async def test_activation_rejects_modified_projection_before_any_write(local_operation, fault):
    op = local_operation
    payload = op.snapshot.model_dump(mode="json")
    if fault == "changed_article":
        payload["articles"][0]["title"] = "Not the local title"
    elif fault == "changed_claim":
        payload["claims"][0]["text"] = "Not the local claim"
    elif fault == "omitted_relationship":
        payload["relationships"] = []
    else:
        payload["relationships"][0]["score"] = .2
    op.path.write_bytes(PublicationSnapshot.model_validate(payload).canonical_bytes())
    with pytest.raises(RuntimeError, match="exactly match"):
        await prepare_local_atlas.activate_local(op.path, op.audit_path, op.owner)
    op.db.add.assert_not_called()
    op.activation.assert_not_called()


@pytest.mark.parametrize("fault", ["inactive", "role", "busy", "fingerprint", "audit_scope"])
async def test_activation_preconditions_fail_before_staging(local_operation, fault):
    op = local_operation
    if fault == "inactive":
        op.operator.is_active = False
    elif fault == "role":
        op.operator.role = "reader"
    elif fault == "busy":
        op.db.scalar.return_value = 1
    elif fault == "fingerprint":
        audit = copy.deepcopy(op.audit)
        audit["fingerprints"]["claims"]["digest"] = "b" * 32
        op.audit_path.write_text(json.dumps(audit))
    else:
        op.audit["scope"] = "remote_published_snapshot"
        op.audit_path.write_text(json.dumps(op.audit))
    with pytest.raises(RuntimeError):
        await prepare_local_atlas.activate_local(op.path, op.audit_path, op.owner)
    op.db.add.assert_not_called()
    op.activation.assert_not_called()
