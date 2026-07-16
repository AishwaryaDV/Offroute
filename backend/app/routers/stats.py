from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.circuit import Circuit
from app.models.point import Point
from app.models.star import Star
from app.models.user import User

router = APIRouter(prefix="/me/stats", tags=["stats"])


@router.get("")
async def get_my_stats(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit_count = await db.scalar(
        select(func.count()).where(Circuit.owner_id == user.id)
    ) or 0

    point_count = await db.scalar(
        select(func.count(Point.id))
        .join(Circuit, Circuit.id == Point.circuit_id)
        .where(Circuit.owner_id == user.id)
    ) or 0

    stars_received = await db.scalar(
        select(func.count(Star.id))
        .join(Circuit, Circuit.id == Star.circuit_id)
        .where(Circuit.owner_id == user.id)
    ) or 0

    total_clones = await db.scalar(
        select(func.coalesce(func.sum(Circuit.clone_count), 0))
        .where(Circuit.owner_id == user.id)
    ) or 0

    category_counts_rows = (
        await db.execute(
            select(Point.category, func.count())
            .join(Circuit, Circuit.id == Point.circuit_id)
            .where(Circuit.owner_id == user.id, Point.category.is_not(None))
            .group_by(Point.category)
            .order_by(func.count().desc())
        )
    ).all()
    categories = {row[0]: row[1] for row in category_counts_rows}

    return {
        "circuits": circuit_count,
        "points": point_count,
        "stars_received": stars_received,
        "total_clones": total_clones,
        "categories": categories,
    }
