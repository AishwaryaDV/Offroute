import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CircuitCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    visibility: str = "private"
    tags: list[str] | None = None


class CircuitUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    visibility: str | None = None
    tags: list[str] | None = None


class CircuitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str | None
    cover_media_id: uuid.UUID | None
    visibility: str
    tags: list[str] | None
    created_at: datetime
    updated_at: datetime
    point_count: int = 0
