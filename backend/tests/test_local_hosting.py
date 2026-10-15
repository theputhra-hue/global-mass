import argparse
import json
import os
import subprocess
from types import SimpleNamespace
from typing import Any
from unittest.mock import Mock

import pytest

from scripts.serve_local import configure, frontend_origin, host_port, inspect_container


@pytest.mark.parametrize("origin", [
    "http://example.com", "https://name:secret@example.com", "https://example.com/path",
    "https://example.com?key=value", "https://example.com/#fragment", "https://",
])
def test_frontend_origin_rejects_non_origins(origin: str) -> None:
    with pytest.raises(argparse.ArgumentTypeError):
        frontend_origin(origin)


def test_frontend_origin_accepts_exact_https_origin() -> None:
    assert frontend_origin("https://gmee-v1.onrender.com/") == "https://gmee-v1.onrender.com"


def test_host_port_uses_published_port_and_rejects_missing_mapping() -> None:
    container: dict[str, Any] = {"NetworkSettings": {"Ports": {"5432/tcp": [{"HostIp": "127.0.0.1", "HostPort": "55432"}]}}}
    assert host_port(container, "5432/tcp") == 55432
    with pytest.raises(RuntimeError, match="loopback-only"):
        host_port(container, "6379/tcp")


def test_docker_failure_does_not_echo_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    def failed(*args: Any, **kwargs: Any) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args=[], returncode=1, stdout="", stderr="secret credential details")

    monkeypatch.setattr(subprocess, "run", failed)
    with pytest.raises(RuntimeError, match="Start Docker Desktop") as error:
        inspect_container("gmee_postgres")
    assert "secret" not in str(error.value)


def test_host_configuration_preserves_origins_and_uses_cache_only_models(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core import config
    from scripts import serve_local

    # Ensure all environment changes, including additions, are restored by pytest.
    for key in (
        "POSTGRES_URL", "REDIS_URL", "NEO4J_USER", "NEO4J_PASSWORD", "NEO4J_URI",
        "ENVIRONMENT", "CORS_ORIGINS", "ENABLE_SCHEDULER", "RATE_LIMIT_ENABLED",
        "TRUSTED_PROXY_CIDRS", "HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE",
    ):
        monkeypatch.setenv(key, os.environ.get(key, ""))
    container: dict[str, Any] = {
        "Config": {"Env": ["POSTGRES_USER=fixture", "POSTGRES_PASSWORD=fixture-only",
                            "POSTGRES_DB=fixture", "NEO4J_AUTH=neo4j/fixture-only"]},
        "NetworkSettings": {"Ports": {
            port: [{"HostIp": "127.0.0.1", "HostPort": published}]
            for port, published in [("5432/tcp", "55432"), ("6379/tcp", "56379"), ("7687/tcp", "57687")]
        }},
    }
    monkeypatch.setattr(serve_local, "inspect_container", lambda _: container)
    settings = Mock(return_value=SimpleNamespace(REDIS_URL="redis://127.0.0.1:6379/2"))
    monkeypatch.setattr(config, "get_settings", settings)
    configure("https://global-mass.onrender.com", ["https://gmee-v1.onrender.com"])
    origins = json.loads(os.environ["CORS_ORIGINS"])
    assert origins[:2] == ["https://global-mass.onrender.com", "https://gmee-v1.onrender.com"]
    assert "*" not in origins
    assert os.environ["REDIS_URL"] == "redis://127.0.0.1:56379/2"
    assert os.environ["HF_HUB_OFFLINE"] == os.environ["TRANSFORMERS_OFFLINE"] == "1"
    assert os.environ["ENABLE_SCHEDULER"] == "false"
    assert os.environ["TRUSTED_PROXY_CIDRS"] == "[]"
    settings.cache_clear.assert_called_once()
