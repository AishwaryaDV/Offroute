"""run_turn: run one assistant turn through the primary driver, falling back to
the other on failure (e.g. the Claude Code CLI isn't logged in, or Gemini is out
of free-tier quota)."""

from __future__ import annotations

import logging

from app.config import get_settings
from app.services.assistant import claude, gemini
from app.services.assistant.base import TurnResult
from app.services.assistant.tools import Tool

logger = logging.getLogger(__name__)

_DRIVERS = {"claude": claude.run, "gemini": gemini.run}


async def run_turn(
    *,
    system: str,
    user_message: str,
    history: list[dict],
    tools: list[Tool],
) -> TurnResult:
    settings = get_settings()
    primary = settings.assistant_primary if settings.assistant_primary in _DRIVERS else "claude"
    order = [primary] + [name for name in _DRIVERS if name != primary]

    last_exc: Exception | None = None
    for name in order:
        try:
            return await _DRIVERS[name](
                system=system, user_message=user_message, history=history, tools=tools,
            )
        except Exception as exc:  # noqa: BLE001 — try the fallback driver
            logger.warning("assistant driver %s failed, falling back: %s", name, exc)
            last_exc = exc

    return TurnResult(
        reply="The assistant is unavailable right now — please try again, or use the form instead.",
        model="none",
        error=str(last_exc) if last_exc else "no_driver",
    )
