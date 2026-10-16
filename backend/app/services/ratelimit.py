"""In-process per-user rate limiting for write/search endpoints that aren't
already covered by the assistant's own DB-backed limiter. Single uvicorn
process, two trusted users — an in-memory sliding window is plenty; no need
for Redis or a DB table that would just add a round-trip to every request."""

import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.user import User

_buckets: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def _check(bucket: str, user_id: str, limit: int, window_seconds: int) -> bool:
    now = time.monotonic()
    key = (bucket, user_id)
    q = _buckets[key]
    while q and now - q[0] > window_seconds:
        q.popleft()
    if len(q) >= limit:
        return False
    q.append(now)
    return True


def rate_limit(bucket: str, limit: int, window_seconds: int):
    """FastAPI dependency factory: `Depends(rate_limit("circuits:create", 10, 60))`."""

    async def dependency(user: Annotated[User, Depends(get_current_user)]) -> None:
        if not _check(bucket, str(user.id), limit, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests — slow down a bit.",
            )

    return dependency
