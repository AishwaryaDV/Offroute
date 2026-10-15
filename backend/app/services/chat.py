"""Persistence for a circuit's assistant thread."""

import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage


async def list_messages(db: AsyncSession, circuit_id: uuid.UUID, limit: int = 50) -> list[ChatMessage]:
    """The most recent `limit` messages, in chronological order."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.circuit_id == circuit_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return list(reversed(rows))


async def add_message(
    db: AsyncSession,
    circuit_id: uuid.UUID,
    role: str,
    content: str,
    undo: dict[str, Any] | None = None,
) -> ChatMessage:
    msg = ChatMessage(circuit_id=circuit_id, role=role, content=content, undo=undo)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def clear_messages(db: AsyncSession, circuit_id: uuid.UUID) -> None:
    await db.execute(delete(ChatMessage).where(ChatMessage.circuit_id == circuit_id))
    await db.commit()


async def latest_undoable(db: AsyncSession, circuit_id: uuid.UUID) -> ChatMessage | None:
    """The most recent assistant message that performed a reversible write."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.circuit_id == circuit_id, ChatMessage.undo.isnot(None))
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()
