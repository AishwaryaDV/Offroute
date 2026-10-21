from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import chat, circuits, collaborators, health, me, media, notifications, places, points, profiles, push, search, stats, trips

# Hide interactive docs and the OpenAPI schema in production — they expose the
# full API surface to unauthenticated callers with no functional benefit there.
_is_prod = get_settings().env == "production"
app = FastAPI(
    title="Offroute API",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(health.router)
app.include_router(me.router)
app.include_router(circuits.router)
app.include_router(circuits.shared_router)
app.include_router(points.router)
app.include_router(collaborators.router)
app.include_router(media.router)
app.include_router(notifications.router)
app.include_router(places.router)
app.include_router(profiles.router)
app.include_router(push.router)
app.include_router(search.router)
app.include_router(stats.router)
app.include_router(trips.router)
app.include_router(chat.router)
