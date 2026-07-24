import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PointCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    notes: str | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    visited_at: date | None = None
    category: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class PointUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    notes: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    visited_at: date | None = None
    category: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class ReorderItem(BaseModel):
    id: uuid.UUID
    order_index: int


class ReorderRequest(BaseModel):
    points: list[ReorderItem]


class PointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    circuit_id: uuid.UUID
    order_index: int
    title: str
    notes: str | None
    latitude: float
    longitude: float
    visited_at: date | None
    category: str | None
    rating: int | None
    created_at: datetime


class WorldPointResponse(PointResponse):
    circuit_title: str
    circuit_slug: str | None = None
