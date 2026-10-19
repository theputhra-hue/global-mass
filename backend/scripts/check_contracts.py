"""Check versioned API routes/publication format without starting services.

Run from backend: python -m scripts.check_contracts --mode cloud
Use --write only when intentionally reviewing a contract change.
"""
from __future__ import annotations

import argparse
import importlib
import json
import os
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]


def contract(mode: str) -> dict[str, Any]:
    if mode == "publication":
        from app.schemas.publication import PublicationSnapshot
        return PublicationSnapshot.model_json_schema()
    entrypoint = "app.cloud" if mode == "cloud" else "app.main"
    app = importlib.import_module(entrypoint).app
    operations = sorted(
        f"{method.upper()} {path}"
        for path, methods in app.openapi()["paths"].items()
        if path.startswith("/api/v1")
        for method in methods
        if method in {"get", "post", "put", "patch", "delete", "options", "head"}
    )
    return {"contract_version": 1, "entrypoint": f"{entrypoint}:app", "operations": operations}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["local", "cloud", "publication"], required=True)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    # Schema inspection never uses the operator's live datastore configuration.
    # These inert addresses are not contacted: application lifespan is not run.
    os.environ.update(
        POSTGRES_URL=f"postgresql+{'psycopg' if args.mode == 'cloud' else 'asyncpg'}://fixture:fixture@127.0.0.1:1/contracts",
        REDIS_URL="redis://127.0.0.1:1/0", NEO4J_URI="",
        JWT_SECRET="contract-inspection-fixture-not-for-deployment",
        CORS_ORIGINS="http://localhost:3000", ENABLE_SCHEDULER="false",
        DEVELOPER_PIPELINE_ENABLED="false",
    )
    target = ROOT / "contracts" / ("publication-v3.schema.json" if args.mode == "publication" else f"{args.mode}-api-v1.routes.json")
    current = contract(args.mode)
    if args.write:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(current, indent=2, sort_keys=True) + "\n", encoding="utf8")
        print(f"WROTE {target.relative_to(ROOT)}; review the contract diff before committing")
        return 0
    if not target.exists() or json.loads(target.read_text(encoding="utf8")) != current:
        print(f"FAIL {target.relative_to(ROOT)} differs. Review compatibility; update explicitly with --write.")
        return 1
    print(f"PASS {args.mode} contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
