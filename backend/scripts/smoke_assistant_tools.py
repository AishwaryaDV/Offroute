"""Smoke-test the per-circuit assistant read tools against the (staging) DB.

Run from backend/: ./venv/bin/python -m scripts.smoke_assistant_tools
Creates a throwaway user + circuit + points, exercises every read tool, then
cleans up. Verifies the tool layer wraps the services correctly before the
driver phase. (The full pytest eval suite is Phase 7.)
"""

import asyncio
import uuid

from app.database import get_session_factory
from app.schemas.circuit import CircuitCreate
from app.schemas.point import PointCreate
from app.services import circuits as circuits_service
from app.services import points as points_service
from app.services import users as users_service
from app.services.assistant.tools import build_read_tools


def _ok(label: str, cond: bool, detail: str = "") -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {label}  {detail}")
    assert cond, label


async def main() -> None:
    async with get_session_factory()() as db:
        user = await users_service.get_or_create_user(
            db, uuid.uuid4(), f"assistant-smoke-{uuid.uuid4().hex[:8]}@offroute-qa.dev", {"name": "Smoke"}
        )
        circuit = await circuits_service.create_circuit(
            db, user.id, CircuitCreate(title="Assistant Smoke Circuit")
        )
        seed = [
            ("Toit", "drink", 5, 12.97, 77.64),
            ("Coffee Shop", "food", 4, 12.98, 77.63),
            ("Cubbon Park", "nature", 5, 12.976, 77.59),
        ]
        for title, cat, rating, lat, lng in seed:
            await points_service.create_point(
                db, circuit.id,
                PointCreate(title=title, category=cat, rating=rating, latitude=lat, longitude=lng),
            )

        tools = {t.name: t for t in build_read_tools(db, circuit, user)}
        print(f"built {len(tools)} read tools: {', '.join(tools)}")

        got = await tools["get_circuit"].handler({})
        _ok("get_circuit returns 3 points", len(got["points"]) == 3)
        _ok("get_circuit point_count", got["circuit"]["point_count"] == 3)

        drinks = await tools["query_points"].handler({"category": "drink"})
        _ok("query_points category=drink", [p["title"] for p in drinks["points"]] == ["Toit"])

        five = await tools["query_points"].handler({"min_rating": 5})
        _ok("query_points min_rating=5 -> 2", len(five["points"]) == 2)

        toit = await tools["query_points"].handler({"text": "toit"})
        _ok("query_points text match", len(toit["points"]) == 1)

        cnt = await tools["count"].handler({"group_by": "category"})
        _ok("count total", cnt["total"] == 3, str(cnt))
        _ok("count by_category", cnt["by_category"].get("drink") == 1)

        # find_place hits an external geocoder — soft check (network/policy varies)
        try:
            fp = await tools["find_place"].handler({"query": "Eiffel Tower"})
            print(f"  INFO  find_place candidates: {len(fp['candidates'])}"
                  + (f" (top: {fp['candidates'][0]['name']})" if fp["candidates"] else " (none/offline)"))
        except Exception as e:  # noqa: BLE001
            print(f"  INFO  find_place skipped (network): {type(e).__name__}")

        # cleanup
        await circuits_service.delete_circuit(db, circuit)
        await db.delete(user)
        await db.commit()
        print("cleaned up. ALL READ-TOOL ASSERTIONS PASSED ✓")


if __name__ == "__main__":
    asyncio.run(main())
