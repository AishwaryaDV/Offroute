import logging
import uuid
from functools import lru_cache

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.media import Media

logger = logging.getLogger(__name__)

MAX_PHOTOS_PER_POINT = 9
UPLOAD_URL_EXPIRY = 600  # 10 minutes
# Client compresses to ~1MB before upload; this is a server-side ceiling on
# the presigned URL itself, not the expected size — blocks someone from
# taking a valid presigned URL and PUTting an arbitrarily large file to it.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@lru_cache
def _get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name=settings.s3_region,
        config=BotoConfig(signature_version="s3v4", connect_timeout=5, read_timeout=5, retries={"max_attempts": 1}),
    )


async def list_media(db: AsyncSession, point_id: uuid.UUID) -> list[Media]:
    stmt = (
        select(Media)
        .where(Media.point_id == point_id)
        .order_by(Media.created_at)
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_circuit_media(db: AsyncSession, circuit_id: uuid.UUID) -> list[Media]:
    stmt = (
        select(Media)
        .where(Media.circuit_id == circuit_id, Media.type == "photo")
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


async def delete_objects_for_circuit(db: AsyncSession, circuit_id: uuid.UUID) -> None:
    """Best-effort S3 cleanup for every photo on a circuit, called before the
    circuit row is deleted. The DB rows cascade away with the circuit either
    way — this only exists because that cascade doesn't touch storage, and
    without it every deleted circuit leaves its files behind forever."""
    settings = get_settings()
    paths = (
        await db.execute(select(Media.storage_path).where(Media.circuit_id == circuit_id))
    ).scalars().all()
    if not paths:
        return
    client = _get_s3_client()
    for path in paths:
        try:
            client.delete_object(Bucket=settings.s3_bucket, Key=path)
        except (ClientError, BotoCoreError):
            logger.warning("Storage delete failed for %s", path, exc_info=True)


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
    except (ClientError, BotoCoreError):
        # Network/timeout errors (BotoCoreError) aren't ClientError subclasses —
        # without catching both, an unreachable/slow storage backend hangs the
        # request and 500s instead of degrading gracefully.
        logger.warning("Storage delete failed for %s", media.storage_path, exc_info=True)
    await db.delete(media)
    await db.commit()


def generate_upload_post(storage_path: str) -> dict | None:
    """Presigned POST (not PUT) — only POST policies support a
    content-length-range condition, which is what actually enforces the
    size cap server-side. A presigned PUT URL has no such mechanism; anyone
    holding it could upload an arbitrarily large file."""
    settings = get_settings()
    if not settings.s3_access_key_id:
        return None
    try:
        return _get_s3_client().generate_presigned_post(
            Bucket=settings.s3_bucket,
            Key=storage_path,
            Fields={"Content-Type": "image/jpeg"},
            Conditions=[
                {"Content-Type": "image/jpeg"},
                ["content-length-range", 1, MAX_UPLOAD_BYTES],
            ],
            ExpiresIn=UPLOAD_URL_EXPIRY,
        )
    except ClientError:
        logger.error("Failed to generate upload POST for %s", storage_path, exc_info=True)
        return None


def get_public_url(storage_path: str) -> str:
    settings = get_settings()
    return f"{settings.storage_public_url}/{storage_path}"
