from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.models.user import User
from app.services.assistant import geocoding
from app.services.ratelimit import rate_limit

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/search", dependencies=[Depends(rate_limit("places:search", limit=30, window_seconds=60))])
async def search_places(
    q: Annotated[str, Query(min_length=1, max_length=200)],
    user: Annotated[User, Depends(get_current_user)],
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    limit: int = Query(default=5, ge=1, le=10),
):
    """Place lookup for the Add Point form — the same Stadia-first,
    Nominatim-fallback service Astra's find_place tool uses, so both paths
    get the same (and any future) search-quality improvements together."""
    near = (lat, lng) if lat is not None and lng is not None else None
    return await geocoding.find_place(q, near=near, limit=limit)
