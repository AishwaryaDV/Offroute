import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.star import Star


async def star(db: AsyncSession, user_id: uuid.UUID, circuit_id: uuid.UUID) -> Star:
    existing = await db.scalar(
        select(Star).where(Star.user_id == user_id, Star.circuit_id == circuit_id)
    )
    if existing:
        return existing
    s = Star(user_id=user_id, circuit_id=circuit_id)
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


async def unstar(db: AsyncSession, user_id: uuid.UUID, circuit_id: uuid.UUID) -> None:
    await db.execute(
        delete(Star).where(Star.user_id == user_id, Star.circuit_id == circuit_id)
    )
    await db.commit()


async def star_count(db: AsyncSession, circuit_id: uuid.UUID) -> int:
    result = await db.scalar(
        select(func.count()).where(Star.circuit_id == circuit_id)
    )
    return result or 0


async def is_starred(db: AsyncSession, user_id: uuid.UUID, circuit_id: uuid.UUID) -> bool:
    result = await db.scalar(
        select(Star.id).where(Star.user_id == user_id, Star.circuit_id == circuit_id)
    )
    return result is not None
