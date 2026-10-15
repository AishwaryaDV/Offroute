"""Provider-neutral tool definitions for the per-circuit assistant.

A `Tool` is (name, description, JSON schema, async handler, is_write). The
Claude and Gemini drivers each adapt these into their own tool format. Handlers
are built by factories that close over (db, circuit, user) so the circuit and
identity are never tool arguments — the model cannot reach another circuit.
"""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circuit import Circuit
from app.models.user import User
from app.services import circuits as circuits_service
from app.services import points as points_service
from app.services.assistant import geocoding

ToolHandler = Callable[[dict[str, Any]], Awaitable[Any]]

# Must match the point_category enum on the Point model.
CATEGORIES = [
    "food", "drink", "stay", "viewpoint", "activity",
    "nature", "culture", "hidden_gem", "other",
]


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: ToolHandler
    is_write: bool = False


# --- JSON-safe coercion -------------------------------------------------------

def _iso(v: Any) -> Any:
    return v.isoformat() if isinstance(v, (_dt.date, _dt.datetime)) else v


def _circuit_summary(c: dict) -> dict:
    return {
        "title": c.get("title"),
        "description": c.get("description"),
        "point_count": c.get("point_count", 0),
        "tags": c.get("tags") or [],
        "visibility": c.get("visibility"),
        "start_date": _iso(c.get("start_date")),
        "end_date": _iso(c.get("end_date")),
    }


def _point_summary(p: dict) -> dict:
    return {
        "id": str(p["id"]),
        "order_index": p.get("order_index"),
        "title": p.get("title"),
        "category": p.get("category"),
        "rating": p.get("rating"),
        "visited_at": _iso(p.get("visited_at")),
        "notes": p.get("notes"),
        "latitude": p.get("latitude"),
        "longitude": p.get("longitude"),
    }


def _circuit_center(points: list[dict]) -> tuple[float, float] | None:
    coords = [(p["latitude"], p["longitude"]) for p in points
              if p.get("latitude") is not None and p.get("longitude") is not None]
    if not coords:
        return None
    return (sum(c[0] for c in coords) / len(coords), sum(c[1] for c in coords) / len(coords))


# --- filtering / counting (so the model never counts or filters by itself) ----

def _filter_points(points: list[dict], args: dict) -> list[dict]:
    out = points
    if (cat := args.get("category")):
        out = [p for p in out if p.get("category") == cat]
    if (lo := args.get("min_rating")) is not None:
        out = [p for p in out if (p.get("rating") or 0) >= lo]
    if (hi := args.get("max_rating")) is not None:
        out = [p for p in out if (p.get("rating") or 0) <= hi]
    if (frm := args.get("visited_from")):
        out = [p for p in out if p.get("visited_at") and str(_iso(p["visited_at"])) >= frm]
    if (to := args.get("visited_to")):
        out = [p for p in out if p.get("visited_at") and str(_iso(p["visited_at"])) <= to]
    if (text := args.get("text")):
        t = text.lower()
        out = [p for p in out
               if t in (p.get("title") or "").lower() or t in (p.get("notes") or "").lower()]
    return out


def _count(points: list[dict], group_by: str | None) -> dict:
    result: dict[str, Any] = {"total": len(points)}
    if group_by in ("category", "rating"):
        buckets: dict[str, int] = {}
        for p in points:
            key = str(p.get(group_by)) if p.get(group_by) is not None else "none"
            buckets[key] = buckets.get(key, 0) + 1
        result["by_" + group_by] = buckets
    return result


# --- the scoped read tools ----------------------------------------------------

def build_read_tools(db: AsyncSession, circuit: Circuit, user: User) -> list[Tool]:
    circuit_id = circuit.id
    user_id = user.id

    async def get_circuit(_args: dict) -> dict:
        c = await circuits_service.get_circuit_with_count(db, circuit_id, user_id)
        pts = await points_service.list_points(db, circuit_id)
        return {"circuit": _circuit_summary(c), "points": [_point_summary(p) for p in pts]}

    async def query_points(args: dict) -> dict:
        pts = await points_service.list_points(db, circuit_id)
        return {"points": [_point_summary(p) for p in _filter_points(pts, args)]}

    async def count(args: dict) -> dict:
        pts = await points_service.list_points(db, circuit_id)
        return _count(pts, args.get("group_by"))

    async def find_place(args: dict) -> dict:
        pts = await points_service.list_points(db, circuit_id)
        candidates = await geocoding.find_place(
            args.get("query", ""), near=_circuit_center(pts), limit=5,
        )
        return {"candidates": candidates}

    return [
        Tool(
            name="get_circuit",
            description=(
                "Get this circuit and all its points, in order. Call this first "
                "when you need the current state of the circuit."
            ),
            input_schema={"type": "object", "properties": {}, "additionalProperties": False},
            handler=get_circuit,
        ),
        Tool(
            name="query_points",
            description=(
                "List points in this circuit filtered by category, rating range, "
                "visited-date range, or a text match on title/notes. Use this to "
                "answer questions like 'which food spots are 5 stars'. Never filter "
                "or search points yourself — always call this."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": CATEGORIES},
                    "min_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                    "max_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                    "visited_from": {"type": "string", "format": "date"},
                    "visited_to": {"type": "string", "format": "date"},
                    "text": {"type": "string"},
                },
                "additionalProperties": False,
            },
            handler=query_points,
        ),
        Tool(
            name="count",
            description=(
                "Count points in this circuit, optionally grouped by category or "
                "rating. Use this for 'how many points' / 'how many 5-star spots'. "
                "Never count by yourself — always call this."
            ),
            input_schema={
                "type": "object",
                "properties": {"group_by": {"type": "string", "enum": ["category", "rating"]}},
                "additionalProperties": False,
            },
            handler=count,
        ),
        Tool(
            name="find_place",
            description=(
                "Look up a place by name to get candidate locations with "
                "coordinates. Results are biased toward this circuit's area. Use "
                "this to resolve a location before adding a point — never invent "
                "coordinates. If several candidates are far apart, present them to "
                "the user to choose."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Place name, optionally with area"},
                },
                "required": ["query"],
                "additionalProperties": False,
            },
            handler=find_place,
        ),
    ]
