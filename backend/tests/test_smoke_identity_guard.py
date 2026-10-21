"""The disposable smoke bootstrap can never target a deployed datastore."""
import pytest

from app.core.config import get_settings
from scripts.bootstrap_smoke_accounts import assert_fixture_target


def test_smoke_account_bootstrap_requires_all_fixture_guards(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "ENVIRONMENT", "testing")
    monkeypatch.setattr(settings, "POSTGRES_URL", "postgresql+asyncpg://fixture:fixture@postgres/gmee_smoke_fixture")
    monkeypatch.setenv("GMEE_SMOKE_FIXTURE", "1")
    assert_fixture_target()
    for value in ("production", "development"):
        monkeypatch.setattr(settings, "ENVIRONMENT", value)
        with pytest.raises(RuntimeError, match="Refusing"):
            assert_fixture_target()
    monkeypatch.setattr(settings, "ENVIRONMENT", "testing")
    for value in ("postgresql+asyncpg://fixture:fixture@localhost/gmee_smoke_fixture", "postgresql+asyncpg://fixture:fixture@postgres/production"):
        monkeypatch.setattr(settings, "POSTGRES_URL", value)
        with pytest.raises(RuntimeError, match="Refusing"):
            assert_fixture_target()
    monkeypatch.setattr(settings, "POSTGRES_URL", "postgresql+asyncpg://fixture:fixture@postgres/gmee_smoke_fixture")
    monkeypatch.delenv("GMEE_SMOKE_FIXTURE")
    with pytest.raises(RuntimeError, match="Refusing"):
        assert_fixture_target()
