"""Serve the existing Docker-backed corpus using the host's Python environment.

Never creates/replaces volumes or prints credentials. Run from backend:
python -m scripts.serve_local --frontend-origin https://gmee-v1.onrender.com
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
from collections.abc import Sequence
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from sqlalchemy.engine import URL


class LocalHostingError(RuntimeError):
    """An actionable startup message that never contains connection credentials."""


def frontend_origin(value: str) -> str:
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https" or not parsed.hostname or parsed.username
        or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment
    ):
        raise argparse.ArgumentTypeError("Use the frontend's HTTPS origin, without a path or credentials.")
    return f"https://{parsed.netloc}"


def inspect_container(name: str) -> dict[str, Any]:
    result = subprocess.run(
        ["docker", "inspect", name], capture_output=True, text=True, check=False, timeout=20,
    )
    if result.returncode:
        raise LocalHostingError(f"Cannot inspect {name}. Start Docker Desktop and the existing datastores first.")
    container: dict[str, Any] = json.loads(result.stdout)[0]
    if not container["State"]["Running"]:
        raise LocalHostingError(f"{name} is stopped. Start the existing container; do not create a new empty volume.")
    return container


def host_port(container: dict[str, Any], port: str) -> int:
    mappings = container["NetworkSettings"]["Ports"].get(port) or []
    for binding in mappings:
        if binding["HostIp"] in ("127.0.0.1", "0.0.0.0"):
            return int(binding["HostPort"])
    raise LocalHostingError(f"No IPv4 host mapping for {port}. Configure a loopback-only development port.")


def container_env(container: dict[str, Any]) -> dict[str, str]:
    return dict(item.split("=", 1) for item in container["Config"]["Env"] if "=" in item)


def configure(origin: str, additional_origins: Sequence[str] = ()) -> None:
    postgres = inspect_container("gmee_postgres")
    redis = inspect_container("gmee_redis")
    neo4j = inspect_container("gmee_neo4j")
    pg = container_env(postgres)
    if not pg.get("POSTGRES_PASSWORD"):
        raise LocalHostingError("The existing PostgreSQL container has no configured password.")
    os.environ["POSTGRES_URL"] = URL.create(
        "postgresql+asyncpg", username=pg.get("POSTGRES_USER", "postgres"),
        password=pg["POSTGRES_PASSWORD"], host="127.0.0.1", port=host_port(postgres, "5432/tcp"),
        database=pg.get("POSTGRES_DB", pg.get("POSTGRES_USER", "postgres")),
    ).render_as_string(hide_password=False)
    # Reuse the configured Redis password/database; never place its URL in logs.
    from sqlalchemy.engine import make_url

    from app.core.config import get_settings

    settings = get_settings()
    if not settings.REDIS_URL:
        raise LocalHostingError("Set REDIS_URL in the private root .env before starting.")
    os.environ["REDIS_URL"] = make_url(settings.REDIS_URL).set(
        host="127.0.0.1", port=host_port(redis, "6379/tcp"),
    ).render_as_string(hide_password=False)
    auth = container_env(neo4j).get("NEO4J_AUTH", "")
    if "/" not in auth or auth == "none":
        raise LocalHostingError("Existing Neo4j must use password authentication.")
    os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"] = auth.split("/", 1)
    os.environ["NEO4J_URI"] = f"bolt://127.0.0.1:{host_port(neo4j, '7687/tcp')}"
    os.environ["ENVIRONMENT"] = "production"
    os.environ["CORS_ORIGINS"] = json.dumps(list(dict.fromkeys([
        origin, *additional_origins, "http://127.0.0.1:5050", "http://localhost:5050",
    ])))
    os.environ["ENABLE_SCHEDULER"] = "false"
    os.environ["RATE_LIMIT_ENABLED"] = "true"
    # Set before importing transformers/huggingface_hub. Model preparation runs
    # in a separate process with networking; inference uses only its cache.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    # Ignore arbitrary forwarded headers. Tunnel users share conservative peer limits.
    os.environ["TRUSTED_PROXY_CIDRS"] = "[]"
    get_settings.cache_clear()


async def preflight() -> None:
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from sqlalchemy import text

    from app.api.v1.health import readiness_check
    from app.db.postgres import async_session_maker, engine

    try:
        async with async_session_maker() as db:
            heads: set[str] = set((await db.execute(text("SELECT version_num FROM alembic_version"))).scalars())
            expected = set(ScriptDirectory.from_config(Config("alembic.ini")).get_heads())
            if heads != expected:
                raise LocalHostingError("Database schema differs from this checkout. Back up and rehearse migrations before serving.")
            health = await readiness_check(db=db)
            if not isinstance(health, dict) or health["status"] != "ready":
                raise LocalHostingError("Datastore readiness failed; check PostgreSQL, Redis and Neo4j locally.")
            counts = (await db.execute(text(
                "SELECT (SELECT COUNT(*) FROM articles), (SELECT COUNT(*) FROM claims)"
            ))).one()
            print(f"Preflight passed: {counts[0]} articles; {counts[1]} claims. No migrations applied.")
    finally:
        await engine.dispose()
        # Avoid keeping event-loop-bound datastore clients across asyncio.run().
        from app.db.neo4j_client import neo4j_client
        from app.db.redis_client import redis_client

        await neo4j_client.close()
        neo4j_client.driver = None
        await redis_client.close()
        redis_client.client = None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend-origin", type=frontend_origin, required=True)
    parser.add_argument("--additional-frontend-origin", type=frontend_origin, action="append", default=[])
    parser.add_argument("--check", action="store_true", help="Read-only schema/readiness/count preflight, then exit.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    os.chdir(Path(__file__).resolve().parents[1])
    try:
        configure(args.frontend_origin, args.additional_frontend_origin)
        asyncio.run(preflight())
        if args.check:
            return 0
        from app.services.nlp.embedding_service import EmbeddingService

        # Preparation is a separate explicit command. Serving never downloads weights.
        EmbeddingService.load_model(local_files_only=True)
        if not EmbeddingService.is_loaded():
            raise LocalHostingError("Local embedding model not loaded. Unset HUGGINGFACE_API_KEY for this local-model profile.")
    except LocalHostingError as exc:
        print(f"Startup stopped: {exc}")
        return 1
    except Exception as exc:
        print(f"Startup stopped ({type(exc).__name__}). Check datastores/schema and run python -m scripts.prepare_local_models.")
        return 1
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=args.port, proxy_headers=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
