import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    # Primary key is the Supabase Auth user id (JWT `sub`), so identity and
    # app data can never drift apart.
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    username: Mapped[str | None] = mapped_column(Text, unique=True)
    display_name: Mapped[str | None] = mapped_column(Text)
    nationality: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    profile_enabled: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    profile_bio: Mapped[str | None] = mapped_column(Text)
    # FK to media.id added in the Phase 2 migration (media table doesn't exist yet).
    profile_cover_media_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
