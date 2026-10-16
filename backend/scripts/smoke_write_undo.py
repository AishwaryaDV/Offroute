"""Verify each write tool executes and its undo reverses it (no model needed)."""

import asyncio
import uuid

from app.database import get_session_factory
from app.schemas.circuit import CircuitCreate
from app.schemas.point import PointCreate
from app.services import circuits as circuits_service
from app.services import points as points_service
from app.services import users as users_service
from app.services.assistant.tools import build_read_tools
from app.services.assistant.tools_write import build_write_tools
from app.services.assistant.undo import apply_undo


def _ok(label, cond, detail=""):
    print(f"  {'PASS' if cond else 'FAIL'}  {label}  {detail}")
    assert cond, label


async def main() -> None:
    async with get_session_factory()() as db:
        user = await users_service.get_or_create_user(
            db, uuid.uuid4(), f"writeundo-{uuid.uuid4().hex[:8]}@offroute-qa.dev", {"name": "WU"})
        circuit = await circuits_service.create_circuit(db, user.id, CircuitCreate(title="Write Circuit"))
        p0 = await points_service.create_point(db, circuit.id, PointCreate(title="Start", rating=3, latitude=1, longitude=1))
        pid0 = str(p0["id"])

        async def titles():
            return [p["title"] for p in await points_service.list_points(db, circuit.id)]

        async def run(fn_name, args):
            sink: list[dict] = []
            tools = {t.name: t for t in build_write_tools(db, circuit, user, sink)}
            res = await tools[fn_name].handler(args)
            return res, {"ops": sink}

        # add_points
        _, undo = await run("add_points", {"points": [{"title": "Toit", "latitude": 12.97, "longitude": 77.64, "category": "drink", "rating": 5}]})
        _ok("add_points added", "Toit" in await titles())
        await apply_undo(db, circuit.id, undo)
        _ok("undo add removed Toit", "Toit" not in await titles())

        # update_point
        _, undo = await run("update_point", {"point_id": pid0, "rating": 1, "title": "Renamed"})
        pt = await points_service.get_point(db, uuid.UUID(pid0))
        _ok("update applied", pt.rating == 1 and pt.title == "Renamed")
        await apply_undo(db, circuit.id, undo)
        await db.refresh(pt)
        _ok("undo update restored", pt.rating == 3 and pt.title == "Start")

        # delete_point
        _, undo = await run("delete_point", {"point_id": pid0})
        _ok("delete hid point", await titles() == [])
        await apply_undo(db, circuit.id, undo)
        _ok("undo delete restored", await titles() == ["Start"])

        # reorder (add a 2nd point first)
        p1 = await points_service.create_point(db, circuit.id, PointCreate(title="Second", latitude=2, longitude=2))
        pid1 = str(p1["id"])
        _, undo = await run("reorder_points", {"order": [pid1, pid0]})
        _ok("reorder applied", await titles() == ["Second", "Start"])
        await apply_undo(db, circuit.id, undo)
        _ok("undo reorder restored", await titles() == ["Start", "Second"])

        # update_circuit
        _, undo = await run("update_circuit", {"title": "Renamed Circuit", "visibility": "public"})
        c = await circuits_service.get_circuit(db, circuit.id)
        _ok("circuit updated", c.title == "Renamed Circuit" and c.visibility == "public")
        await apply_undo(db, circuit.id, undo)
        await db.refresh(c)
        _ok("undo circuit restored", c.title == "Write Circuit" and c.visibility == "private")

        await circuits_service.delete_circuit(db, circuit)
        await db.delete(user)
        await db.commit()
        print("ALL WRITE + UNDO ASSERTIONS PASSED ✓")


if __name__ == "__main__":
    asyncio.run(main())
