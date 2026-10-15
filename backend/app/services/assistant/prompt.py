"""Builds the per-circuit system prompt from the v1 template."""

import datetime
import re
from pathlib import Path

from app.services.assistant.tools import CATEGORIES

_TEMPLATE = (Path(__file__).parent / "prompts" / "v1.md").read_text()


def _sanitize_title(title: str) -> str:
    """The circuit title is user data spliced into the system prompt — strip
    newlines/control chars and cap length so it can't break out of its line or
    smuggle instructions."""
    cleaned = re.sub(r"\s+", " ", (title or "").replace("{", "").replace("}", "")).strip()
    return cleaned[:120] or "Untitled circuit"


def build_system_prompt(
    *,
    circuit_title: str,
    timezone: str = "UTC",
    today: datetime.date | None = None,
) -> str:
    return _TEMPLATE.format(
        today=(today or datetime.date.today()).isoformat(),
        timezone=timezone or "UTC",
        circuit_title=_sanitize_title(circuit_title),
        categories=", ".join(CATEGORIES),
    )
