"""Build exploratory city roads locally from validated cached embeddings only.

No model download, source write or publication. Run from backend with --base,
--work-dir (existing article-map checkpoints), and a new --output path.
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

from app.schemas.city_network import Highway, road_aggregates, super_aggregates
from app.schemas.publication import PublicationSnapshot
from app.services.analysis.article_map import checkpoint_key
from scripts.map_runtime import add_runtime_arguments, configure_runtime, write_snapshot


def build(args: argparse.Namespace) -> None:
    os.environ.update(OPENBLAS_NUM_THREADS="4", OMP_NUM_THREADS="4", MKL_NUM_THREADS="4")
    source_commit = configure_runtime(args)
    from app.core.config import get_settings
    get_settings.cache_clear()
    import networkx as nx
    import numpy as np

    from scripts.build_article_map import read_documents

    started, clock = datetime.now(UTC), time.monotonic()
    base = PublicationSnapshot.model_validate_json(Path(args.base).read_bytes())
    if base.topic_map is None:
        raise RuntimeError("A completed article topic map is required")
    target, work = Path(args.output), Path(args.work_dir)
    if target.exists():
        raise RuntimeError("Output already exists; choose a new path")
    docs, fingerprint = asyncio.run(read_documents({str(a.id) for a in base.articles}))
    input_hash = hashlib.sha256(json.dumps([(d["id"], d["basis"], hashlib.sha256(d["text"].encode()).hexdigest())
                                           for d in docs], separators=(",", ":")).encode()).hexdigest()
    if input_hash != base.topic_map.input_sha256:
        raise RuntimeError("Source input differs from the completed article map")
    embedding_config = {"model": base.topic_map.embedding_model, "revision": base.topic_map.embedding_revision,
                        "chunk_tokens": 320, "overlap_tokens": 48, "method": "token-window-unit-mean-v1"}
    embedding_hash = hashlib.sha256(json.dumps(embedding_config, sort_keys=True).encode()).hexdigest()
    article_ids = sorted(str(a.id) for a in base.articles)
    global_index = {key: i for i, key in enumerate(article_ids)}
    vectors, usable = [], []
    cache = sqlite3.connect(f"file:{(work / 'embeddings.sqlite3').resolve().as_posix()}?mode=ro", uri=True)
    try:
        for doc in docs:
            if not doc["text"]:
                continue
            row = cache.execute("SELECT vector FROM embeddings WHERE key=?", (checkpoint_key(doc["text"], embedding_hash),)).fetchone()
            if row is None:
                raise RuntimeError("Missing validated embedding checkpoint; run article-map processing first")
            vector = np.frombuffer(row[0], dtype=np.float32).copy()
            norm = float(np.linalg.norm(vector))
            if vector.shape != (768,) or not np.isfinite(vector).all() or abs(norm - 1) > .002:
                raise RuntimeError("Invalid cached unit embedding")
            vectors.append(vector / norm)
            usable.append(global_index[doc["id"]])
    finally:
        cache.close()
    matrix = np.asarray(vectors, dtype=np.float32)
    k = min(args.neighbors, max(0, len(matrix) - 1))
    neighbors: list[dict[int, float]] = []
    for offset in range(0, len(matrix), 256):
        scores = np.clip(matrix[offset:offset + 256] @ matrix.T, -1, 1)
        scores[np.arange(len(scores)), np.arange(offset, offset + len(scores))] = -2
        order = np.argsort(-scores, axis=1, kind="stable")[:, :k]
        neighbors.extend({int(j): round(float(row[j]), 6) for j in choices}
                         for row, choices in zip(scores, order, strict=True))
        print(json.dumps({"phase": "nearest_neighbors", "completed": len(neighbors), "total": len(matrix)}), flush=True)
    roads = sorted((usable[i], usable[j], score) for i, candidates in enumerate(neighbors)
                   for j, score in candidates.items() if i < j and i in neighbors[j] and score >= args.min_similarity)
    assignments = {str(a.article_id): a for a in base.topic_map.assignments}
    topic_ids = [assignments[i].topic_id for i in article_ids]
    highways = [Highway(**h) for h in road_aggregates(roads, topic_ids, 3, 2)]
    topic_graph = nx.Graph()
    for topic in sorted(base.topic_map.topics, key=lambda t: t.id):
        topic_graph.add_node(topic.id)
    counts = {t.id: t.article_count for t in base.topic_map.topics}
    for highway in highways:
        # Size-aware community weight, independent of the raw displayed support.
        topic_graph.add_edge(highway.a, highway.b, weight=highway.support / (counts[highway.a] * counts[highway.b]) ** .5)
    if topic_graph.number_of_edges():
        groups = nx.community.louvain_communities(topic_graph, seed=42, weight="weight")
    else:
        groups = [{topic} for topic in topic_graph.nodes]
    labels = {t.id: t.label for t in base.topic_map.topics}
    themes: list[dict[str, Any]] = [{"id": f"theme-{i}", "label": " / ".join(labels[t].split(" · ")[0] for t in sorted(group, key=lambda t: (-counts[t], t))[:3])[:160],
               "topics": sorted(group), "article_count": sum(counts[t] for t in group)}
              for i, group in enumerate(sorted(groups, key=lambda g: min(g)))]
    membership = {topic: theme["id"] for theme in themes for topic in theme["topics"]}
    config = {"method": "mutual-cosine-city-v1", "neighbor_k": args.neighbors,
              "min_similarity": args.min_similarity, "min_highway_support": 3, "min_highway_endpoints": 2,
              "community_method": "networkx_louvain", "community_revision": nx.__version__, "seed": 42,
              "implementation_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    _, after = asyncio.run(read_documents(set(article_ids)))
    if after != fingerprint:
        raise RuntimeError("Original corpus changed during network processing")
    completed = datetime.now(UTC)
    payload = base.model_dump(mode="json", exclude={"city_network"})
    payload.update(schema_version="3", run_id=str(uuid.uuid4()), generated_at=completed.isoformat(),
        city_network={**{key: value for key, value in config.items() if key != "implementation_sha256"},
            "started_at": started.isoformat(), "completed_at": completed.isoformat(),
            "source_commit": source_commit,
            "source_map_run_id": str(base.run_id), "source_map_sha256": base.sha256(),
            "input_sha256": input_hash, "config_sha256": hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest(),
            "embedding_model": base.topic_map.embedding_model, "embedding_revision": base.topic_map.embedding_revision,
            "article_ids": article_ids, "roads": roads, "highways": [h.model_dump() for h in highways],
            "themes": themes, "superways": super_aggregates(highways, membership)})
    snapshot = PublicationSnapshot.model_validate(payload)
    body = snapshot.canonical_bytes()
    write_snapshot(target, body, local_only=getattr(args, "local_only", False))
    degree = [0] * len(article_ids)
    graph = nx.Graph()
    graph.add_nodes_from(usable)
    for a, b, _ in roads:
        degree[a] += 1
        degree[b] += 1
        graph.add_edge(a, b)
    by_id = {str(a.id): a for a in base.articles}
    samples = [{"a": by_id[article_ids[a]].title, "b": by_id[article_ids[b]].title, "score": score,
                "input_a": assignments[article_ids[a]].basis, "input_b": assignments[article_ids[b]].basis}
               for a, b, score in sorted(roads, key=lambda r: (r[2], r[0], r[1]))[::max(1, len(roads) // 100)][:100]]
    audit: dict[str, Any] = {"status": "complete", "run_id": str(snapshot.run_id), "sha256": snapshot.sha256(),
        "config": config, "calibration": "exploratory_not_human_validated", "articles": len(article_ids),
        "usable_embeddings": len(usable), "roads": len(roads), "highways": len(highways), "themes": len(themes),
        "superways": len(snapshot.city_network.superways) if snapshot.city_network else 0,
        "connected_articles": sum(d > 0 for d in degree), "components": nx.number_connected_components(graph),
        "degree_histogram": {str(d): degree.count(d) for d in sorted(set(degree))},
        "source_before": fingerprint, "source_after": after, "preserved_claims": len(snapshot.claims),
        "preserved_relationships": len(snapshot.relationships), "bytes": len(body),
        "elapsed_s": round(time.monotonic() - clock, 2), "review_samples": samples}
    (target.parent / (target.stem + '.audit.json')).write_text(json.dumps(audit, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in audit.items() if key != "review_samples"}), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--neighbors", type=int, choices=range(1, 21), default=10)
    parser.add_argument("--min-similarity", type=float, default=.72)
    add_runtime_arguments(parser)
    args = parser.parse_args()
    if not 0 <= args.min_similarity <= 1:
        parser.error("min-similarity must be in [0,1]")
    build(args)


if __name__ == "__main__":
    main()
