"""A fresh cloud process imports no AI packages and exposes no pipeline routes."""
import os
import subprocess
import sys


def test_cloud_import_loads_no_ml_models_or_libraries():
    code = """
import sys
from app.cloud import app
app.openapi()
for name in ('torch','spacy','transformers','sentence_transformers','bertopic','sklearn'):
    assert name not in sys.modules, name
paths=app.openapi()['paths']
assert '/api/v1/publications/{run_id}/publish' in paths
assert '/api/v1/collection/trigger' not in paths
"""
    result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=False,
                            env={**os.environ, "ENABLE_SCHEDULER": "false", "DEVELOPER_PIPELINE_ENABLED": "false"}, timeout=30)
    assert result.returncode == 0, result.stderr
