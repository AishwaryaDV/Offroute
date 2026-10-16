import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.media import MediaCreate, MediaResponse
from app.services import audit as audit_service
from app.services import circuits as circuits_service
from app.services import media as media_service
from app.services import points as points_service
from app.services.ratelimit import rate_limit

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
    items = await media_service.list_media(db, point_id)
    return [
        {
            **{c.key: getattr(m, c.key) for c in m.__table__.columns},
            "public_url": media_service.get_public_url(m.storage_path),
        }
        for m in items
    ]


@router.post(
    "/points/{point_id}/media",
    response_model=MediaResponse,
    status_code=201,
    dependencies=[Depends(rate_limit("media:create", limit=20, window_seconds=60))],
)
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
    upload = media_service.generate_upload_post(media.storage_path)
    return {
        **{c.key: getattr(media, c.key) for c in media.__table__.columns},
        "upload_url": upload["url"] if upload else None,
        "upload_fields": upload["fields"] if upload else None,
        "public_url": media_service.get_public_url(media.storage_path),
    }


@router.get("/circuits/{circuit_id}/media", response_model=list[MediaResponse])
async def list_circuit_media(
    circuit_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    circuit = await circuits_service.resolve_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    items = await media_service.list_circuit_media(db, circuit.id)
    return [
        {
            **{c.key: getattr(m, c.key) for c in m.__table__.columns},
            "public_url": media_service.get_public_url(m.storage_path),
        }
        for m in items
    ]


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
    media_id_, point_id_, circuit_id_ = media.id, media.point_id, media.circuit_id
    await media_service.delete_media(db, media)
    await audit_service.record(
        db, user.id, "media.delete", "media", media_id_,
        {"point_id": str(point_id_) if point_id_ else None, "circuit_id": str(circuit_id_) if circuit_id_ else None},
    )
