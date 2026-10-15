"""Serve the built UI and real authored text controls when Docker is unavailable.

This is a read-only, loopback-only development preview. No accounts, corpus,
graph, model service or database is simulated. Those API calls return 503.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.project_lab import challenge_report


def handler_for(directory: Path) -> type[BaseHTTPRequestHandler]:
    directory = directory.resolve()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: object) -> None:
            # Search strings and application data do not belong in preview logs.
            pass

        def respond(self, code: int, content: bytes, content_type: str) -> None:
            self.send_response(code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(content)

        def json_response(self, code: int, payload: object) -> None:
            self.respond(code, json.dumps(payload, ensure_ascii=False, allow_nan=False).encode(), "application/json; charset=utf-8")

        def do_HEAD(self) -> None:
            self.do_GET()

        def do_POST(self) -> None:
            self.json_response(503, {"detail": "Read-only project preview. Start the Docker stack to use accounts, saved cases and corpus services."})

        def do_GET(self) -> None:
            path = unquote(urlsplit(self.path).path)
            if path == "/api/v1/project/lab":
                self.json_response(200, {**challenge_report(), "runtime_mode": "offline_preview"})
                return
            if path == "/api/v1/health/ready":
                self.json_response(503, {"status": "not_ready", "postgres": "offline: preview mode", "neo4j": "offline: preview mode", "redis": "offline: preview mode", "runtime_mode": "offline_preview"})
                return
            if path.startswith("/api/"):
                self.json_response(503, {"detail": "Docker data/model services are offline. This preview serves the interface and real engineering controls only."})
                return
            target = (directory / path.lstrip("/")).resolve()
            if not target.is_relative_to(directory):
                self.json_response(403, {"detail": "Path outside the built application"})
                return
            if target == directory:
                target = directory / "index.html"
            if not target.is_file():
                self.json_response(404, {"detail": "Built asset not found"})
                return
            content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
            # Windows registry MIME mappings can mislabel JS as text/plain.
            if target.suffix == ".js":
                content_type = "text/javascript"
            self.respond(200, target.read_bytes(), content_type)

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    directory = ROOT / "frontend/dist"
    if not (directory / "index.html").is_file():
        parser.error("Build frontend first: cd frontend && npm ci && npm run build")
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(directory)) as server:
        print(f"Project preview: http://localhost:{args.port}/#/project", flush=True)
        print("Read-only preview; Docker-backed features remain offline.", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
