from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import circuits, health, me, media, points

app = FastAPI(title="Offroute API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(me.router)
app.include_router(circuits.router)
app.include_router(circuits.shared_router)
app.include_router(points.router)
app.include_router(media.router)
