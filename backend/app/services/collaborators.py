import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circuit import Circuit
from app.models.collaborator import Collaborator
from app.models.user import User


async def invite(
    db: AsyncSession,
    circuit_id: uuid.UUID,
    inviter_id: uuid.UUID,
    email: str,
    role: str,
) -> dict:
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with that email",
        )
    if user.id == inviter_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself",
        )

    existing = await db.scalar(
        select(Collaborator).where(
            Collaborator.circuit_id == circuit_id,
            Collaborator.user_id == user.id,
            Collaborator.status != "declined",
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already invited",
        )

    collab = Collaborator(
        circuit_id=circuit_id,
        user_id=user.id,
        invited_by=inviter_id,
        role=role,
        status="pending",
    )
    db.add(collab)
    await db.commit()
    await db.refresh(collab)

    return _collab_to_dict(collab, user)


async def list_collaborators(db: AsyncSession, circuit_id: uuid.UUID) -> list[dict]:
    stmt = (
        select(Collaborator, User)
        .join(User, User.id == Collaborator.user_id)
        .where(Collaborator.circuit_id == circuit_id)
        .order_by(Collaborator.created_at)
    )
    rows = (await db.execute(stmt)).all()
    return [_collab_to_dict(c, u) for c, u in rows]


async def remove_collaborator(db: AsyncSession, collab_id: uuid.UUID) -> None:
    collab = await db.get(Collaborator, collab_id)
    if collab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found")
    await db.delete(collab)
    await db.commit()


async def get_pending_invites(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    stmt = (
        select(Collaborator, Circuit, User)
        .join(Circuit, Circuit.id == Collaborator.circuit_id)
        .join(User, User.id == Collaborator.invited_by)
        .where(Collaborator.user_id == user_id, Collaborator.status == "pending")
        .order_by(Collaborator.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": c.id,
            "circuit_id": c.circuit_id,
            "circuit_title": circuit.title,
            "role": c.role,
            "status": c.status,
            "invited_by_name": inviter.display_name or inviter.email,
            "created_at": c.created_at,
        }
        for c, circuit, inviter in rows
    ]


async def respond_invite(
    db: AsyncSession, collab_id: uuid.UUID, user_id: uuid.UUID, accept: bool
) -> Collaborator:
    collab = await db.get(Collaborator, collab_id)
    if collab is None or collab.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if collab.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite already responded to")
    collab.status = "accepted" if accept else "declined"
    await db.commit()
    return collab


async def is_collaborator(
    db: AsyncSession, circuit_id: uuid.UUID, user_id: uuid.UUID
) -> str | None:
    collab = await db.scalar(
        select(Collaborator).where(
            Collaborator.circuit_id == circuit_id,
            Collaborator.user_id == user_id,
            Collaborator.status == "accepted",
        )
    )
    return collab.role if collab else None


def _collab_to_dict(collab: Collaborator, user: User) -> dict:
    return {
        "id": collab.id,
        "circuit_id": collab.circuit_id,
        "user_id": collab.user_id,
        "role": collab.role,
        "status": collab.status,
        "created_at": collab.created_at,
        "user_email": user.email,
        "user_display_name": user.display_name,
    }
