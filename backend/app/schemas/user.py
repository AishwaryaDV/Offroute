import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str | None
    display_name: str | None
    nationality: str | None
    avatar_url: str | None
    profile_enabled: bool
    profile_bio: str | None
    created_at: datetime


class UserUpdate(BaseModel):
    username: str | None = None
    display_name: str | None = None
    nationality: str | None = None
    # Client compresses to ~512px before encoding (typically well under
    # 200KB as base64); this is a server-side ceiling, not the expected
    # size — the field is unbounded TEXT in Postgres otherwise, and this
    # is a direct data: URL (not an S3 upload), so there's no separate
    # upload step to cap it at.
    avatar_url: str | None = Field(default=None, max_length=2_000_000)
    profile_enabled: bool | None = None
    profile_bio: str | None = None


class PublicProfileResponse(BaseModel):
    username: str
    display_name: str | None
    nationality: str | None
    avatar_url: str | None
    profile_bio: str | None
    created_at: datetime
