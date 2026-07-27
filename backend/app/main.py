import os
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.config import settings
from app.routers import auth, subjects, tags, questions, ocr, draft, review, ai_chat, stats, export, settings as settings_router

# Logging
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
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(title="错题收集与重做系统", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
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
app.include_router(settings_router.router)

uploads_dir = os.path.join(settings.UPLOAD_ROOT)
if os.path.isdir(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/log/frontend")
@limiter.limit("10/minute")
async def frontend_error(request: Request):
    body = await request.json()
    logger.warning(f"Frontend error: {body.get('message')} at {body.get('url')} — {body.get('stack', '')[:200]}")
    return {"ok": True}
