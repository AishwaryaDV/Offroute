"""Verify soft-delete + restore hide/show points everywhere they should."""

import asyncio
import uuid

from fastapi import HTTPException

from app.database import get_session_factory
from app.schemas.circuit import CircuitCreate
from app.schemas.point import PointCreate
from app.services import circuits as circuits_service
from app.services import points as points_service
from app.services import users as users_service


def _ok(label, cond, detail=""):
    print(f"  {'PASS' if cond else 'FAIL'}  {label}  {detail}")
    assert cond, label


async def main() -> None:
    async with get_session_factory()() as db:
        user = await users_service.get_or_create_user(
            db, uuid.uuid4(), f"softdel-{uuid.uuid4().hex[:8]}@offroute-qa.dev", {"name": "SD"})
        circuit = await circuits_service.create_circuit(db, user.id, CircuitCreate(title="SoftDel Circuit"))
        p1 = await points_service.create_point(db, circuit.id, PointCreate(title="Keep", latitude=1, longitude=1))
        p2 = await points_service.create_point(db, circuit.id, PointCreate(title="Remove", latitude=2, longitude=2))

        async def count():
            c = await circuits_service.get_circuit_with_count(db, circuit.id, user.id)
            return c["point_count"], len(await points_service.list_points(db, circuit.id))

        _ok("before: 2 points", await count() == (2, 2))

        point = await points_service.get_point(db, p2["id"])
        await points_service.delete_point(db, point)
        _ok("after soft-delete: 1 point in count + list", await count() == (1, 1))

        try:
            await points_service.get_point(db, p2["id"])
            _ok("get_point(deleted) 404s", False)
        except HTTPException as e:
            _ok("get_point(deleted) 404s", e.status_code == 404)

        await points_service.restore_point(db, p2["id"])
        _ok("after restore: 2 points again", await count() == (2, 2))

        await circuits_service.delete_circuit(db, circuit)
        await db.delete(user)
        await db.commit()
        print("ALL SOFT-DELETE ASSERTIONS PASSED ✓")


if __name__ == "__main__":
    asyncio.run(main())
