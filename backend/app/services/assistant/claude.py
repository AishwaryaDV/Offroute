"""Claude driver via claude-agent-sdk (subscription auth through the host's
Claude Code CLI — no ANTHROPIC_API_KEY). Follows the reference brief: neutral
tools -> in-process MCP server, one turn per query().

NOTE: unverified until the Claude Code CLI is installed + logged in on the host.
The SDK imports are lazy so this module (and the rest of the assistant) loads
fine without the SDK present.
"""

from __future__ import annotations

import json
import logging

from app.config import get_settings
from app.services.assistant.base import Step, TurnResult, summarize_output
from app.services.assistant.tools import Tool

logger = logging.getLogger(__name__)

_SERVER = "offroute"
_MAX_TURNS = 10


def _format_prompt(history: list[dict], user_message: str) -> str:
    """The SDK is stateless — we own history and format it into the prompt."""
    if not history:
        return user_message
    lines = [f"{'User' if h['role'] == 'user' else 'Assistant'}: {h['text']}" for h in history]
    lines.append(f"User: {user_message}")
    return "\n".join(lines)


async def run(
    *,
    system: str,
    user_message: str,
    history: list[dict],
    tools: list[Tool],
) -> TurnResult:
    from claude_agent_sdk import (
        AssistantMessage,
        ClaudeAgentOptions,
        ResultMessage,
        TextBlock,
        create_sdk_mcp_server,
        query,
        tool as sdk_tool,
    )

    settings = get_settings()
    steps: list[Step] = []

    def make_sdk_tool(t: Tool):
        async def handler(args: dict) -> dict:
            try:
                result = await t.handler(args)
                steps.append(Step(t.name, args, summarize_output(result)))
                return {"content": [{"type": "text", "text": json.dumps(result, default=str)}]}
            except Exception as exc:  # noqa: BLE001 — return as a tool error, don't crash the loop
                logger.exception("assistant tool %s failed", t.name)
                steps.append(Step(t.name, args, str(exc), is_error=True))
                return {
                    "content": [{"type": "text", "text": json.dumps({"error": str(exc)})}],
                    "is_error": True,
                }
        # apply the SDK's @tool decorator programmatically to build it dynamically
        return sdk_tool(t.name, t.description, t.input_schema)(handler)

    server = create_sdk_mcp_server(
        name=_SERVER, version="1.0.0", tools=[make_sdk_tool(t) for t in tools],
    )
    options = ClaudeAgentOptions(
        mcp_servers={_SERVER: server},
        allowed_tools=[f"mcp__{_SERVER}__{t.name}" for t in tools],
        permission_mode="bypassPermissions",  # safe: our write tools only stage previews
        max_turns=_MAX_TURNS,
        system_prompt=system,
        model=settings.assistant_model,
    )

    reply_parts: list[str] = []
    error: str | None = None
    async for message in query(prompt=_format_prompt(history, user_message), options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    reply_parts.append(block.text)
        elif isinstance(message, ResultMessage):
            if getattr(message, "is_error", False):
                error = "result_error"

    return TurnResult(
        reply="".join(reply_parts).strip(),
        model=f"claude:{settings.assistant_model}",
        steps=steps,
        error=error,
    )
