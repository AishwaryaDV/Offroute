"""Smoke-test the Gemini driver end to end against the (staging) DB.

Needs GEMINI_API_KEY in the environment. Run from backend/:
  GEMINI_API_KEY=... ASSISTANT_GEMINI_MODEL=gemini-3.6-flash \
    ./venv/bin/python -m scripts.smoke_assistant_gemini
Creates a throwaway circuit + points, asks the assistant a few questions, prints
the replies and the tool steps, then cleans up.
"""

import asyncio
import uuid

from app.database import get_session_factory
from app.schemas.circuit import CircuitCreate
from app.schemas.point import PointCreate
from app.services import circuits as circuits_service
from app.services import points as points_service
from app.services import users as users_service
from app.services.assistant import gemini
from app.services.assistant.prompt import build_system_prompt
from app.services.assistant.tools import build_read_tools

QUESTIONS = [
    "How many points are in this circuit?",
    "Which of my spots are 5 stars?",
    "What's the highest-rated drink spot?",
    "What's the weather in Bangalore tomorrow?",  # out of scope — should decline
]


async def main() -> None:
    async with get_session_factory()() as db:
        user = await users_service.get_or_create_user(
            db, uuid.uuid4(), f"gemini-smoke-{uuid.uuid4().hex[:8]}@offroute-qa.dev", {"name": "Smoke"}
        )
        circuit = await circuits_service.create_circuit(
            db, user.id, CircuitCreate(title="Bangalore Weekend")
        )
        for title, cat, rating, lat, lng in [
            ("Toit", "drink", 5, 12.97, 77.64),
            ("Coffee Shop", "food", 4, 12.98, 77.63),
            ("Cubbon Park", "nature", 5, 12.976, 77.59),
        ]:
            await points_service.create_point(
                db, circuit.id,
                PointCreate(title=title, category=cat, rating=rating, latitude=lat, longitude=lng),
            )

        tools = build_read_tools(db, circuit, user)
        system = build_system_prompt(circuit_title=circuit.title, timezone="Asia/Kolkata")

        for q in QUESTIONS:
            print(f"\n>>> {q}")
            result = await gemini.run(system=system, user_message=q, history=[], tools=tools)
            print(f"    [{result.model}] {result.reply}")
            if result.steps:
                print(f"    steps: " + "; ".join(
                    f"{s.tool}({s.input}){'!' if s.is_error else ''}" for s in result.steps))
            if result.error:
                print(f"    error: {result.error}")

        await circuits_service.delete_circuit(db, circuit)
        await db.delete(user)
        await db.commit()
        print("\ncleaned up ✓")


if __name__ == "__main__":
    asyncio.run(main())
