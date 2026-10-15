"""Shared types for the assistant drivers (Claude, Gemini)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Step:
    """One tool call in a turn — the basis for assistant_steps tracing."""
    tool: str
    input: dict[str, Any]
    output_summary: str
    is_error: bool = False


@dataclass
class TurnResult:
    reply: str
    model: str
    steps: list[Step] = field(default_factory=list)
    error: str | None = None


def summarize_output(result: Any, limit: int = 300) -> str:
    """Short, non-sensitive summary of a tool result for tracing/logs."""
    try:
        text = json.dumps(result, default=str)
    except (TypeError, ValueError):
        text = str(result)
    return text[:limit]
