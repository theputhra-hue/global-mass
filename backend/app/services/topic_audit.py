"""Metadata-only review candidates from a validated archive; no inferred gold labels."""

import re
from collections import Counter
from datetime import UTC, date
from typing import Any

from app.schemas.publication import PublicationSnapshot, PublishedClaim

MEMORY = re.compile(r"\b(?:ram|dram|sdram|ddr[2-6]?|dimms?|so-?dimms?|hbm[234]?|memory)\b", re.IGNORECASE)
PRICING = re.compile(r"\b(?:prices?|pricing|costs?|costlier|expensive|cheaper|shortages?|surges?|hikes?|supply|demand)\b", re.IGNORECASE)


def audit_ram_prices(snapshot: PublicationSnapshot, *, since: date | None = None, until: date | None = None) -> dict[str, Any]:
    if since and until and since > until:
        raise ValueError("Start date must not follow end date")
    claims: dict[str, list[PublishedClaim]] = {}
    owners = {claim.id: str(claim.article_id) for claim in snapshot.claims}
    for claim in snapshot.claims:
        claims.setdefault(str(claim.article_id), []).append(claim)
    incident: Counter[str] = Counter()
    for edge in snapshot.relationships:
        for owner in {owners[edge.from_claim_id], owners[edge.to_claim_id]}:
            incident[owner] += 1
    candidates = []
    for article in sorted(snapshot.articles, key=lambda a: str(a.id)):
        stamp = article.published_at.astimezone(UTC).date() if article.published_at else None
        if (since or until) and (stamp is None or (since and stamp < since) or (until and stamp > until)):
            continue
        own = claims.get(str(article.id), [])
        # Match within one title/statement, not unrelated words across a document.
        texts = [article.title, *(c.text for c in own)]
        matches = [t for t in texts if MEMORY.search(t) and PRICING.search(t)]
        if not matches:
            continue
        labels = Counter((c.verdict or "UNASSESSED").strip().upper() or "UNASSESSED" for c in own)
        candidates.append({
            "article_id": str(article.id), "title": article.title, "url": str(article.url),
            "domain": article.domain, "published_at": article.published_at.isoformat() if article.published_at else None,
            "match_basis": "title" if article.title in matches else "extracted_statement",
            "memory_terms": sorted({m.group().casefold() for t in matches for m in MEMORY.finditer(t)}),
            "pricing_terms": sorted({m.group().casefold() for t in matches for m in PRICING.finditer(t)}),
            "claims_total": len(own), "assessment_counts": dict(sorted(labels.items())),
            "relationship_records": incident[str(article.id)],
            "source_text": "not_published", "evidence_passages": "not_published",
            "extraction_completion": "not_recorded", "relevance_review": "pending",
            "event_id": None,
        })
    return {
        "schema_version": "gmee-topic-audit-v1", "topic": "RAM prices", "run_id": str(snapshot.run_id),
        "snapshot_sha256": snapshot.sha256(),
        "scope": {"since": since.isoformat() if since else None, "until": until.isoformat() if until else None,
                  "selection": "memory and pricing keywords in the same title or extracted statement",
                  "searched_articles": len(snapshot.articles), "searched_claims": len(snapshot.claims)},
        "counts": {"candidates": len(candidates), "without_claims": sum(not a["claims_total"] for a in candidates),
                   "missing_publication_date": sum(a["published_at"] is None for a in candidates),
                   "domains": len({a["domain"] for a in candidates})},
        "limitations": ["Keyword candidates require human relevance and hardware-category review.",
                        "This is not exhaustive retrieval, a same-event grouping, independent corroboration or a truth assessment.",
                        "Publication formats 1–3 omit source bodies, detailed evidence and per-article extraction status.",
                        "Price comparisons require matching capacity, memory type, kit, market, currency, taxes and observation date."],
        "candidates": candidates,
    }
