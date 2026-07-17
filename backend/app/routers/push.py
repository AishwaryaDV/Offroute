from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import push as push_service

router = APIRouter(prefix="/push", tags=["push"])


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeRequest(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/vapid-key")
async def get_vapid_key():
    return {"publicKey": get_settings().vapid_public_key}


@router.post("/subscribe", status_code=201)
async def subscribe(
    body: SubscribeRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await push_service.subscribe(
        db, user.id, body.endpoint, body.keys.p256dh, body.keys.auth
    )
    return {"ok": True}


@router.post("/unsubscribe", status_code=204)
async def unsubscribe(
    body: UnsubscribeRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await push_service.unsubscribe(db, user.id, body.endpoint)
