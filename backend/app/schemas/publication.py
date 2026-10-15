"""Versioned, bounded public-result snapshots; no ORM or AI imports."""

import hashlib
import json
from typing import Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    model_validator,
)


class PublicationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class PublishedArticle(PublicationRecord):
    id: UUID
    source_name: str = Field(min_length=1, max_length=300)
    title: str = Field(min_length=1, max_length=2000)
    url: HttpUrl
    domain: str = Field(min_length=1, max_length=300)
    author: str | None = Field(default=None, max_length=500)
    language: str | None = Field(default=None, max_length=40)
    word_count: int | None = Field(default=None, ge=0)
    published_at: AwareDatetime | None = None
    # Full article text and arbitrary raw metadata are deliberately absent.


class PublishedClaim(PublicationRecord):
    id: UUID
    article_id: UUID
    text: str = Field(min_length=1, max_length=10000)
    extracted_at: AwareDatetime
    confidence: float | None = Field(default=None, ge=0, le=1)
    verdict: str | None = Field(default=None, max_length=64)
    verdict_probability: float | None = Field(default=None, ge=0, le=1)
    rationale: str | None = Field(default=None, max_length=4000)


class PublishedRelationship(PublicationRecord):
    id: UUID
    from_claim_id: UUID
    to_claim_id: UUID
    relationship_type: Literal["SIMILAR_TO", "EVOLVED_FROM"]
    score: float = Field(ge=0, le=1)
    created_at: AwareDatetime


class PublicationProvenance(PublicationRecord):
    analysis_started_at: AwareDatetime
    analysis_completed_at: AwareDatetime
    source_commit: str = Field(pattern=r"^[0-9a-f]{40}$")
    config_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    # Keys identify model roles; values identify immutable revisions.
    model_revisions: dict[str, str] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_provenance(self) -> "PublicationProvenance":
        if self.analysis_completed_at < self.analysis_started_at:
            raise ValueError("Analysis completion precedes start")
        if any(not key.strip() or not value.strip() or len(key) > 100 or len(value) > 200
               for key, value in self.model_revisions.items()):
            raise ValueError("Model revision identifiers must be bounded and nonempty")
        return self


class PublicationSnapshot(PublicationRecord):
    schema_version: Literal["1"] = "1"
    run_id: UUID
    generated_at: AwareDatetime
    provenance: PublicationProvenance
    articles: list[PublishedArticle] = Field(max_length=20000)
    claims: list[PublishedClaim] = Field(max_length=50000)
    relationships: list[PublishedRelationship] = Field(max_length=100000)

    @model_validator(mode="after")
    def validate_references(self) -> "PublicationSnapshot":
        if self.generated_at < self.provenance.analysis_completed_at:
            raise ValueError("Snapshot generated before analysis completed")
        for records in (self.articles, self.claims, self.relationships):
            if len({record.id for record in records}) != len(records):
                raise ValueError("Duplicate record IDs")
        article_ids = {article.id for article in self.articles}
        claim_ids = {claim.id for claim in self.claims}
        if any(claim.article_id not in article_ids for claim in self.claims):
            raise ValueError("Claim references missing article")
        edges: set[tuple[UUID, UUID, str]] = set()
        evolved_children: set[UUID] = set()
        for edge in self.relationships:
            if edge.from_claim_id not in claim_ids or edge.to_claim_id not in claim_ids:
                raise ValueError("Relationship references missing claim")
            if edge.from_claim_id == edge.to_claim_id:
                raise ValueError("Self relationship")
            key = (edge.from_claim_id, edge.to_claim_id, edge.relationship_type)
            if key in edges:
                raise ValueError("Duplicate relationship")
            edges.add(key)
            if edge.relationship_type == "EVOLVED_FROM":
                if edge.from_claim_id in evolved_children:
                    raise ValueError("Multiple evolution parents")
                evolved_children.add(edge.from_claim_id)
        return self

    def canonical_bytes(self) -> bytes:
        """Stable envelope serialization for replay/conflict detection."""
        return json.dumps(self.model_dump(mode="json"), sort_keys=True,
                          separators=(",", ":"), ensure_ascii=False,
                          allow_nan=False).encode("utf-8")

    def sha256(self) -> str:
        return hashlib.sha256(self.canonical_bytes()).hexdigest()
