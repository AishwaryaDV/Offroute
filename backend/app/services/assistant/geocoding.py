"""find_place geocoding. Stadia first when a key is configured, else Nominatim
(free, no key). The model never invents coordinates — locations only ever come
from these results (or browser GPS / a dropped pin, handled in the UI)."""

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_NOMINATIM = "https://nominatim.openstreetmap.org/search"
_STADIA = "https://api.stadiamaps.com/geocoding/v1/search"
# Nominatim's usage policy requires an identifying User-Agent.
_USER_AGENT = "Offroute/1.0 (per-circuit chat assistant)"
_TIMEOUT = 8.0


async def find_place(
    query: str,
    *,
    near: tuple[float, float] | None = None,
    limit: int = 5,
) -> list[dict]:
    """Return up to `limit` candidates: {name, address, latitude, longitude}.

    `near` is an optional (lat, lng) to bias results toward (e.g. the circuit's
    existing points or the user's location). Returns [] on no match or failure
    so the caller can offer "drop a pin" instead of crashing.
    """
    query = (query or "").strip()
    if not query:
        return []

    settings = get_settings()
    if settings.stadia_api_key:
        try:
            results = await _stadia(query, settings.stadia_api_key, near, limit)
            if results:
                return results
        except Exception:  # noqa: BLE001 — fall back to Nominatim on any Stadia error
            logger.warning("Stadia geocoding failed; falling back to Nominatim", exc_info=True)

    try:
        return await _nominatim(query, near, limit)
    except Exception:  # noqa: BLE001
        logger.warning("Nominatim geocoding failed", exc_info=True)
        return []


async def _stadia(query: str, api_key: str, near, limit: int) -> list[dict]:
    params = {"text": query, "size": limit, "api_key": api_key}
    if near:
        params["focus.point.lat"], params["focus.point.lon"] = near
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(_STADIA, params=params)
        resp.raise_for_status()
        features = resp.json().get("features", [])
    out = []
    for f in features[:limit]:
        lng, lat = f.get("geometry", {}).get("coordinates", [None, None])
        props = f.get("properties", {})
        if lat is None or lng is None:
            continue
        out.append({
            "name": props.get("name") or query,
            "address": props.get("label") or props.get("name") or "",
            "latitude": float(lat),
            "longitude": float(lng),
        })
    return out


async def _nominatim(query: str, near, limit: int) -> list[dict]:
    params = {"q": query, "format": "jsonv2", "limit": limit, "addressdetails": 1}
    if near:
        lat, lng = near
        # a small viewbox around `near` biases but does not restrict results
        d = 1.0
        params["viewbox"] = f"{lng - d},{lat + d},{lng + d},{lat - d}"
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers={"User-Agent": _USER_AGENT}) as client:
        resp = await client.get(_NOMINATIM, params=params)
        resp.raise_for_status()
        rows = resp.json()
    out = []
    for r in rows[:limit]:
        try:
            out.append({
                "name": r.get("name") or r.get("display_name", "").split(",")[0],
                "address": r.get("display_name", ""),
                "latitude": float(r["lat"]),
                "longitude": float(r["lon"]),
            })
        except (KeyError, ValueError, TypeError):
            continue
    return out
