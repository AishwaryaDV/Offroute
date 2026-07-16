import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.circuit import CircuitCreate, CircuitResponse, CircuitUpdate, SharedCircuitResponse
from app.services import circuits as circuits_service
from app.services import notifications as notif_service
from app.services import stars as stars_service

router = APIRouter(prefix="/circuits", tags=["circuits"])


@router.get("", response_model=list[CircuitResponse])
async def list_circuits(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await circuits_service.list_circuits(db, user.id)


@router.post("", response_model=CircuitResponse, status_code=201)
async def create_circuit(
    data: CircuitCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.create_circuit(db, user.id, data)
    return await circuits_service.get_circuit_with_count(db, circuit.id, user.id)


@router.get("/{circuit_id}", response_model=CircuitResponse)
async def get_circuit(
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await circuits_service.get_circuit_with_count(db, circuit_id, user.id)


@router.patch("/{circuit_id}", response_model=CircuitResponse)
async def update_circuit(
    circuit_id: uuid.UUID,
    data: CircuitUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    await circuits_service.update_circuit(db, circuit, data)
    return await circuits_service.get_circuit_with_count(db, circuit_id, user.id)


@router.delete("/{circuit_id}", status_code=204)
async def delete_circuit(
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    await circuits_service.delete_circuit(db, circuit)


@router.post("/{circuit_id}/star", status_code=201)
async def star_circuit(
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    await stars_service.star(db, user.id, circuit_id)
    if circuit.owner_id != user.id:
        actor_name = user.display_name or user.email
        await notif_service.create(
            db, circuit.owner_id, "star",
            f"{actor_name} starred your circuit \"{circuit.title}\"",
            circuit_id=circuit_id, actor_id=user.id,
        )
    count = await stars_service.star_count(db, circuit_id)
    return {"star_count": count, "is_starred": True}


@router.delete("/{circuit_id}/star")
async def unstar_circuit(
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await stars_service.unstar(db, user.id, circuit_id)
    count = await stars_service.star_count(db, circuit_id)
    return {"star_count": count, "is_starred": False}


@router.post("/{circuit_id}/share")
async def share_circuit(
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    token = await circuits_service.generate_share_token(db, circuit)
    return {"share_token": token}


shared_router = APIRouter(tags=["shared"])


@shared_router.get("/shared/{token}", response_model=SharedCircuitResponse)
async def get_shared_circuit(
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await circuits_service.get_circuit_by_token(db, token)


@shared_router.post("/shared/{token}/clone", response_model=CircuitResponse, status_code=201)
async def clone_shared_circuit(
    token: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    clone = await circuits_service.clone_circuit(db, token, user.id)
    source = await circuits_service.get_circuit_by_share_token(db, token)
    if source:
        actor_name = user.display_name or user.email
        await notif_service.create(
            db, source.owner_id, "clone",
            f"{actor_name} cloned your circuit \"{source.title}\"",
            circuit_id=source.id, actor_id=user.id,
        )
    return await circuits_service.get_circuit_with_count(db, clone.id, user.id)
