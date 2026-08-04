import json
import os
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.question_image import QuestionImage
from app.models.question_draft import QuestionDraft
from app.models.mineru_image import MineruImage
from app.models.user_config import UserConfig
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionOut, QuestionListOut,
    BatchDeleteRequest, BatchTagRequest,
)
from app.services import question_service

router = APIRouter(prefix="/api", tags=["questions"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.get("/questions", response_model=QuestionListOut)
def list_questions(
    subject_id: str | None = None,
    type_id: str | None = None,
    tag_id: str | None = None,
    keyword: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort: str = "created_at_desc",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    params = {k: v for k, v in locals().items() if v is not None and k not in ("db", "current_user", "req")}
    questions, total = question_service.paginate_questions(db, current_user.id, params)

    question_ids = [q.id for q in questions]
    stats_map = question_service.get_batch_question_stats(db, question_ids)
    code_map = question_service.compute_question_codes(db, current_user.id, questions)

    items = []
    for q in questions:
        stats = stats_map.get(q.id, {"total_attempts": 0, "correct_attempts": 0, "accuracy": 0.0})
        items.append(QuestionOut(
            id=q.id, code=code_map.get(q.id, ""),
            subject_id=q.subject_id, question_type_id=q.question_type_id,
            content=q.content[:200],
            content_plain=q.content_plain,
            answer=q.answer, explanation=q.explanation, source=q.source,
            is_deleted=q.is_deleted, created_at=q.created_at, updated_at=q.updated_at,
            subject_name=q.subject.name if q.subject else "",
            subject_color=q.subject.color if q.subject else "",
            type_name=q.question_type.name if q.question_type else "",
            tag_ids=[t.id for t in q.tags],
            tag_names=[t.name for t in q.tags],
            **stats,
        ))

    return QuestionListOut(items=items, total=total, page=page, page_size=page_size)


def _build_question_out(q: Question, db: Session, truncate: bool = False) -> QuestionOut:
    stats = question_service.get_question_stats(db, q.id)
    code_map = question_service.compute_question_codes(db, q.user_id, [q])
    return QuestionOut(
        id=q.id, code=code_map.get(q.id, ""),
        subject_id=q.subject_id, question_type_id=q.question_type_id,
        content=q.content[:200] if truncate else q.content,
        content_plain=q.content_plain,
        answer=q.answer, explanation=q.explanation, source=q.source,
        is_deleted=q.is_deleted, created_at=q.created_at, updated_at=q.updated_at,
        subject_name=q.subject.name if q.subject else "",
        subject_color=q.subject.color if q.subject else "",
        type_name=q.question_type.name if q.question_type else "",
        tag_ids=[t.id for t in q.tags],
        tag_names=[t.name for t in q.tags],
        **stats,
    )


@router.get("/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = question_service.get_question_with_tags(db, question_id, current_user.id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题目不存在")
    return _build_question_out(q, db)


@router.post("/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(req: QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = question_service.create_question(db, current_user.id, req.model_dump())
    return _build_question_out(q, db)


@router.put("/questions/batch-tag", status_code=status.HTTP_200_OK)
def batch_tag(req: BatchTagRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question_service.batch_update_tags(db, current_user.id, req.ids, req.tag_ids)
    return {"ok": True}


@router.put("/questions/{question_id}", response_model=QuestionOut)
def update_question(question_id: int, req: QuestionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = question_service.get_question_with_tags(db, question_id, current_user.id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题目不存在")
    q = question_service.update_question(db, q, req.model_dump(exclude_none=True))
    return _build_question_out(q, db)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = question_service.get_question_with_tags(db, question_id, current_user.id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题目不存在")
    question_service.soft_delete_question(db, q)


@router.post("/questions/batch-delete", status_code=status.HTTP_200_OK)
def batch_delete(req: BatchDeleteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = question_service.batch_delete_questions(db, current_user.id, req.ids)
    return {"deleted": count}


@router.post("/upload/image")
def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ext = file.filename.split(".")[-1].lower() if file.filename else "png"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {ext}")
    # 读前先按 Content-Length 拦截超限文件（防超大文件整体读入内存）
    if file.size is not None and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="图片大小不能超过 10MB")
    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="图片大小不能超过 10MB")

    now = datetime.now()
    rel_dir = os.path.join("images", str(now.year), f"{now.month:02d}")
    abs_dir = os.path.join(settings.UPLOAD_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(abs_dir, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    rel_path = os.path.join(rel_dir, filename).replace("\\", "/")
    img = QuestionImage(
        user_id=current_user.id,
        file_path=rel_path,
        file_size=len(contents),
        original_name=file.filename,
    )
    db.add(img)
    db.commit()
    db.refresh(img)

    url = f"/uploads/{rel_path}"
    return {"url": url, "file_id": img.id}


def _extract_image_urls(text: str) -> set[str]:
    """从文本中提取 markdown 图片引用和 <img> 标签的 URL。"""
    used = set()
    for m in re.finditer(r"!\[[^\]]*\]\(\s*([^)\s]+)\s*\)", text):
        used.add(m.group(1))
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', text):
        used.add(m.group(1))
    return used


def _get_used_image_urls(db: Session, user_id: int | None = None) -> set[str]:
    """扫描未删除题目和草稿的文本字段，提取其中引用的图片 URL。

    user_id 为 None 时扫描全部用户（MinerU 图片为共享产物，删除前需全局检查）。
    """
    q = db.query(Question.content, Question.answer, Question.explanation).filter(Question.is_deleted.is_(False))
    if user_id is not None:
        q = q.filter(Question.user_id == user_id)
    rows = q.all()

    dq = db.query(QuestionDraft.content, QuestionDraft.answer, QuestionDraft.explanation,
                  QuestionDraft.ocr_text, QuestionDraft.ai_parse_result)
    if user_id is not None:
        dq = dq.filter(QuestionDraft.user_id == user_id)
    draft_rows = dq.all()

    used = set()
    for content, answer, explanation in rows:
        for text in (content or "", answer or "", explanation or ""):
            used.update(_extract_image_urls(text))
    for content, answer, explanation, ocr_text, ai_parse_result in draft_rows:
        for text in (content or "", answer or "", explanation or "", ocr_text or ""):
            used.update(_extract_image_urls(text))
        if ai_parse_result:
            used.update(_extract_image_urls(json.dumps(ai_parse_result, ensure_ascii=False)))

    # 背景图（当前 bg_image + 历史 bg_history）
    cq = db.query(UserConfig.config_key, UserConfig.config_value).filter(
        UserConfig.config_key.in_(["bg_image", "bg_history"])
    )
    if user_id is not None:
        cq = cq.filter(UserConfig.user_id == user_id)
    for key, value in cq.all():
        if key == "bg_image":
            if value:
                used.add(value)
        elif value:
            try:
                for url in json.loads(value):
                    if isinstance(url, str):
                        used.add(url)
            except (json.JSONDecodeError, TypeError):
                pass
    return used


@router.get("/images")
def list_images(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """列出所有图片（用户上传 + MinerU 解析产物），标记是否已被题目引用（in_use）。"""
    used = _get_used_image_urls(db, current_user.id)

    uploads = [
        {
            "id": img.id,
            "type": "upload",
            "url": f"/uploads/{img.file_path}",
            "file_size": img.file_size,
            "original_name": img.original_name,
            "created_at": img.created_at,
            "in_use": f"/uploads/{img.file_path}" in used,
        }
        for img in db.query(QuestionImage).filter(
            QuestionImage.user_id == current_user.id
        ).order_by(QuestionImage.id.desc()).all()
    ]

    # MinerU 解析产物：只显示当前用户解析出的（归属隔离）；文件为共享去重存储，in_use 需按全部用户判断
    mineru_dir = os.path.join(settings.UPLOAD_ROOT, "mineru")
    mineru_imgs = []
    if os.path.isdir(mineru_dir):
        used_all = _get_used_image_urls(db)
        for (name,) in db.query(MineruImage.file_name).filter(MineruImage.user_id == current_user.id).all():
            path = os.path.join(mineru_dir, name)
            if not os.path.isfile(path):
                continue
            url = f"/uploads/mineru/{name}"
            stat = os.stat(path)
            mineru_imgs.append({
                "id": None,
                "type": "mineru",
                "url": url,
                "file_size": stat.st_size,
                "original_name": name,
                "created_at": datetime.fromtimestamp(stat.st_mtime),
                "in_use": url in used_all,
            })
        mineru_imgs.sort(key=lambda x: x["created_at"], reverse=True)

    return {"images": uploads + mineru_imgs}


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(image_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """删除用户上传的图片；已被题目引用的图片禁止删除。"""
    img = db.query(QuestionImage).filter(
        QuestionImage.id == image_id, QuestionImage.user_id == current_user.id
    ).first()
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在")
    url = f"/uploads/{img.file_path}"
    if url in _get_used_image_urls(db, current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="图片已被题目使用，无法删除")
    path = os.path.join(settings.UPLOAD_ROOT, img.file_path)
    if os.path.exists(path):
        os.remove(path)
    db.delete(img)
    db.commit()


@router.delete("/images/mineru/{filename}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mineru_image(filename: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """删除 MinerU 解析产物图片；仅创建者（有归属记录）可删，且需未被任何题目引用。"""
    name = os.path.basename(filename)
    if not name or name in (".", ".."):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在")
    owned = db.query(MineruImage).filter(
        MineruImage.user_id == current_user.id, MineruImage.file_name == name
    ).first()
    if not owned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在或不属于当前用户")
    path = os.path.join(settings.UPLOAD_ROOT, "mineru", name)
    if not os.path.isfile(path):
        db.delete(owned)
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片文件已不存在")
    url = f"/uploads/mineru/{name}"
    if url in _get_used_image_urls(db):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="图片已被题目使用，无法删除")
    os.remove(path)
    # 共享文件已删除，清理所有用户的归属记录
    db.query(MineruImage).filter(MineruImage.file_name == name).delete()
    db.commit()
