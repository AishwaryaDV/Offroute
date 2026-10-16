from datetime import datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.circuit import Circuit
from app.models.user import User
from app.services import audit as audit_service
from app.services import chat as chat_service
from app.services import circuits as circuits_service
from app.services.assistant.client import run_turn
from app.services.assistant.prompt import build_system_prompt
from app.services.assistant.tools import build_read_tools
from app.services.assistant.tools_write import build_write_tools
from app.services.assistant.undo import apply_undo

router = APIRouter(tags=["assistant"])

_HISTORY_FOR_MODEL = 20


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    timezone: str | None = None


class ChatStep(BaseModel):
    tool: str
    is_error: bool


class ChatResponse(BaseModel):
    message_id: str
    reply: str
    model: str
    steps: list[ChatStep]
    writes: bool = False  # true once a write is staged, so the UI can refresh
    error: str | None = None


class ChatHistoryItem(BaseModel):
    id: str
    role: str
    content: str
    has_undo: bool
    created_at: str


async def _authorized_circuit(circuit_id: str, user: User, db: AsyncSession) -> Circuit:
    if not get_settings().assistant_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    circuit = await circuits_service.resolve_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)
    return circuit


async def _enforce_rate_limit(db: AsyncSession, user: User) -> None:
    """Both drivers ride on shared quota (Claude = subscription login, Gemini =
    free tier) across just two users, so a burst or a runaway loop from one
    person can starve the other. Cap both a short burst and the daily total."""
    settings = get_settings()
    now = datetime.now(timezone.utc)

    per_minute = await chat_service.count_user_messages_since(db, user.id, now - timedelta(minutes=1))
    if per_minute >= settings.assistant_rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Slow down — try again in a moment.",
        )

    start_of_day = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    today = await chat_service.count_user_messages_since(db, user.id, start_of_day)
    if today >= settings.assistant_daily_message_cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily chat limit reached — try again tomorrow.",
        )


@router.get("/circuits/{circuit_id}/chat", response_model=list[ChatHistoryItem])
async def get_history(
    circuit_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ChatHistoryItem]:
    circuit = await _authorized_circuit(circuit_id, user, db)
    msgs = await chat_service.list_messages(db, circuit.id)
    return [
        ChatHistoryItem(
            id=str(m.id), role=m.role, content=m.content,
            has_undo=m.undo is not None, created_at=m.created_at.isoformat(),
        )
        for m in msgs
    ]


@router.post("/circuits/{circuit_id}/chat", response_model=ChatResponse)
async def chat(
    circuit_id: str,
    body: ChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatResponse:
    circuit = await _authorized_circuit(circuit_id, user, db)
    await _enforce_rate_limit(db, user)

    # Load prior turns for context, then record the new message *before* the
    # (slow, several-second) model call — not after — so rate-limit counts
    # reflect messages as they arrive rather than as turns finish.
    prior = await chat_service.list_messages(db, circuit.id, limit=_HISTORY_FOR_MODEL)
    history = [{"role": m.role, "text": m.content} for m in prior]
    await chat_service.add_message(db, circuit.id, "user", body.message)

    undo_sink: list[dict] = []
    tools = (
        build_read_tools(db, circuit, user)
        + build_write_tools(db, circuit, user, undo_sink)
    )
    system = build_system_prompt(circuit_title=circuit.title, timezone=body.timezone or "UTC")

    result = await run_turn(
        system=system, user_message=body.message, history=history, tools=tools,
    )

    undo = {"ops": undo_sink} if undo_sink else None
    assistant_msg = await chat_service.add_message(db, circuit.id, "assistant", result.reply, undo=undo)

    if undo_sink:
        await audit_service.record(
            db, user.id, "assistant.write", "circuit", circuit.id,
            {"tools": [s.tool for s in result.steps if not s.is_error], "message": body.message},
        )

    return ChatResponse(
        message_id=str(assistant_msg.id),
        reply=result.reply,
        model=result.model,
        steps=[ChatStep(tool=s.tool, is_error=s.is_error) for s in result.steps],
        writes=bool(undo_sink),  # tell the UI to refresh the circuit if anything changed
        error="unavailable" if result.error else None,
    )


@router.post("/circuits/{circuit_id}/chat/undo")
async def undo_last(
    circuit_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    circuit = await _authorized_circuit(circuit_id, user, db)
    msg = await chat_service.latest_undoable(db, circuit.id)
    if msg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nothing to undo")
    await apply_undo(db, circuit.id, msg.undo)
    msg.undo = None  # consumed — can't undo twice
    await db.commit()
    return {"undone": True}


@router.delete("/circuits/{circuit_id}/chat", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(
    circuit_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    circuit = await _authorized_circuit(circuit_id, user, db)
    await chat_service.clear_messages(db, circuit.id)
