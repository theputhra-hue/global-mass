"""Failure fixtures for dependency checks; no application dependencies required."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("architecture", ROOT / "infra/scripts/check_backend_architecture.py")
assert spec and spec.loader
architecture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(architecture)


class BackendArchitectureTests(unittest.TestCase):
    def test_real_project(self):
        self.assertEqual(architecture.check(ROOT), [])

    def test_services_cannot_depend_on_http_or_bootstrap(self):
        for source in ("from app.api.deps import require_role", "from app import cloud", "import app.runtime.scheduler"):
            with self.subTest(source=source):
                self.assertTrue(architecture.violations(source, "app.services.identity.service"))

    def test_ml_cannot_import_application_or_stores(self):
        self.assertTrue(architecture.violations("from app.services.analysis import orchestrator", "app.ml.embedding_service"))
        self.assertTrue(architecture.violations("from app.db import postgres", "app.ml.embedding_service"))
        self.assertEqual(architecture.violations("from app.core.config import get_settings", "app.ml.embedding_service"), [])
        self.assertTrue(architecture.violations("from app.services.verdict.engine import classify_stance", "app.ml.embedding_service"))
        self.assertEqual(architecture.violations("from app.services.verdict.engine import classify_stance", "app.ml.llm_client"), [])

    def test_nested_and_relative_imports_are_checked(self):
        self.assertTrue(architecture.violations("def work():\n    from ...api import deps", "app.services.identity.service"))

    def test_pure_comparison_has_no_network_or_ml_dependencies(self):
        for source in ("import httpx", "import torch", "from app.db import postgres"):
            self.assertTrue(architecture.violations(source, "app.services.evolution.text_changes"))
        self.assertEqual(architecture.violations("from decimal import Decimal\nfrom app.services.evolution.quantities import Quantity", "app.services.evolution.text_changes"), [])


if __name__ == "__main__":
    unittest.main()
