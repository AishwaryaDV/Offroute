import logging
import uuid
from typing import Any

import httpx
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
    """Delete the local user row (cascades circuits/points/media via FKs),
    then remove the Supabase Auth identity so the login itself is gone."""
    user_id = user.id
    await db.delete(user)
    await db.commit()

    settings = get_settings()
    if not settings.supabase_service_role_key:
        logger.warning(
            "SUPABASE_SERVICE_ROLE_KEY not set — auth identity %s not deleted",
            user_id,
        )
        return

    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=10,
        )
        if resp.status_code >= 400:
            # App data is already gone; an orphaned auth identity can't
            # reach any data, so log and continue rather than failing.
            logger.error(
                "Supabase auth delete failed for %s: %s %s",
                user_id,
                resp.status_code,
                resp.text,
            )
