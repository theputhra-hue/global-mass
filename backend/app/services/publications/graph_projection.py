"""Bounded, release-pinned graph reads. No inference or model imports."""
import hashlib
import json
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.publication import PublishedArticleRow as Article
from app.models.publication import PublishedClaimRow as Claim
from app.models.publication import PublishedRelationshipRow as Edge

NODE_LIMIT = 1000
EDGE_LIMIT = 2000


async def published_graph(db: AsyncSession, run: uuid.UUID, *, claims: bool) -> dict[str, Any]:
    first, second = aliased(Claim), aliased(Claim)
    ordering = [Edge.id] if claims else [(first.article_id == second.article_id).asc(), Edge.id]
    rows = (await db.execute(select(Edge, first.article_id, second.article_id).join(
        first, (first.run_id == Edge.run_id) & (first.id == Edge.from_claim_id)).join(
        second, (second.run_id == Edge.run_id) & (second.id == Edge.to_claim_id)).where(
        Edge.run_id == run).order_by(*ordering).limit(EDGE_LIMIT + 1))).all()
    chosen: set[uuid.UUID] = set()
    accepted = []
    # Admit both endpoints together, never silently orphan a sampled edge.
    for edge, a, b in rows[:EDGE_LIMIT]:
        src, dst = (edge.from_claim_id, edge.to_claim_id) if claims else (a, b)
        if len(chosen | {src, dst}) <= NODE_LIMIT:
            chosen.update((src, dst))
            accepted.append((edge, src, dst))
    model = Claim if claims else Article
    total_nodes = await db.scalar(select(func.count()).select_from(model).where(model.run_id == run)) or 0
    total_edges = await db.scalar(select(func.count()).select_from(Edge).where(Edge.run_id == run)) or 0
    remaining = NODE_LIMIT - len(chosen)
    if remaining:
        extra = (await db.scalars(select(model.id).where(model.run_id == run, model.id.not_in(chosen))
                                 .order_by(model.id).limit(remaining))).all()
        chosen.update(extra)
    if claims:
        data = (await db.execute(select(Claim, Article).join(Article,
            (Article.run_id == Claim.run_id) & (Article.id == Claim.article_id)).where(
                Claim.run_id == run, Claim.id.in_(chosen)).order_by(Claim.id))).all()
        nodes = [{"id": str(c.id), "kind": "claim", "article_id": str(c.article_id), "title": c.text,
                  "domain": a.domain, "url": a.payload.get("url"), "published_at": a.payload.get("published_at"),
                  "verdict": c.payload.get("verdict"), "prob": c.payload.get("verdict_probability")} for c, a in data]
    else:
        articles = (await db.scalars(select(Article).where(Article.run_id == run, Article.id.in_(chosen)).order_by(Article.id))).all()
        nodes = [{**a.payload, "kind": "article"} for a in articles]
    groups: dict[tuple[str, str, str], dict[str, Any]] = {}
    within = 0
    owners = {node["id"]: node.get("article_id", node["id"]) for node in nodes}
    for edge, a, b in accepted:
        if a == b:
            within += 1
            continue
        kind = edge.payload["relationship_type"]
        directed = True if kind == "EVOLVED_FROM" else False if kind == "SIMILAR_TO" else None
        src, dst = str(a), str(b)
        if directed is False:
            src, dst = sorted((src, dst))
        key = src, dst, kind
        score = edge.payload["score"]
        if key not in groups:
            groups[key] = {"id": hashlib.sha256(json.dumps(key).encode()).hexdigest()[:24],
                "src": src, "dst": dst, "relationship_type": kind, "directed": directed,
                "score": score, "score_min": score, "score_max": score,
                "score_kind": "similarity" if kind == "SIMILAR_TO" else "relationship_strength",
                "score_family": "published_claim_" + kind.lower(),
                "support_count": 0, "references": [], "references_truncated": False,
                "basis": "published_claim_relationships"}
        group = groups[key]
        group["support_count"] += 1
        group["score_min"] = min(group["score_min"], score)
        group["score_max"] = group["score"] = max(group["score_max"], score)
        if len(group["references"]) < 25:
            group["references"].append({"id": str(edge.id), "from_claim_id": str(edge.from_claim_id),
                "to_claim_id": str(edge.to_claim_id), "from_article_id": owners.get(str(a)),
                "to_article_id": owners.get(str(b)), "score": score})
        else:
            group["references_truncated"] = True
    links = sorted(groups.values(), key=lambda item: item["id"])
    return {"nodes": nodes, "edges": links, "counts": {"nodes": len(nodes), "edges": len(links)},
        "run_id": str(run), "basis": "published_claim_relationships" if claims else "published_article_relationship_projection",
        "bounded": True, "scope": {"total_nodes": total_nodes, "total_relationships": total_edges,
            "relationships_returned": len(accepted), "within_node_relationships": within,
            "node_limit": NODE_LIMIT, "relationship_limit": EDGE_LIMIT,
            "truncated": total_nodes > len(nodes) or total_edges > len(accepted),
            "selection": "stable_relationship_endpoints_first_then_node_ids; article_projection_prefers_cross_article_links",
            "aggregation": "pair_and_type_max_score_with_range_and_up_to_25_claim_references"}}
