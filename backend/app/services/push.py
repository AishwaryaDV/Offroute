import json
import logging
import uuid

from pywebpush import WebPushException, webpush
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


async def subscribe(
    db: AsyncSession,
    user_id: uuid.UUID,
    endpoint: str,
    p256dh: str,
    auth: str,
) -> PushSubscription:
    existing = await db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    if existing:
        existing.user_id = user_id
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        existing = PushSubscription(
            user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth
        )
        db.add(existing)
    await db.commit()
    await db.refresh(existing)
    return existing


async def unsubscribe(db: AsyncSession, user_id: uuid.UUID, endpoint: str) -> None:
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == endpoint,
        )
    )
    await db.commit()


async def send_push_to_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    body: str,
    url: str | None = None,
) -> None:
    settings = get_settings()
    if not settings.vapid_private_key:
        return

    subs = (
        await db.execute(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )
    ).scalars().all()

    payload = json.dumps({"title": title, "body": body, "url": url})

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={
                    "sub": f"mailto:{settings.vapid_contact_email}",
                },
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                await db.execute(
                    delete(PushSubscription).where(PushSubscription.id == sub.id)
                )
                await db.commit()
            else:
                logger.warning("Push failed for %s: %s", sub.endpoint[:60], e)
        except Exception as e:
            logger.warning("Push error: %s", e)
