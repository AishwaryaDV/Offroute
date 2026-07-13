import uuid

from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point as ShapelyPoint
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circuit import Circuit
from app.models.point import Point
from app.schemas.point import PointCreate, PointUpdate, ReorderRequest


def _point_to_dict(point: Point) -> dict:
    shape = to_shape(point.location)
    d = {c.key: getattr(point, c.key) for c in point.__table__.columns if c.key != "location"}
    d["latitude"] = shape.y
    d["longitude"] = shape.x
    return d


async def list_points(db: AsyncSession, circuit_id: uuid.UUID) -> list[dict]:
    stmt = (
        select(Point)
        .where(Point.circuit_id == circuit_id)
        .order_by(Point.order_index)
    )
    points = (await db.execute(stmt)).scalars().all()
    return [_point_to_dict(p) for p in points]


async def get_point(db: AsyncSession, point_id: uuid.UUID) -> Point:
    point = await db.get(Point, point_id)
    if point is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Point not found")
    return point


async def create_point(
    db: AsyncSession, circuit_id: uuid.UUID, data: PointCreate
) -> dict:
    max_idx = await db.scalar(
        select(func.coalesce(func.max(Point.order_index), -1))
        .where(Point.circuit_id == circuit_id)
    )
    point = Point(
        circuit_id=circuit_id,
        order_index=max_idx + 1,
        title=data.title,
        notes=data.notes,
        location=from_shape(ShapelyPoint(data.longitude, data.latitude), srid=4326),
        visited_at=data.visited_at,
        category=data.category,
        rating=data.rating,
    )
    db.add(point)
    await db.commit()
    await db.refresh(point)
    return _point_to_dict(point)


async def update_point(
    db: AsyncSession, point: Point, data: PointUpdate
) -> dict:
    updates = data.model_dump(exclude_unset=True)
    lat = updates.pop("latitude", None)
    lng = updates.pop("longitude", None)
    if lat is not None or lng is not None:
        shape = to_shape(point.location)
        new_lat = lat if lat is not None else shape.y
        new_lng = lng if lng is not None else shape.x
        point.location = from_shape(ShapelyPoint(new_lng, new_lat), srid=4326)
    for field, value in updates.items():
        setattr(point, field, value)
    await db.commit()
    await db.refresh(point)
    return _point_to_dict(point)


async def delete_point(db: AsyncSession, point: Point) -> None:
    await db.delete(point)
    await db.commit()


async def list_all_points(db: AsyncSession, owner_id: uuid.UUID) -> list[dict]:
    stmt = (
        select(Point, Circuit.title.label("circuit_title"))
        .join(Circuit, Circuit.id == Point.circuit_id)
        .where(Circuit.owner_id == owner_id)
        .order_by(Circuit.updated_at.desc(), Point.order_index)
    )
    rows = (await db.execute(stmt)).all()
    results = []
    for point, circuit_title in rows:
        d = _point_to_dict(point)
        d["circuit_title"] = circuit_title
        results.append(d)
    return results


async def reorder_points(
    db: AsyncSession, circuit_id: uuid.UUID, data: ReorderRequest
) -> list[dict]:
    for item in data.points:
        point = await db.get(Point, item.id)
        if point is None or point.circuit_id != circuit_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Point {item.id} not in this circuit",
            )
        point.order_index = item.order_index
    await db.commit()
    return await list_points(db, circuit_id)
