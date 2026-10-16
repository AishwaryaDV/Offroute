"""Write tools for the assistant. They execute immediately (no preview/confirm)
and append an undo op to `undo_sink`, which the endpoint stores on the assistant
message so a later POST .../chat/undo can reverse the turn.

Scoped to one circuit via closures; point ids from the model are verified to
belong to this circuit before any mutation.
"""

from __future__ import annotations

import datetime as _dt
import uuid
from typing import Any

from geoalchemy2.shape import to_shape
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circuit import Circuit
from app.models.point import Point
from app.models.user import User
from app.schemas.circuit import CircuitUpdate
from app.schemas.point import PointCreate, PointUpdate, ReorderItem, ReorderRequest
from app.services import circuits as circuits_service
from app.services import points as points_service
from app.services.assistant.tools import CATEGORIES, Tool, _iso, _point_summary


async def _owned_point(db: AsyncSession, point_id: str, circuit_id: uuid.UUID) -> Point:
    point = await points_service.get_point(db, uuid.UUID(point_id))  # 404 if missing/deleted
    if point.circuit_id != circuit_id:
        raise ValueError("That point is not in this circuit.")
    return point


def build_write_tools(
    db: AsyncSession, circuit: Circuit, user: User, undo_sink: list[dict[str, Any]],
) -> list[Tool]:
    cid = circuit.id

    async def add_points(args: dict) -> dict:
        created, ids = [], []
        for p in args["points"]:
            res = await points_service.create_point(db, cid, PointCreate(
                title=p["title"], latitude=p["latitude"], longitude=p["longitude"],
                category=p.get("category"), rating=p.get("rating"),
                notes=p.get("notes"), visited_at=p.get("visited_at"),
            ))
            ids.append(str(res["id"]))
            created.append(_point_summary(res))
        undo_sink.append({"op": "soft_delete", "point_ids": ids})
        return {"added": created}

    async def update_point(args: dict) -> dict:
        point = await _owned_point(db, args["point_id"], cid)
        fields = {k: v for k, v in args.items() if k != "point_id"}
        shape = to_shape(point.location)
        before: dict[str, Any] = {}
        for k in fields:
            if k == "latitude":
                before["latitude"] = shape.y
            elif k == "longitude":
                before["longitude"] = shape.x
            else:
                before[k] = _iso(getattr(point, k))
        res = await points_service.update_point(db, point, PointUpdate(**fields))
        undo_sink.append({"op": "update_point", "point_id": args["point_id"], "fields": before})
        return {"updated": _point_summary(res)}

    async def reorder_points(args: dict) -> dict:
        current = await points_service.list_points(db, cid)
        before = [{"point_id": str(p["id"]), "order_index": p["order_index"]} for p in current]
        items = [ReorderItem(id=uuid.UUID(pid), order_index=i) for i, pid in enumerate(args["order"])]
        await points_service.reorder_points(db, cid, ReorderRequest(points=items))
        undo_sink.append({"op": "reorder", "order": before})
        return {"reordered": args["order"]}

    async def update_circuit(args: dict) -> dict:
        before = {k: _iso(getattr(circuit, k)) for k in args}
        await circuits_service.update_circuit(db, circuit, CircuitUpdate(**args))
        undo_sink.append({"op": "update_circuit", "fields": before})
        return {"updated": {"title": circuit.title}}

    async def delete_point(args: dict) -> dict:
        point = await _owned_point(db, args["point_id"], cid)
        title = point.title
        await points_service.delete_point(db, point)  # soft-delete (reversible)
        undo_sink.append({"op": "restore", "point_ids": [args["point_id"]]})
        return {"deleted": {"id": args["point_id"], "title": title}}

    _point_props = {
        "title": {"type": "string"},
        "category": {"type": "string", "enum": CATEGORIES},
        "rating": {"type": "integer", "minimum": 1, "maximum": 5},
        "notes": {"type": "string"},
        "visited_at": {"type": "string", "format": "date"},
        "latitude": {"type": "number"},
        "longitude": {"type": "number"},
    }

    return [
        Tool(
            name="add_points", is_write=True,
            description=(
                "Add one or more points to this circuit. Resolve each location "
                "with find_place first and pass its coordinates — never invent "
                "coordinates. Points are appended to the end."
            ),
            input_schema={
                "type": "object",
                "properties": {"points": {"type": "array", "items": {
                    "type": "object",
                    "properties": _point_props,
                    "required": ["title", "latitude", "longitude"],
                    "additionalProperties": False,
                }}},
                "required": ["points"],
                "additionalProperties": False,
            },
            handler=add_points,
        ),
        Tool(
            name="update_point", is_write=True,
            description="Change a point's title, notes, category, rating, visited date, or location.",
            input_schema={
                "type": "object",
                "properties": {"point_id": {"type": "string"}, **_point_props},
                "required": ["point_id"],
                "additionalProperties": False,
            },
            handler=update_point,
        ),
        Tool(
            name="reorder_points", is_write=True,
            description="Set the full order of this circuit's points. Pass every point id in the new order.",
            input_schema={
                "type": "object",
                "properties": {"order": {"type": "array", "items": {"type": "string"}}},
                "required": ["order"],
                "additionalProperties": False,
            },
            handler=reorder_points,
        ),
        Tool(
            name="update_circuit", is_write=True,
            description="Edit this circuit: title, description, dates (start_date/end_date), tags, or visibility.",
            input_schema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "visibility": {"type": "string", "enum": ["private", "shared", "public"]},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                },
                "additionalProperties": False,
            },
            handler=update_circuit,
        ),
        Tool(
            name="delete_point", is_write=True,
            description="Delete a point from this circuit. Only when the user clearly asks; it is reversible.",
            input_schema={
                "type": "object",
                "properties": {"point_id": {"type": "string"}},
                "required": ["point_id"],
                "additionalProperties": False,
            },
            handler=delete_point,
        ),
    ]
