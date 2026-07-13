import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.media import MediaCreate, MediaResponse
from app.services import circuits as circuits_service
from app.services import media as media_service
from app.services import points as points_service

router = APIRouter(tags=["media"])


@router.get("/points/{point_id}/media", response_model=list[MediaResponse])
async def list_media(
    point_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    point = await points_service.get_point(db, point_id)
    circuit = await circuits_service.get_circuit(db, point.circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return await media_service.list_media(db, point_id)


@router.post("/points/{point_id}/media", response_model=MediaResponse, status_code=201)
async def create_media(
    point_id: uuid.UUID,
    data: MediaCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    point = await points_service.get_point(db, point_id)
    circuit = await circuits_service.get_circuit(db, point.circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    media = await media_service.create_media(
        db,
        point_id=point_id,
        circuit_id=circuit.id,
        media_type=data.type,
        caption=data.caption,
    )
    upload_url = media_service.generate_upload_url(media.storage_path)
    result = {
        **{c.key: getattr(media, c.key) for c in media.__table__.columns},
        "upload_url": upload_url,
    }
    return result


@router.delete("/media/{media_id}", status_code=204)
async def delete_media(
    media_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    media = await media_service.get_media(db, media_id)
    if media.circuit_id:
        circuit = await circuits_service.get_circuit(db, media.circuit_id)
        circuits_service.assert_owner(circuit, user.id)
    await media_service.delete_media(db, media)
