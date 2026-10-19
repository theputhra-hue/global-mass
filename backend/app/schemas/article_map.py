"""Public article grouping/projection metadata; no vectors or source bodies."""
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class MapRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ArticleTopic(MapRecord):
    id: str = Field(pattern=r"^topic-[0-9]+$", max_length=40)
    label: str = Field(min_length=1, max_length=160)
    keywords: list[str] = Field(max_length=12)
    article_count: int = Field(ge=1, le=20000)


class ArticleAssignment(MapRecord):
    article_id: UUID
    topic_id: str | None = Field(default=None, max_length=40)
    basis: Literal["stored_text", "title_only", "unsupported_language", "unavailable"]
    x: float | None = Field(default=None, ge=-100000, le=100000)
    y: float | None = Field(default=None, ge=-100000, le=100000)
    duplicate_of: UUID | None = None

    @model_validator(mode="after")
    def coordinates(self) -> "ArticleAssignment":
        if (self.x is None) != (self.y is None):
            raise ValueError("Both projection coordinates must be supplied together")
        if self.topic_id is not None and self.x is None:
            raise ValueError("Classified articles need projection coordinates")
        if self.basis in ("unsupported_language", "unavailable") and self.topic_id is not None:
            raise ValueError("Unavailable text cannot receive a semantic topic")
        if self.basis in ("unsupported_language", "unavailable") and self.x is not None:
            raise ValueError("Unavailable inputs cannot carry semantic coordinates")
        if self.basis in ("stored_text", "title_only") and self.x is None:
            raise ValueError("Usable inputs require a document projection")
        if self.duplicate_of == self.article_id:
            raise ValueError("Duplicate cannot refer to itself")
        return self


class ArticleMap(MapRecord):
    method: Literal["article-bertopic-umap-v1"] = "article-bertopic-umap-v1"
    started_at: AwareDatetime
    completed_at: AwareDatetime
    source_commit: str = Field(pattern=r"^[0-9a-f]{40}$")
    input_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    config_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    embedding_model: str = Field(min_length=1, max_length=200)
    embedding_revision: str = Field(pattern=r"^[0-9a-f]{40}$")
    seed: int = Field(ge=0, le=4294967295)
    projection: Literal["umap_cosine_2d"] = "umap_cosine_2d"
    topics: list[ArticleTopic] = Field(max_length=2000)
    assignments: list[ArticleAssignment] = Field(max_length=20000)

    @model_validator(mode="after")
    def references(self) -> "ArticleMap":
        if self.completed_at < self.started_at:
            raise ValueError("Map completion precedes start")
        topics = {t.id: t for t in self.topics}
        ids = {a.article_id for a in self.assignments}
        if len(topics) != len(self.topics) or len(ids) != len(self.assignments):
            raise ValueError("Duplicate topic or assignment ID")
        counts = dict.fromkeys(topics, 0)
        for assignment in self.assignments:
            if assignment.topic_id is not None:
                if assignment.topic_id not in counts:
                    raise ValueError("Unknown topic reference")
                counts[assignment.topic_id] += 1
            if assignment.duplicate_of is not None and assignment.duplicate_of not in ids:
                raise ValueError("Unknown duplicate article")
        if any(topic.article_count != counts[topic.id] for topic in self.topics):
            raise ValueError("Topic membership counts do not match")
        return self
