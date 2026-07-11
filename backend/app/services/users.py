import logging
import uuid
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User
from app.schemas.user import UserUpdate

logger = logging.getLogger(__name__)


async def get_or_create_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    email: str,
    user_metadata: dict[str, Any],
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        user = User(
            id=user_id,
            email=email,
            display_name=user_metadata.get("full_name") or user_metadata.get("name"),
            avatar_url=user_metadata.get("avatar_url"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user: User, data: UserUpdate) -> User:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    """Remove the Supabase Auth identity first, then the local user row
    (cascades circuits/points/media via FKs).

    Identity goes first: the JWT stays valid until expiry regardless, and any
    authenticated request auto-provisions a users row — so deleting local data
    before the identity would let a still-live token resurrect the account.
    """
    user_id = user.id
    settings = get_settings()

    if settings.supabase_service_role_key:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": settings.supabase_service_role_key,
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                },
                timeout=10,
            )
        if resp.status_code >= 400 and resp.status_code != 404:
            logger.error(
                "Supabase auth delete failed for %s: %s %s",
                user_id,
                resp.status_code,
                resp.text,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not delete auth identity; account left intact",
            )
    else:
        logger.warning(
            "SUPABASE_SERVICE_ROLE_KEY not set — auth identity %s not deleted",
            user_id,
        )

    await db.delete(user)
    await db.commit()
