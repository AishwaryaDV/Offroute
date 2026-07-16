from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.point import Point
    from app.models.trip import Trip

VisibilityEnum = Enum("private", "shared", "public", name="visibility", create_type=False)


class Circuit(Base):
    __tablename__ = "circuits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    cover_media_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    visibility: Mapped[str] = mapped_column(
        VisibilityEnum, server_default="private", nullable=False
    )
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    share_token: Mapped[str | None] = mapped_column(Text, unique=True)
    clone_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    cloned_from_token: Mapped[str | None] = mapped_column(Text)
    trip_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL")
    )
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    points: Mapped[list[Point]] = relationship(
        back_populates="circuit", cascade="all, delete-orphan", order_by="Point.order_index"
    )
    trip: Mapped[Trip | None] = relationship(back_populates="circuits")
