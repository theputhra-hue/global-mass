"""Real loopback preview contracts: fixed controls, no private file/API exposure."""
import http.client
import importlib.util
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("project_preview", ROOT / "scripts/preview-project.py")
assert spec is not None and spec.loader is not None
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        directory = Path(self.temp.name) / "dist"
        directory.mkdir()
        (directory / "index.html").write_text("<h1>Preview fixture</h1>", encoding="utf-8")
        (Path(self.temp.name) / "private.env").write_text("private-fixture", encoding="utf-8")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), preview.handler_for(directory))
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def request(self, path: str, method: str = "GET") -> tuple[int, bytes, dict[str, str]]:
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        self.addCleanup(conn.close)
        conn.request(method, path)
        response = conn.getresponse()
        return response.status, response.read(), dict(response.getheaders())

    def test_real_controls_and_honest_unavailability(self) -> None:
        code, body, headers = self.request("/api/v1/project/lab")
        report = json.loads(body)
        self.assertEqual(code, 200)
        self.assertEqual(report["passed"], 12)
        self.assertEqual(report["runtime_mode"], "offline_preview")
        self.assertFalse(report["research_gold"])
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(self.request("/api/v1/corpus/stats")[0], 503)
        self.assertEqual(self.request("/api/v1/auth/register", "POST")[0], 503)
        ready = self.request("/api/v1/health/ready")
        self.assertEqual(ready[0], 503)
        self.assertEqual(json.loads(ready[1])["status"], "not_ready")

    def test_encoded_traversal_cannot_read_private_files(self) -> None:
        code, body, _ = self.request("/%2e%2e/private.env")
        self.assertEqual(code, 403)
        self.assertNotIn(b"private-fixture", body)
        self.assertEqual(self.request("/missing")[0], 404)

    def test_head_and_static_headers(self) -> None:
        code, body, headers = self.request("/", "HEAD")
        self.assertEqual(code, 200)
        self.assertEqual(body, b"")
        self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
