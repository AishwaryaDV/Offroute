"""Audit trail for destructive actions and assistant-driven writes."""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def record(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    db.add(AuditLog(
        user_id=user_id, action=action, resource_type=resource_type,
        resource_id=resource_id, details=details,
    ))
    await db.commit()
