import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings as app_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.user_config import UserConfig
from app.utils.security import encrypt_api_key, decrypt_api_key

router = APIRouter(prefix="/api/settings", tags=["settings"])


class FsrsRetentionRequest(BaseModel):
    retention: float


class AiConfigRequest(BaseModel):
    api_url: str
    api_key: str
    model: str


class UserInfoUpdate(BaseModel):
    username: str | None = None
    email: str | None = None


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str


def _get_or_create_config(db: Session, user_id: int, key: str, default: str = "") -> UserConfig:
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id, UserConfig.config_key == key).first()
    if not config:
        config = UserConfig(user_id=user_id, config_key=key, config_value=default)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("/fsrs-retention")
def get_fsrs_retention(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = _get_or_create_config(db, current_user.id, "fsrs_retention", "0.90")
    return {"retention": float(config.config_value)}


@router.put("/fsrs-retention")
def update_fsrs_retention(req: FsrsRetentionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = _get_or_create_config(db, current_user.id, "fsrs_retention")
    retention = max(0.70, min(0.99, req.retention))
    config.config_value = str(retention)
    db.commit()
    return {"retention": retention}


@router.get("/ai-config")
def get_ai_config(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    url = _get_or_create_config(db, current_user.id, "ai_api_url", "https://api.openai.com/v1").config_value
    key = _get_or_create_config(db, current_user.id, "ai_api_key", "").config_value
    model = _get_or_create_config(db, current_user.id, "ai_model", "gpt-4o").config_value
    masked = key[:4] + "****" + key[-4:] if len(key) > 8 else "****"
    return {"api_url": url, "api_key": masked, "model": model}


@router.put("/ai-config")
def update_ai_config(req: AiConfigRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    url = _get_or_create_config(db, current_user.id, "ai_api_url")
    key = _get_or_create_config(db, current_user.id, "ai_api_key")
    model = _get_or_create_config(db, current_user.id, "ai_model")
    url.config_value = req.api_url
    model.config_value = req.model
    if req.api_key and "****" not in req.api_key:
        key.config_value = encrypt_api_key(req.api_key)
    db.commit()
    return {"ok": True}


@router.put("/user-info")
def update_user_info(req: UserInfoUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.username:
        existing = db.query(User).filter(User.username == req.username, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="用户名已存在")
        current_user.username = req.username
    if req.email:
        existing = db.query(User).filter(User.email == req.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="邮箱已注册")
        current_user.email = req.email
    db.commit()
    return {"ok": True}


@router.put("/password")
def update_password(req: PasswordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.utils.security import verify_password, hash_password
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="旧密码不正确")
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"ok": True}


@router.post("/avatar")
def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    ext = file.filename.split(".")[-1].lower() if file.filename else "png"
    if ext not in ("jpg", "jpeg", "png", "bmp", "webp"):
        raise HTTPException(status_code=400, detail="不支持的图片格式")

    contents = file.file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="头像不能超过 5MB")

    rel_dir = os.path.join("avatars")
    abs_dir = os.path.join(app_settings.UPLOAD_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(abs_dir, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = url
    db.commit()

    return {"avatar_url": url}
