"""Run from backend with the cloud dependency lock, without runtime credentials."""
import os
import sys
from pathlib import Path

os.environ.update(POSTGRES_URL="postgresql+psycopg://fixture:fixture@localhost/fixture",
    CORS_ORIGINS="https://global-mass.onrender.com", REDIS_URL="redis://localhost:6379/14",
    JWT_SECRET="cloud-runtime-isolation-fixture-secret-32-characters",
    ENABLE_SCHEDULER="false", DEVELOPER_PIPELINE_ENABLED="false")
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.cloud import app

paths = app.openapi()["paths"]
for module in ("torch", "spacy", "transformers", "sentence_transformers", "bertopic", "sklearn", "numpy", "pandas"):
    if module in sys.modules:
        raise SystemExit(f"Cloud runtime unexpectedly imported {module}")
for path in ("/api/v1/collection/trigger", "/api/v1/nlp/trigger", "/api/v1/developer/export"):
    if path in paths:
        raise SystemExit(f"Cloud runtime exposes local execution: {path}")
if "/api/v1/publications/{run_id}/publish" not in paths:
    raise SystemExit("Publication activation route missing")
print("PASS cloud imports, published-reader routes and local execution isolation")
