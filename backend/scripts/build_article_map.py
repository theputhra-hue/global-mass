"""Local-only resumable article atlas. Source DB is read-only; no cloud writes.

Run from backend: python -m scripts.build_article_map --base <v1-v2-or-v3.json>
  --work-dir <ignored/checkpoints> --output <new-release.json>
Repeat the same command to reuse unchanged document embeddings. New/changed
documents are encoded; each completed checkpoint is committed independently.
Topic grouping/projection are versioned and rebuilt over the entire current input.
"""
import argparse
import asyncio
import hashlib
import json
import os
import sqlite3
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.schemas.publication import PublicationSnapshot
from app.services.analysis.article_map import (
    METHOD,
    MODEL,
    REVISION,
    checkpoint_key,
    coverage,
    document_input,
)
from scripts.map_runtime import add_runtime_arguments, configure_runtime, write_snapshot


async def read_documents(ids: set[str]) -> tuple[list[dict[str, Any]], str]:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.core.config import get_settings
    engine = create_async_engine(get_settings().POSTGRES_URL)
    try:
        async with engine.connect() as db:
            await db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
            rows = (await db.execute(text("SELECT id,title,cleaned_content,content,language FROM articles ORDER BY id"))).mappings()
            docs = []
            for row in rows:
                if str(row["id"]) not in ids:
                    continue
                value, basis = document_input(row["title"], row["cleaned_content"] or row["content"], row["language"])
                docs.append({"id": str(row["id"]), "text": value, "basis": basis})
            fingerprint = await db.scalar(text("SELECT md5(string_agg(md5(to_jsonb(a)::text),'' ORDER BY id)) FROM articles a"))
        if {d["id"] for d in docs} != ids:
            raise RuntimeError("The local source does not contain every base-release article")
        return docs, str(fingerprint)
    finally:
        await engine.dispose()


def build(args: argparse.Namespace) -> None:
    # Configure local credentials normally; never fetch or print private values.
    source_commit = configure_runtime(args)
    os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", TOKENIZERS_PARALLELISM="false",
                      NUMBA_NUM_THREADS="4", OMP_NUM_THREADS="4", OPENBLAS_NUM_THREADS="4", MKL_NUM_THREADS="4")
    from app.core.config import get_settings
    get_settings.cache_clear()
    base = PublicationSnapshot.model_validate_json(Path(args.base).read_bytes())
    work, output = Path(args.work_dir), Path(args.output)
    work.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise RuntimeError("Output already exists; choose a new release path instead of overwriting")
    started, t0 = datetime.now(UTC), time.monotonic()
    # Source hashes document uncommitted implementation without pretending HEAD
    # alone identifies the executed algorithm.
    implementation = {str(p.relative_to(Path(__file__).parents[1])): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in (Path(__file__), Path(__file__).parents[1] / "app/services/analysis/article_map.py")}
    config = {"method": METHOD, "model": MODEL, "revision": REVISION, "seed": 42,
              "min_topic_size": args.min_topic_size, "chunk_tokens": 320, "overlap_tokens": 48,
              "label_word_limit": 1000, "implementation": implementation}
    config_hash = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    embedding_config = {key: config[key] for key in ("model", "revision", "chunk_tokens", "overlap_tokens")}
    embedding_config["method"] = "token-window-unit-mean-v1"
    embedding_hash = hashlib.sha256(json.dumps(embedding_config, sort_keys=True).encode()).hexdigest()
    # Topic size, label settings and non-semantic source edits must not invalidate
    # unchanged document vectors. Migrate the initial v1 checkpoints only when
    # their model/window settings and input preparation implementation match.
    legacy_hash: str | None = None
    prior_path = work / "audit.json"
    if prior_path.exists():
        prior_config = json.loads(prior_path.read_text(encoding="utf-8")).get("config", {})
        helper_key = str(Path("app/services/analysis/article_map.py"))
        if (prior_config.get("method") == METHOD
            and all(prior_config.get(key) == config[key] for key in ("model", "revision", "chunk_tokens", "overlap_tokens"))
            and prior_config.get("implementation", {}).get(helper_key) == implementation.get(helper_key)):
            legacy_hash = hashlib.sha256(json.dumps(prior_config, sort_keys=True).encode()).hexdigest()
    docs, source_before = asyncio.run(read_documents({str(a.id) for a in base.articles}))
    input_hash = hashlib.sha256(json.dumps([(d["id"], d["basis"], hashlib.sha256(d["text"].encode()).hexdigest())
                                            for d in docs], separators=(",", ":")).encode()).hexdigest()
    audit: dict[str, Any] = {"status": "running", "phase": "embedding", "config": config,
                             "input_sha256": input_hash, "source_before": source_before,
                             "articles": len(docs), "completed_embeddings": 0, "reused_embeddings": 0}

    def save() -> None:
        (work / "audit.json").write_text(json.dumps(audit, indent=2, default=str), encoding="utf-8")
        print(json.dumps({k: audit[k] for k in ("status", "phase", "completed_embeddings", "reused_embeddings")}), flush=True)

    save()
    import numpy as np
    import torch
    from huggingface_hub import snapshot_download
    from sentence_transformers import SentenceTransformer
    torch.set_num_threads(4)
    torch.set_num_interop_threads(2)
    model_path = snapshot_download(MODEL, revision=REVISION, local_files_only=True,
                                   allow_patterns=["*.json", "*.txt", "*.model", "*.safetensors"])
    model = SentenceTransformer(model_path, device="cpu", local_files_only=True)
    model.max_seq_length = 384
    cache = sqlite3.connect(work / "embeddings.sqlite3")
    cache.execute("CREATE TABLE IF NOT EXISTS embeddings (key TEXT PRIMARY KEY, vector BLOB NOT NULL)")
    vectors, usable, keys = [], [], []
    try:
        for index, doc in enumerate(docs):
            if not doc["text"]:
                continue
            key = checkpoint_key(doc["text"], embedding_hash)
            row = cache.execute("SELECT vector FROM embeddings WHERE key=?", (key,)).fetchone()
            if row is None and legacy_hash:
                row = cache.execute("SELECT vector FROM embeddings WHERE key=?", (checkpoint_key(doc["text"], legacy_hash),)).fetchone()
                if row:
                    cache.execute("INSERT OR IGNORE INTO embeddings VALUES (?,?)", (key, row[0]))
                    cache.commit()
            if row:
                vector = np.frombuffer(row[0], dtype=np.float32).copy()
                audit["reused_embeddings"] += 1
            else:
                tokens = model.tokenizer.encode(doc["text"], add_special_tokens=False, truncation=False)
                pooled = np.zeros(768, dtype=np.float32)
                count = 0
                # No article truncation. Only a bounded batch of windows is resident.
                for offset in range(0, len(tokens), 272 * args.batch_size):
                    starts = range(offset, min(len(tokens), offset + 272 * args.batch_size), 272)
                    chunks = [model.tokenizer.decode(tokens[s:s + 320], skip_special_tokens=True) for s in starts]
                    encoded = model.encode(chunks, batch_size=args.batch_size, normalize_embeddings=True, show_progress_bar=False)
                    pooled += np.asarray(encoded, dtype=np.float32).sum(axis=0)
                    count += len(chunks)
                if count == 0 or not np.isfinite(pooled).all() or np.linalg.norm(pooled) == 0:
                    raise RuntimeError(f"Invalid document embedding for article {doc['id']}")
                vector = pooled / np.linalg.norm(pooled)
                cache.execute("INSERT OR REPLACE INTO embeddings VALUES (?,?)", (key, vector.astype(np.float32).tobytes()))
                cache.commit()
            if vector.shape != (768,) or not np.isfinite(vector).all() or np.linalg.norm(vector) == 0:
                raise RuntimeError("Corrupt embedding checkpoint; do not use this cache entry")
            usable.append(doc)
            keys.append(key)
            vectors.append(vector)
            audit["completed_embeddings"] = len(vectors)
            if index % 25 == 0:
                save()
    finally:
        cache.close()
    # Release the encoder before fitting topic/projection models.
    del model
    import gc
    gc.collect()
    audit["phase"] = "clustering"
    save()
    matrix = np.asarray(vectors, dtype=np.float32)
    if len(matrix) < 3:
        raise RuntimeError("At least three usable documents are needed for an article projection")
    from umap import UMAP

    from app.services.evolution.cluster_service import _fit_topics
    result = _fit_topics([" ".join(d["text"].split()[:1000]) for d in usable], list(vectors),
                         {"min_topic_size": args.min_topic_size, "umap_n_neighbors": min(15, len(matrix) - 1),
                          "umap_n_components": min(5, len(matrix) - 2), "umap_min_dist": 0.0,
                          "umap_metric": "cosine", "random_state": 42})
    audit["phase"] = "projection"
    save()
    xy = UMAP(n_neighbors=min(15, len(matrix) - 1), n_components=2, min_dist=.15,
              metric="cosine", random_state=42, init="random", n_jobs=1).fit_transform(matrix)
    xy = (xy - xy.mean(axis=0)) / max(float(np.abs(xy - xy.mean(axis=0)).max()), 1e-8) * 1000
    assignments = []
    first_key: dict[str, str] = {}
    for doc, key, topic, point in zip(usable, keys, result.topics, xy, strict=True):
        duplicate = first_key.get(key)
        first_key.setdefault(key, doc["id"])
        assignments.append({"article_id": doc["id"], "basis": doc["basis"],
                            "topic_id": f"topic-{topic}" if topic >= 0 else None,
                            "x": round(float(point[0]), 5), "y": round(float(point[1]), 5), "duplicate_of": duplicate})
    seen = {a["article_id"] for a in assignments}
    assignments.extend({"article_id": d["id"], "basis": d["basis"], "topic_id": None}
                       for d in docs if d["id"] not in seen)
    topics = [{"id": f"topic-{topic}", "label": " · ".join(result.keywords.get(topic, [])[:4])[:160] or "Unnamed topic",
               "keywords": result.keywords.get(topic, [])[:12],
               "article_count": sum(t == topic for t in result.topics)} for topic in sorted(result.labels)]
    _, source_after = asyncio.run(read_documents({str(a.id) for a in base.articles}))
    if source_after != source_before:
        raise RuntimeError("Source corpus changed during processing; reconcile before exporting")
    completed = datetime.now(UTC)
    # New topic assignments need newly computed roads; never carry a prior city
    # network into a changed projection/topic release.
    payload = base.model_dump(mode="json", exclude={"topic_map", "city_network"})
    payload.update(schema_version="2", run_id=str(uuid.uuid4()), generated_at=completed.isoformat(),
                   topic_map={"method": METHOD, "started_at": started.isoformat(), "completed_at": completed.isoformat(),
                              "source_commit": source_commit, "input_sha256": input_hash, "config_sha256": config_hash,
                              "embedding_model": MODEL, "embedding_revision": REVISION, "seed": 42,
                              "topics": topics, "assignments": assignments})
    snapshot = PublicationSnapshot.model_validate(payload)
    body = snapshot.canonical_bytes()
    write_snapshot(output, body, local_only=getattr(args, "local_only", False))
    audit.update(status="complete", phase="exported", run_id=str(snapshot.run_id), sha256=snapshot.sha256(),
                 source_after=source_after, coverage=coverage(assignments), topics=len(topics),
                 unclassified=sum(a["topic_id"] is None for a in assignments), bytes=len(body),
                 preserved_claims=len(snapshot.claims), preserved_relationships=len(snapshot.relationships),
                 elapsed_s=round(time.monotonic() - t0, 2), output=str(output))
    save()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--batch-size", type=int, choices=range(1, 33), default=8)
    parser.add_argument("--min-topic-size", type=int, choices=range(5, 101), default=15)
    add_runtime_arguments(parser)
    args = parser.parse_args()
    try:
        build(args)
    except (Exception, KeyboardInterrupt) as exc:
        audit_path = Path(args.work_dir) / "audit.json"
        if audit_path.exists():
            audit = json.loads(audit_path.read_text(encoding="utf-8"))
            audit.update(status="interrupted" if isinstance(exc, KeyboardInterrupt) else "failed", error_type=type(exc).__name__)
            audit_path.write_text(json.dumps(audit, indent=2, default=str), encoding="utf-8")
        raise RuntimeError(f"Article map processing stopped ({type(exc).__name__}). Check the checkpoint audit; cloud publication was not changed.") from None


if __name__ == "__main__":
    main()
