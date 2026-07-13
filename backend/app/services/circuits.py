import secrets
import uuid

from fastapi import HTTPException, status
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.circuit import Circuit
from app.models.point import Point
from app.models.user import User
from app.schemas.circuit import CircuitCreate, CircuitUpdate


async def list_circuits(db: AsyncSession, owner_id: uuid.UUID) -> list[dict]:
    stmt = (
        select(Circuit, func.count(Point.id).label("point_count"))
        .outerjoin(Point, Point.circuit_id == Circuit.id)
        .where(Circuit.owner_id == owner_id)
        .group_by(Circuit.id)
        .order_by(Circuit.updated_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    results = []
    for circuit, point_count in rows:
        obj = circuit.__dict__.copy()
        obj["point_count"] = point_count
        results.append(obj)
    return results


async def get_circuit(db: AsyncSession, circuit_id: uuid.UUID) -> Circuit:
    circuit = await db.get(Circuit, circuit_id)
    if circuit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Circuit not found")
    return circuit


async def get_circuit_with_count(db: AsyncSession, circuit_id: uuid.UUID) -> dict:
    stmt = (
        select(Circuit, func.count(Point.id).label("point_count"))
        .outerjoin(Point, Point.circuit_id == Circuit.id)
        .where(Circuit.id == circuit_id)
        .group_by(Circuit.id)
    )
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Circuit not found")
    circuit, point_count = row
    obj = circuit.__dict__.copy()
    obj["point_count"] = point_count
    return obj


def assert_owner(circuit: Circuit, user_id: uuid.UUID) -> None:
    if circuit.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the circuit owner")


async def create_circuit(
    db: AsyncSession, owner_id: uuid.UUID, data: CircuitCreate
) -> Circuit:
    circuit = Circuit(owner_id=owner_id, **data.model_dump())
    db.add(circuit)
    await db.commit()
    await db.refresh(circuit)
    return circuit


async def update_circuit(
    db: AsyncSession, circuit: Circuit, data: CircuitUpdate
) -> Circuit:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(circuit, field, value)
    await db.commit()
    await db.refresh(circuit)
    return circuit


async def delete_circuit(db: AsyncSession, circuit: Circuit) -> None:
    await db.delete(circuit)
    await db.commit()


async def generate_share_token(db: AsyncSession, circuit: Circuit) -> str:
    if circuit.share_token:
        return circuit.share_token
    token = secrets.token_urlsafe(12)
    circuit.share_token = token
    await db.commit()
    await db.refresh(circuit)
    return token


async def get_circuit_by_token(db: AsyncSession, token: str) -> dict:
    stmt = (
        select(Circuit)
        .options(selectinload(Circuit.points))
        .where(Circuit.share_token == token)
    )
    circuit = (await db.execute(stmt)).scalar_one_or_none()
    if circuit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared circuit not found")
    owner = await db.get(User, circuit.owner_id)
    return {
        "id": circuit.id,
        "title": circuit.title,
        "description": circuit.description,
        "owner_name": owner.display_name if owner else None,
        "point_count": len(circuit.points),
        "start_date": circuit.start_date,
        "end_date": circuit.end_date,
        "created_at": circuit.created_at,
        "points": [
            {
                "id": p.id,
                "order_index": p.order_index,
                "title": p.title,
                "notes": p.notes,
                "latitude": to_shape(p.location).y,
                "longitude": to_shape(p.location).x,
                "visited_at": p.visited_at,
                "category": p.category,
                "rating": p.rating,
            }
            for p in sorted(circuit.points, key=lambda p: p.order_index)
        ],
    }
