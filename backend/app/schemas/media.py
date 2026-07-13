import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MediaCreate(BaseModel):
    point_id: uuid.UUID
    type: str = "photo"
    caption: str | None = None


class MediaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    point_id: uuid.UUID | None
    circuit_id: uuid.UUID | None
    type: str
    storage_path: str
    caption: str | None
    created_at: datetime
    upload_url: str | None = None
