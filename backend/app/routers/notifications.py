from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import notifications as notif_service

router = APIRouter(prefix="/me/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await notif_service.list_notifications(db, user.id)


@router.get("/unread-count")
async def get_unread_count(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    count = await notif_service.unread_count(db, user.id)
    return {"count": count}


@router.post("/read", status_code=204)
async def mark_all_read(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await notif_service.mark_all_read(db, user.id)
