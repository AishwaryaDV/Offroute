import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.point import PointCreate, PointResponse, PointUpdate, ReorderRequest, WorldPointResponse
from app.services import circuits as circuits_service
from app.services import points as points_service

router = APIRouter(tags=["points"])


@router.get("/points/all", response_model=list[WorldPointResponse])
async def list_all_points(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await points_service.list_all_points(db, user.id)


@router.get("/circuits/{circuit_id}/points", response_model=list[PointResponse])
async def list_points(
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await points_service.list_points(db, circuit_id)


@router.post("/circuits/{circuit_id}/points", response_model=PointResponse, status_code=201)
async def create_point(
    circuit_id: uuid.UUID,
    data: PointCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await points_service.create_point(db, circuit_id, data)


@router.patch("/points/{point_id}", response_model=PointResponse)
async def update_point(
    point_id: uuid.UUID,
    data: PointUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    point = await points_service.get_point(db, point_id)
    circuit = await circuits_service.get_circuit(db, point.circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await points_service.update_point(db, point, data)


@router.delete("/points/{point_id}", status_code=204)
async def delete_point(
    point_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    point = await points_service.get_point(db, point_id)
    circuit = await circuits_service.get_circuit(db, point.circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    await points_service.delete_point(db, point)


@router.patch("/circuits/{circuit_id}/points/reorder", response_model=list[PointResponse])
async def reorder_points(
    circuit_id: uuid.UUID,
    data: ReorderRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await points_service.reorder_points(db, circuit_id, data)
