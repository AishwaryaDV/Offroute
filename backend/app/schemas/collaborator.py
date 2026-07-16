import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class CollaboratorInvite(BaseModel):
    email: EmailStr
    role: str = "viewer"


class CollaboratorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    circuit_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    status: str
    created_at: datetime
    user_email: str | None = None
    user_display_name: str | None = None


class InviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    circuit_id: uuid.UUID
    circuit_title: str
    role: str
    status: str
    invited_by_name: str | None = None
    created_at: datetime
