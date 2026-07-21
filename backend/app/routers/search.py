from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import search as search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: Annotated[str, Query(min_length=1, max_length=200)],
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=20, ge=1, le=50),
):
    return await search_service.search(db, user.id, q, limit)
