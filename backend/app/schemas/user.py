import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
    avatar_url: str | None = None
    profile_enabled: bool | None = None
    profile_bio: str | None = None


class PublicProfileResponse(BaseModel):
    username: str
    display_name: str | None
    nationality: str | None
    avatar_url: str | None
    profile_bio: str | None
    created_at: datetime
