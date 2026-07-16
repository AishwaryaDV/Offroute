from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.circuit import Circuit
from app.schemas.circuit import CircuitResponse
from app.schemas.user import PublicProfileResponse
from app.services import users as users_service

router = APIRouter(prefix="/u", tags=["profiles"])


@router.get("/{username}", response_model=PublicProfileResponse)
async def get_public_profile(
    username: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await users_service.get_user_by_username(db, username.lower())
    if user is None or not user.profile_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return user


@router.get("/{username}/circuits")
async def get_public_circuits(
    username: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await users_service.get_user_by_username(db, username.lower())
    if user is None or not user.profile_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    stmt = (
        select(Circuit)
        .where(Circuit.owner_id == user.id, Circuit.visibility == "public")
        .order_by(Circuit.updated_at.desc())
    )
    circuits = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "tags": c.tags,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "created_at": c.created_at,
            "share_token": c.share_token,
        }
        for c in circuits
    ]
