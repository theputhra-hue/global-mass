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

from app.schemas.article_map import ArticleMap
from app.schemas.city_network import CityNetwork, road_aggregates, super_aggregates


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
    schema_version: Literal["1", "2", "3"] = "1"
    run_id: UUID
    generated_at: AwareDatetime
    provenance: PublicationProvenance
    articles: list[PublishedArticle] = Field(max_length=20000)
    claims: list[PublishedClaim] = Field(max_length=50000)
    relationships: list[PublishedRelationship] = Field(max_length=100000)
    topic_map: ArticleMap | None = None
    city_network: CityNetwork | None = None

    @model_validator(mode="after")
    def validate_references(self) -> "PublicationSnapshot":
        if self.generated_at < self.provenance.analysis_completed_at:
            raise ValueError("Snapshot generated before analysis completed")
        for records in (self.articles, self.claims, self.relationships):
            if len({record.id for record in records}) != len(records):
                raise ValueError("Duplicate record IDs")
        article_ids = {article.id for article in self.articles}
        if self.schema_version == "1" and self.topic_map is not None:
            raise ValueError("Article map requires publication version 2")
        if self.schema_version in ("2", "3"):
            if self.topic_map is None:
                raise ValueError("Version 2 requires a complete article map")
            if {a.article_id for a in self.topic_map.assignments} != article_ids:
                raise ValueError("Article map must cover exactly this release's articles")
            if self.generated_at < self.topic_map.completed_at:
                raise ValueError("Snapshot generated before map completed")
        if self.schema_version != "3" and self.city_network is not None:
            raise ValueError("City network requires publication version 3")
        if self.schema_version == "3":
            city, mapping = self.city_network, self.topic_map
            if city is None or mapping is None:
                raise ValueError("Version 3 requires a complete city network and map")
            if set(city.article_ids) != article_ids or self.generated_at < city.completed_at:
                raise ValueError("City network must cover this release and finish before export")
            if city.input_sha256 != mapping.input_sha256 or city.embedding_model != mapping.embedding_model or city.embedding_revision != mapping.embedding_revision:
                raise ValueError("City network and map use different input or model")
            assignments = {a.article_id: a for a in mapping.assignments}
            for a, b, _ in city.roads:
                if assignments[city.article_ids[a]].x is None or assignments[city.article_ids[b]].x is None:
                    raise ValueError("Road references an unsupported semantic input")
            topics = {t.id: t for t in mapping.topics}
            membership = {topic: theme.id for theme in city.themes for topic in theme.topics}
            if len(membership) != sum(len(t.topics) for t in city.themes) or set(membership) != set(topics):
                raise ValueError("Theme membership must cover every topic exactly once")
            if any(theme.article_count != sum(topics[t].article_count for t in theme.topics) for theme in city.themes):
                raise ValueError("Theme member counts differ")
            expected = road_aggregates(city.roads, [assignments[i].topic_id for i in city.article_ids], city.min_highway_support, city.min_highway_endpoints)
            if expected != [h.model_dump() for h in city.highways]:
                raise ValueError("Highways differ from their supporting roads")
            if super_aggregates(city.highways, membership) != [s.model_dump() for s in city.superways]:
                raise ValueError("Superways differ from their supporting highways")
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
        # A v1 upload must retain its existing fingerprint after the v2 upgrade.
        excluded = ({"topic_map", "city_network"} if self.schema_version == "1"
                    else {"city_network"} if self.schema_version == "2" else set())
        data = self.model_dump(mode="json", exclude=excluded)
        return json.dumps(data, sort_keys=True,
                          separators=(",", ":"), ensure_ascii=False,
                          allow_nan=False).encode("utf-8")

    def sha256(self) -> str:
        return hashlib.sha256(self.canonical_bytes()).hexdigest()
