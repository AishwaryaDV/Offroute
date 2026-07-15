import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class CircuitCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    visibility: str = "private"
    tags: list[str] | None = None
    start_date: date | None = None
    end_date: date | None = None


class CircuitUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    visibility: str | None = None
    tags: list[str] | None = None
    start_date: date | None = None
    end_date: date | None = None


class SharedPointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_index: int
    title: str
    notes: str | None
    latitude: float
    longitude: float
    visited_at: date | None
    category: str | None
    rating: int | None


class SharedCircuitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    owner_name: str | None = None
    point_count: int = 0
    start_date: date | None
    end_date: date | None
    created_at: datetime
    points: list[SharedPointResponse] = []


class CircuitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str | None
    cover_media_id: uuid.UUID | None
    visibility: str
    tags: list[str] | None
    share_token: str | None = None
    start_date: date | None
    end_date: date | None
    created_at: datetime
    updated_at: datetime
    point_count: int = 0
    star_count: int = 0
    is_starred: bool = False
