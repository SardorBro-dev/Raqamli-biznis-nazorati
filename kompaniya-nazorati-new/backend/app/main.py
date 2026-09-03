from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.database import Base, engine
from app import models  # noqa: F401
from app.routes.auth import router as auth_router
from app.routes.ai import router as ai_router
from app.routes.companies import router as companies_router
from app.routes.communications import router as communications_router
from app.routes.employees import router as employees_router
from app.routes.health import router as health_router
from app.routes.signaling import router as signaling_router
from app.routes.users import router as users_router
from app.routes.work_sessions import router as work_sessions_router
from app.core.telegram import start_telegram_bot, stop_telegram_bot

settings = get_settings()

if settings.environment.lower() in {"development", "dev", "test"}:
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Cross-platform business management platform for Android and Windows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(signaling_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(ai_router, prefix=settings.api_v1_prefix)
app.include_router(users_router, prefix=settings.api_v1_prefix)
app.include_router(companies_router, prefix=settings.api_v1_prefix)
app.include_router(communications_router, prefix=settings.api_v1_prefix)
app.include_router(employees_router, prefix=settings.api_v1_prefix)
app.include_router(work_sessions_router, prefix=settings.api_v1_prefix)

frontend_dist = Path(__file__).resolve().parents[2] / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")


@app.on_event("startup")
async def startup_telegram_bot():
    await start_telegram_bot()


@app.on_event("shutdown")
async def shutdown_telegram_bot():
    await stop_telegram_bot()


@app.get("/")
def root():
    if (frontend_dist / "index.html").exists():
        return FileResponse(frontend_dist / "index.html")
    return {"message": "Company platform backend is running."}


@app.get("/{path:path}")
def frontend_fallback(path: str):
    requested_file = frontend_dist / path
    if requested_file.is_file() and frontend_dist in requested_file.parents:
        return FileResponse(requested_file)
    if (frontend_dist / "index.html").exists():
        return FileResponse(frontend_dist / "index.html")
    return {"message": "Company platform backend is running."}
