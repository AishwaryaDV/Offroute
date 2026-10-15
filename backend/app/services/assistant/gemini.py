"""Gemini driver — hand-written function-calling loop over the neutral tools.

Used as the fallback (and the primary while the Claude Code CLI isn't set up on
the host). Automatic function calling is disabled so we run the loop ourselves
and call our async handlers.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.services.assistant.base import Step, TurnResult, summarize_output
from app.services.assistant.tools import Tool

logger = logging.getLogger(__name__)

_MAX_STEPS = 8


def _gemini_schema(schema: dict) -> dict:
    """Gemini's function-declaration schema is a subset of JSON Schema —
    drop keys it rejects (additionalProperties, format)."""
    out: dict[str, Any] = {}
    for key, value in schema.items():
        if key in ("additionalProperties", "format"):
            continue
        if key == "properties" and isinstance(value, dict):
            out[key] = {k: _gemini_schema(v) for k, v in value.items()}
        elif key == "items" and isinstance(value, dict):
            out[key] = _gemini_schema(value)
        else:
            out[key] = value
    return out


async def run(
    *,
    system: str,
    user_message: str,
    history: list[dict],
    tools: list[Tool],
) -> TurnResult:
    from google import genai
    from google.genai import types

    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")

    client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(
            timeout=20_000,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )
    model = settings.assistant_gemini_model
    tool_map = {t.name: t for t in tools}

    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.2,
        tools=[types.Tool(function_declarations=[
            types.FunctionDeclaration(
                name=t.name,
                description=t.description,
                parameters=_gemini_schema(t.input_schema),
            )
            for t in tools
        ])],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )

    contents: list[Any] = [
        types.Content(role=h["role"], parts=[types.Part(text=h["text"])])
        for h in history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    steps: list[Step] = []
    for _ in range(_MAX_STEPS):
        resp = await client.aio.models.generate_content(
            model=model, contents=contents, config=config,
        )
        calls = resp.function_calls
        if not calls:
            return TurnResult(reply=(resp.text or "").strip(), model=f"gemini:{model}", steps=steps)

        # keep the model's function-call turn, then answer each call
        contents.append(resp.candidates[0].content)
        response_parts = []
        for call in calls:
            args = dict(call.args or {})
            tool = tool_map.get(call.name)
            if tool is None:
                response_parts.append(types.Part.from_function_response(
                    name=call.name, response={"error": "unknown tool"}))
                steps.append(Step(call.name, args, "unknown tool", is_error=True))
                continue
            try:
                result = await tool.handler(args)
                response_parts.append(types.Part.from_function_response(
                    name=call.name, response={"result": result}))
                steps.append(Step(call.name, args, summarize_output(result)))
            except Exception as exc:  # noqa: BLE001 — surface as a tool error to the model
                logger.exception("assistant tool %s failed", call.name)
                response_parts.append(types.Part.from_function_response(
                    name=call.name, response={"error": str(exc)}))
                steps.append(Step(call.name, args, str(exc), is_error=True))
        contents.append(types.Content(role="user", parts=response_parts))

    return TurnResult(
        reply="I couldn't finish that — try rephrasing or breaking it into steps.",
        model=f"gemini:{model}",
        steps=steps,
        error="max_steps",
    )
