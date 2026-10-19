"""Deterministic document preparation and checkpoint keys for the local atlas."""
import hashlib
import html
import re
from typing import Any

METHOD = "article-bertopic-umap-v1"
MODEL = "sentence-transformers/all-mpnet-base-v2"
REVISION = "e8c3b32edf5434bc2275fc9bab85f82640a19130"


def document_input(title: str, body: str | None, language: str | None) -> tuple[str, str]:
    if language and language.lower() not in ("en", "eng", "english"):
        return "", "unsupported_language"
    text = re.sub(r"(?is)<(script|style)\b[^>]*>.*?</\1>", " ", body or "")
    text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", text)).split())
    title = " ".join(title.split())
    if len(text.split()) >= 30:
        return f"{title}\n{text}", "stored_text"
    return (title, "title_only") if title else ("", "unavailable")


def checkpoint_key(text: str, config_hash: str) -> str:
    return hashlib.sha256((config_hash + "\n" + text).encode()).hexdigest()


def coverage(assignments: list[dict[str, Any]]) -> dict[str, int]:
    return {basis: sum(a["basis"] == basis for a in assignments)
            for basis in ("stored_text", "title_only", "unsupported_language", "unavailable")}
