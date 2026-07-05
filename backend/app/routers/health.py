from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.health import HealthResponse
from app.services.health import check_database

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    db_ok = await check_database(db)
    return HealthResponse(status="ok", database="ok" if db_ok else "error")
