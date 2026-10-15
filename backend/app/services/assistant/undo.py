"""Reverse a turn's writes, using the undo ops stored on the assistant message."""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.point import Point
from app.schemas.circuit import CircuitUpdate
from app.schemas.point import PointUpdate, ReorderItem, ReorderRequest
from app.services import circuits as circuits_service
from app.services import points as points_service


async def apply_undo(db: AsyncSession, circuit_id: uuid.UUID, undo: dict[str, Any]) -> None:
    """Apply the stored undo ops in reverse order. Every point op re-checks the
    point still belongs to this circuit."""
    for op in reversed(undo.get("ops", [])):
        kind = op["op"]

        if kind == "soft_delete":  # undo of add_points: remove the created points
            for pid in op["point_ids"]:
                point = await db.get(Point, uuid.UUID(pid))
                if point and point.circuit_id == circuit_id:
                    point.deleted_at = datetime.now(timezone.utc)
            await db.commit()

        elif kind == "restore":  # undo of delete_point: bring it back
            for pid in op["point_ids"]:
                point = await db.get(Point, uuid.UUID(pid))
                if point and point.circuit_id == circuit_id:
                    point.deleted_at = None
            await db.commit()

        elif kind == "update_point":
            point = await db.get(Point, uuid.UUID(op["point_id"]))
            if point and point.circuit_id == circuit_id:
                await points_service.update_point(db, point, PointUpdate(**op["fields"]))

        elif kind == "update_circuit":
            circuit = await circuits_service.get_circuit(db, circuit_id)
            await circuits_service.update_circuit(db, circuit, CircuitUpdate(**op["fields"]))

        elif kind == "reorder":
            items = [ReorderItem(id=uuid.UUID(o["point_id"]), order_index=o["order_index"])
                     for o in op["order"]]
            await points_service.reorder_points(db, circuit_id, ReorderRequest(points=items))
