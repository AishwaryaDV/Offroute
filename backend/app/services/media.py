import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import Media

MAX_PHOTOS_PER_POINT = 20


async def list_media(db: AsyncSession, point_id: uuid.UUID) -> list[Media]:
    stmt = (
        select(Media)
        .where(Media.point_id == point_id)
        .order_by(Media.created_at)
    )
    return list((await db.execute(stmt)).scalars().all())


async def create_media(
    db: AsyncSession,
    point_id: uuid.UUID,
    circuit_id: uuid.UUID,
    media_type: str = "photo",
    caption: str | None = None,
) -> Media:
    count = await db.scalar(
        select(func.count()).where(Media.point_id == point_id)
    )
    if count is not None and count >= MAX_PHOTOS_PER_POINT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_PHOTOS_PER_POINT} photos per point",
        )

    # storage_path is a placeholder until Supabase Storage is wired up
    storage_path = f"circuits/{circuit_id}/points/{point_id}/{uuid.uuid4()}.jpg"

    media = Media(
        point_id=point_id,
        circuit_id=circuit_id,
        type=media_type,
        storage_path=storage_path,
        caption=caption,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    return media


async def get_media(db: AsyncSession, media_id: uuid.UUID) -> Media:
    media = await db.get(Media, media_id)
    if media is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Media not found"
        )
    return media


async def delete_media(db: AsyncSession, media: Media) -> None:
    # TODO: delete from Supabase Storage when wired up
    await db.delete(media)
    await db.commit()


def generate_upload_url(storage_path: str) -> str | None:
    # TODO: generate pre-signed S3 upload URL via boto3
    # Returns None until Supabase Storage credentials are configured
    return None
