import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
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


@router.delete("", status_code=204)
async def clear_all(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await notif_service.delete_all(db, user.id)


@router.delete("/{notif_id}", status_code=204)
async def delete_notification(
    notif_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    deleted = await notif_service.delete_one(db, user.id, notif_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")
