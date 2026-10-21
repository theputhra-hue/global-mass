import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class RoleEnum(str, enum.Enum):
    viewer = "viewer"
    user = "user"
    admin = "admin"
    researcher = "researcher"

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("access_status IN ('pending', 'approved', 'rejected')", name="ck_users_access_status"),
        Index("ix_users_visitor_requests", "role", "access_status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.user, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Legacy/operator-created accounts keep access; public registration always
    # sets pending explicitly, independently of any client-supplied flags.
    access_status: Mapped[str] = mapped_column(String(20), default="approved", server_default="approved", nullable=False)
    access_revision: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    access_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    access_reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)
