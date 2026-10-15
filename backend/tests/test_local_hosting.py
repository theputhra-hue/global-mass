import argparse
import subprocess
from typing import Any

import pytest

from scripts.serve_local import frontend_origin, host_port, inspect_container


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
