"""Public, compact, validated semantic roads. No model or vector dependencies."""
from collections import defaultdict
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, model_validator

from app.schemas.article_map import MapRecord

Index = Annotated[int, Field(strict=True, ge=0, le=19999)]
Score = Annotated[float, Field(ge=0, le=1)]
Road = tuple[Index, Index, Score]


class Highway(MapRecord):
    a: str
    b: str
    support: int = Field(ge=1, le=100000)
    endpoints_a: int = Field(ge=1, le=20000)
    endpoints_b: int = Field(ge=1, le=20000)


class CityTheme(MapRecord):
    id: str = Field(pattern=r"^theme-[0-9]+$", max_length=40)
    label: str = Field(min_length=1, max_length=160)
    topics: list[str] = Field(min_length=1, max_length=2000)
    article_count: int = Field(ge=1, le=20000)


class Superway(MapRecord):
    a: str
    b: str
    support: int = Field(ge=1, le=100000)
    highways: int = Field(ge=1, le=100000)


def road_aggregates(roads: list[Road], topics: list[str | None], min_support: int, min_endpoints: int) -> list[dict[str, Any]]:
    pairs: dict[tuple[str, str], list[tuple[int, int]]] = defaultdict(list)
    for left_index, right_index, _ in roads:
        ta, tb = topics[left_index], topics[right_index]
        if ta is None or tb is None or ta == tb:
            continue
        if ta > tb:
            ta, tb, left_index, right_index = tb, ta, right_index, left_index
        pairs[ta, tb].append((left_index, right_index))
    result = []
    for (a, b), support in sorted(pairs.items()):
        left, right = len({i for i, _ in support}), len({j for _, j in support})
        if len(support) >= min_support and min(left, right) >= min_endpoints:
            result.append({"a": a, "b": b, "support": len(support), "endpoints_a": left, "endpoints_b": right})
    return result


def super_aggregates(highways: list[Highway], membership: dict[str, str]) -> list[dict[str, Any]]:
    pairs: dict[tuple[str, str], list[int]] = defaultdict(list)
    for highway in highways:
        a, b = sorted((membership[highway.a], membership[highway.b]))
        if a != b:
            pairs[a, b].append(highway.support)
    return [{"a": a, "b": b, "support": sum(values), "highways": len(values)} for (a, b), values in sorted(pairs.items())]


class CityNetwork(MapRecord):
    method: Literal["mutual-cosine-city-v1"] = "mutual-cosine-city-v1"
    calibration: Literal["exploratory_not_human_validated"] = "exploratory_not_human_validated"
    started_at: AwareDatetime
    completed_at: AwareDatetime
    source_commit: str = Field(pattern=r"^[0-9a-f]{40}$")
    source_map_run_id: UUID
    source_map_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    input_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    config_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    embedding_model: str = Field(min_length=1, max_length=200)
    embedding_revision: str = Field(pattern=r"^[0-9a-f]{40}$")
    community_method: Literal["networkx_louvain"] = "networkx_louvain"
    community_revision: str = Field(min_length=1, max_length=40)
    seed: int = Field(ge=0, le=4294967295)
    neighbor_k: int = Field(ge=1, le=20)
    min_similarity: Score
    min_highway_support: int = Field(ge=1, le=100)
    min_highway_endpoints: int = Field(ge=1, le=20)
    article_ids: list[UUID] = Field(max_length=20000)
    roads: list[Road] = Field(max_length=100000)
    highways: list[Highway] = Field(max_length=20000)
    themes: list[CityTheme] = Field(max_length=2000)
    superways: list[Superway] = Field(max_length=20000)

    @model_validator(mode="after")
    def integrity(self) -> "CityNetwork":
        if self.completed_at < self.started_at:
            raise ValueError("Network completion precedes start")
        if len(set(self.article_ids)) != len(self.article_ids):
            raise ValueError("Duplicate article index")
        keys = [(a, b) for a, b, _ in self.roads]
        if keys != sorted(set(keys)):
            raise ValueError("Roads must have unique, sorted endpoints")
        degree: dict[int, int] = defaultdict(int)
        for a, b, score in self.roads:
            if a >= b or b >= len(self.article_ids) or score < self.min_similarity:
                raise ValueError("Invalid road endpoints or threshold")
            degree[a] += 1
            degree[b] += 1
        if any(d > self.neighbor_k for d in degree.values()):
            raise ValueError("Mutual-neighbor degree exceeds construction bound")
        if len({t.id for t in self.themes}) != len(self.themes):
            raise ValueError("Duplicate theme ID")
        return self
