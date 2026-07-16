import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.collaborator import CollaboratorInvite, CollaboratorResponse, InviteResponse
from app.services import circuits as circuits_service
from app.services import collaborators as collab_service

router = APIRouter(tags=["collaborators"])


@router.post(
    "/circuits/{circuit_id}/collaborators",
    response_model=CollaboratorResponse,
    status_code=201,
)
async def invite_collaborator(
    circuit_id: uuid.UUID,
    data: CollaboratorInvite,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await collab_service.invite(db, circuit_id, user.id, data.email, data.role)


@router.get(
    "/circuits/{circuit_id}/collaborators",
    response_model=list[CollaboratorResponse],
)
async def list_collaborators(
    circuit_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await collab_service.list_collaborators(db, circuit_id)


@router.delete("/circuits/{circuit_id}/collaborators/{collab_id}", status_code=204)
async def remove_collaborator(
    circuit_id: uuid.UUID,
    collab_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.get_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    await collab_service.remove_collaborator(db, collab_id)


@router.get("/me/invites", response_model=list[InviteResponse])
async def get_my_invites(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await collab_service.get_pending_invites(db, user.id)


@router.post("/me/invites/{invite_id}/accept", status_code=204)
async def accept_invite(
    invite_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await collab_service.respond_invite(db, invite_id, user.id, accept=True)


@router.post("/me/invites/{invite_id}/decline", status_code=204)
async def decline_invite(
    invite_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await collab_service.respond_invite(db, invite_id, user.id, accept=False)
