import logging
import uuid
from functools import lru_cache

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.media import Media

logger = logging.getLogger(__name__)

MAX_PHOTOS_PER_POINT = 9
UPLOAD_URL_EXPIRY = 600  # 10 minutes


@lru_cache
def _get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name=settings.s3_region,
        config=BotoConfig(signature_version="s3v4"),
    )


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
    settings = get_settings()
    try:
        _get_s3_client().delete_object(
            Bucket=settings.s3_bucket,
            Key=media.storage_path,
        )
    except ClientError:
        logger.warning("Storage delete failed for %s", media.storage_path, exc_info=True)
    await db.delete(media)
    await db.commit()


def generate_upload_url(storage_path: str) -> str | None:
    settings = get_settings()
    if not settings.s3_access_key_id:
        return None
    try:
        return _get_s3_client().generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.s3_bucket,
                "Key": storage_path,
                "ContentType": "image/jpeg",
            },
            ExpiresIn=UPLOAD_URL_EXPIRY,
        )
    except ClientError:
        logger.error("Failed to generate upload URL for %s", storage_path, exc_info=True)
        return None


def get_public_url(storage_path: str) -> str:
    settings = get_settings()
    return f"{settings.storage_public_url}/{storage_path}"
