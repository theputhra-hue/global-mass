import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import reconstruct_vitaminc_mechanism as adapter


def test_adapter_records_new_identity_without_changing_model_recipe(monkeypatch):
    module = adapter.experiment
    original_config, original_sources = module.CONFIG, module.SOURCES
    for name in ("EXPECTED_PRIMARY_LOCK", "EXPECTED_SPARSE_LOCK", "SOURCES", "CONFIG", "STATUS"):
        monkeypatch.setattr(module, name, getattr(module, name))
    adapter.configure("a" * 64, "b" * 64)
    assert {k: module.CONFIG[k] for k in original_config} == original_config
    assert module.CONFIG["reconstruction"]["expected_primary_lock_sha256"] == "a" * 64
    assert module.CONFIG["reconstruction"]["expected_sparse_lock_sha256"] == "b" * 64
    assert module.SOURCES[:-1] == original_sources
    assert module.SOURCES[-1] == "evaluation/scripts/reconstruct_vitaminc_mechanism.py"
    assert "not_original" in module.STATUS


def test_adapter_rejects_implicit_or_malformed_identity():
    with pytest.raises(ValueError, match="SHA-256"):
        adapter.configure("", "b" * 64)
