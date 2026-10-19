import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class PublicationUpload(Base):
    __tablename__ = "publication_uploads"

    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    digest: Mapped[str] = mapped_column(String(64), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class PublicationHead(Base):
    __tablename__ = "publication_head"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_uploads.run_id"))
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))


class PublishedArticleRow(Base):
    __tablename__ = "published_articles"
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_uploads.run_id"), primary_key=True)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str | None] = mapped_column(Text)
    domain: Mapped[str] = mapped_column(String(300), nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class PublishedClaimRow(Base):
    __tablename__ = "published_claims"
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_uploads.run_id"), primary_key=True)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    article_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class PublishedRelationshipRow(Base):
    __tablename__ = "published_relationships"
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_uploads.run_id"), primary_key=True)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    from_claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    to_claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class PublishedArticleMapRow(Base):
    __tablename__ = "published_article_maps"
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_uploads.run_id"), primary_key=True)
    # Bounded method/topic summary. Per-article assignments are materialized into
    # published_articles.payload so node pages need not load the complete map.
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class PublishedCityNetworkRow(Base):
    __tablename__ = "published_city_networks"
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_uploads.run_id"), primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class PublishedCityRoadRow(Base):
    __tablename__ = "published_city_roads"
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_uploads.run_id"), primary_key=True)
    ordinal: Mapped[int] = mapped_column(Integer, primary_key=True)
    payload: Mapped[list[Any]] = mapped_column(JSON, nullable=False)
