import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.notification import Notification
from app.models.user import User
from app.services.push import send_push_to_user

PUSH_TITLES = {
    "star": "New star",
    "clone": "Circuit cloned",
    "invite": "Collaboration invite",
    "invite_accepted": "Invite accepted",
    "point_added": "New point added",
    "point_deleted": "Point removed",
}


async def create(
    db: AsyncSession,
    user_id: uuid.UUID,
    type: str,
    message: str,
    circuit_id: uuid.UUID | None = None,
    actor_id: uuid.UUID | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=type,
        message=message,
        circuit_id=circuit_id,
        actor_id=actor_id,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    url = f"/circuits/{circuit_id}" if circuit_id else "/dashboard"
    await send_push_to_user(
        db, user_id, PUSH_TITLES.get(type, "Offroute"), message, url
    )

    return notif


async def list_notifications(
    db: AsyncSession, user_id: uuid.UUID, limit: int = 50
) -> list[dict]:
    stmt = (
        select(Notification)
        .options(joinedload(Notification.actor))
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    results = (await db.execute(stmt)).unique().scalars().all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "circuit_id": n.circuit_id,
            "actor_name": n.actor.display_name or n.actor.email if n.actor else None,
            "read": n.read,
            "created_at": n.created_at,
        }
        for n in results
    ]


async def unread_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.scalar(
        select(func.count()).where(
            Notification.user_id == user_id, Notification.read == False
        )
    )
    return result or 0


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read == False)
        .values(read=True)
    )
    await db.commit()


async def delete_one(db: AsyncSession, user_id: uuid.UUID, notif_id: uuid.UUID) -> bool:
    from sqlalchemy import delete as sa_delete

    result = await db.execute(
        sa_delete(Notification).where(
            Notification.id == notif_id, Notification.user_id == user_id
        )
    )
    await db.commit()
    return result.rowcount > 0


async def delete_all(db: AsyncSession, user_id: uuid.UUID) -> None:
    from sqlalchemy import delete as sa_delete

    await db.execute(
        sa_delete(Notification).where(Notification.user_id == user_id)
    )
    await db.commit()


async def notify_circuit_members(
    db: AsyncSession,
    circuit_id: uuid.UUID,
    actor_id: uuid.UUID,
    type: str,
    message: str,
) -> None:
    from app.models.circuit import Circuit
    from app.models.collaborator import Collaborator

    circuit = await db.get(Circuit, circuit_id)
    if not circuit:
        return

    recipient_ids: set[uuid.UUID] = set()

    if circuit.owner_id != actor_id:
        recipient_ids.add(circuit.owner_id)

    collabs = (
        await db.execute(
            select(Collaborator.user_id).where(
                Collaborator.circuit_id == circuit_id,
                Collaborator.status == "accepted",
                Collaborator.user_id != actor_id,
            )
        )
    ).scalars().all()
    recipient_ids.update(collabs)

    for uid in recipient_ids:
        await create(db, uid, type, message, circuit_id=circuit_id, actor_id=actor_id)
