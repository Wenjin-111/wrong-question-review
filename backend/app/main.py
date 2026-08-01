import os
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.config import settings
from app.routers import auth, subjects, tags, questions, ocr, draft, review, ai_chat, stats, export, notes, settings as settings_router
from app.services.ai_service import close_ai_client
from app.utils.rate_limit import limiter

# Logging
os.makedirs("logs", exist_ok=True)
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="DEBUG" if settings.DEBUG else "INFO",
)
logger.add(
    "logs/app_{time:YYYY-MM-DD}.log",
    rotation="00:00", retention="30 days", encoding="utf-8",
    level="INFO",
)

# Rate limiting
app = FastAPI(title="错题收集与重做系统", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=[],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(tags.router)
app.include_router(questions.router)
app.include_router(ocr.router)
app.include_router(draft.router)
app.include_router(review.router)
app.include_router(ai_chat.router)
app.include_router(stats.router)
app.include_router(export.router)
app.include_router(notes.router)
app.include_router(settings_router.router)

uploads_dir = os.path.join(settings.UPLOAD_ROOT)
if os.path.isdir(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
else:
    logger.warning(f"Uploads directory '{uploads_dir}' does not exist; static file serving disabled")


@app.on_event("shutdown")
async def shutdown():
    await close_ai_client()


@app.get("/api/health")
def health():
    from sqlalchemy import text
    from app.database import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "database": "connected"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "error", "database": "disconnected"})


@app.post("/api/log/frontend")
@limiter.limit("10/minute")
async def frontend_error(request: Request):
    body = await request.json()
    logger.warning(f"Frontend error: {body.get('message')} at {body.get('url')} — {body.get('stack', '')[:200]}")
    return {"ok": True}
