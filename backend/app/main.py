import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.routers import health, translate, rooms, websocket_room

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("LinguaLiveAI")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


settings = get_settings()

app = FastAPI(
    title="LinguaLive AI — Real-Time Voice and Offline Text Translator",
    description="Real-Time WebRTC signalling, STT, Translation, and TTS API for LinguaLive AI Android & Web applications.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware (Supports wildcard with credentials cleanly for web production)
if settings.cors_origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API Routers
app.include_router(health.router)
app.include_router(translate.router)
app.include_router(rooms.router)
app.include_router(websocket_room.router)

# Locate Frontend Production Build (if available)
FRONTEND_DIST_DIR = None
potential_paths = [
    Path(__file__).resolve().parent.parent.parent / "web" / "dist",
    Path(__file__).resolve().parent.parent / "dist",
    Path("web/dist").resolve(),
    Path("dist").resolve(),
]

for p in potential_paths:
    if p.exists() and (p / "index.html").exists():
        FRONTEND_DIST_DIR = p
        break

if FRONTEND_DIST_DIR:
    logger.info(f"Found frontend distribution at: {FRONTEND_DIST_DIR}")

    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_root(request: Request):
        # If client specifically requested JSON or didn't request HTML (e.g. API clients, curl, tests)
        accept = request.headers.get("accept", "")
        if "text/html" not in accept:
            return {
                "project": "LinguaLive AI — Real-Time Voice and Offline Text Translator",
                "status": "online",
                "documentation": "/docs",
                "openapi_spec": "/openapi.json",
                "endpoints": {
                    "health": "/api/health",
                    "provider_status": "/api/status",
                    "supported_languages": "/api/languages",
                    "translate": "/api/translate",
                    "tts": "/api/tts",
                    "stt": "/api/stt",
                    "create_room": "/api/rooms/create",
                    "websocket_room": "/ws/room/{room_id}"
                }
            }
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_or_static(full_path: str):
        # Do not intercept API, WebSockets, or Swagger documentation
        if (
            full_path.startswith("api/")
            or full_path == "api"
            or full_path.startswith("ws/")
            or full_path in ["docs", "openapi.json", "redoc"]
        ):
            raise HTTPException(status_code=404, detail="API route not found")

        # If a static file exists (e.g. favicon.ico, logo.png, robots.txt), serve it
        file_path = FRONTEND_DIST_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)

        # Fallback to SPA index.html for client-side routing
        return FileResponse(FRONTEND_DIST_DIR / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "project": "LinguaLive AI — Real-Time Voice and Offline Text Translator",
            "status": "online",
            "documentation": "/docs",
            "openapi_spec": "/openapi.json",
            "endpoints": {
                "health": "/api/health",
                "provider_status": "/api/status",
                "supported_languages": "/api/languages",
                "translate": "/api/translate",
                "tts": "/api/tts",
                "stt": "/api/stt",
                "create_room": "/api/rooms/create",
                "websocket_room": "/ws/room/{room_id}"
            }
        }
