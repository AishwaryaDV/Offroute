import uuid

from geoalchemy2.shape import to_shape
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circuit import Circuit
from app.models.point import Point


def _point_to_dict(point: Point) -> dict:
    shape = to_shape(point.location)
    d = {c.key: getattr(point, c.key) for c in point.__table__.columns if c.key != "location"}
    d["latitude"] = shape.y
    d["longitude"] = shape.x
    return d


async def search(
    db: AsyncSession,
    owner_id: uuid.UUID,
    query: str,
    limit: int = 20,
) -> dict:
    pattern = f"%{query}%"

    circuit_stmt = (
        select(Circuit)
        .where(
            Circuit.owner_id == owner_id,
            or_(
                Circuit.title.ilike(pattern),
                Circuit.description.ilike(pattern),
                Circuit.tags.any(query.lower()),
            ),
        )
        .order_by(Circuit.updated_at.desc())
        .limit(limit)
    )
    circuits = (await db.execute(circuit_stmt)).scalars().all()

    point_stmt = (
        select(Point, Circuit.title.label("circuit_title"))
        .join(Circuit, Circuit.id == Point.circuit_id)
        .where(
            Circuit.owner_id == owner_id,
            or_(
                Point.title.ilike(pattern),
                Point.notes.ilike(pattern),
            ),
        )
        .order_by(Point.created_at.desc())
        .limit(limit)
    )
    point_rows = (await db.execute(point_stmt)).all()

    return {
        "circuits": [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "tags": c.tags,
                "point_count": 0,
                "start_date": c.start_date,
                "visibility": c.visibility,
                "created_at": c.created_at,
            }
            for c in circuits
        ],
        "points": [
            {**_point_to_dict(p), "circuit_title": ct}
            for p, ct in point_rows
        ],
    }
