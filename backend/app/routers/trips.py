import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.circuit import Circuit
from app.models.trip import Trip
from app.models.user import User

router = APIRouter(prefix="/trips", tags=["trips"])


class TripCreate(BaseModel):
    title: str
    description: str | None = None


class TripUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class TripResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    circuit_count: int


@router.get("", response_model=list[TripResponse])
async def list_trips(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    stmt = select(Trip).where(Trip.owner_id == user.id).order_by(Trip.updated_at.desc())
    trips = (await db.execute(stmt)).scalars().all()
    return [
        TripResponse(
            id=t.id,
            title=t.title,
            description=t.description,
            circuit_count=len(t.circuits),
        )
        for t in trips
    ]


@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(
    data: TripCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    trip = Trip(owner_id=user.id, title=data.title, description=data.description)
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return TripResponse(id=trip.id, title=trip.title, description=trip.description, circuit_count=0)


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: uuid.UUID,
    data: TripUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    trip = await db.get(Trip, trip_id)
    if trip is None or trip.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(trip, field, value)
    await db.commit()
    await db.refresh(trip)
    return TripResponse(
        id=trip.id, title=trip.title, description=trip.description, circuit_count=len(trip.circuits)
    )


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    trip = await db.get(Trip, trip_id)
    if trip is None or trip.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    await db.delete(trip)
    await db.commit()


@router.post("/{trip_id}/circuits/{circuit_id}", status_code=204)
async def add_circuit_to_trip(
    trip_id: uuid.UUID,
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    trip = await db.get(Trip, trip_id)
    if trip is None or trip.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    circuit = await db.get(Circuit, circuit_id)
    if circuit is None or circuit.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Circuit not found")
    circuit.trip_id = trip_id
    await db.commit()


@router.delete("/{trip_id}/circuits/{circuit_id}", status_code=204)
async def remove_circuit_from_trip(
    trip_id: uuid.UUID,
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await db.get(Circuit, circuit_id)
    if circuit is None or circuit.owner_id != user.id or circuit.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Circuit not found in trip")
    circuit.trip_id = None
    await db.commit()
