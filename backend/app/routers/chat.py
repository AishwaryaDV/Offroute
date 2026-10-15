from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import circuits as circuits_service
from app.services.assistant.client import run_turn
from app.services.assistant.prompt import build_system_prompt
from app.services.assistant.tools import build_read_tools

router = APIRouter(tags=["assistant"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    text: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    timezone: str | None = None
    history: list[ChatMessage] = []


class ChatStep(BaseModel):
    tool: str
    is_error: bool


class ChatResponse(BaseModel):
    reply: str
    model: str
    steps: list[ChatStep]
    writes: bool = False  # true once a write is staged, so the UI can refresh
    error: str | None = None


@router.post("/circuits/{circuit_id}/chat", response_model=ChatResponse)
async def chat(
    circuit_id: str,
    body: ChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatResponse:
    if not get_settings().assistant_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    # Resolve + authorize: the assistant acts only on a circuit the user owns.
    circuit = await circuits_service.resolve_circuit(db, circuit_id)
    circuits_service.assert_owner(circuit, user.id)

    tools = build_read_tools(db, circuit, user)
    system = build_system_prompt(circuit_title=circuit.title, timezone=body.timezone or "UTC")
    history = [{"role": m.role, "text": m.text} for m in body.history[-20:]]

    result = await run_turn(
        system=system, user_message=body.message, history=history, tools=tools,
    )

    return ChatResponse(
        reply=result.reply,
        model=result.model,
        steps=[ChatStep(tool=s.tool, is_error=s.is_error) for s in result.steps],
        writes=False,  # phase 2 is read-only
        # Never leak raw exception text to the client.
        error="unavailable" if result.error else None,
    )
