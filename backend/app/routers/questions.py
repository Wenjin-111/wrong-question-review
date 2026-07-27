import os
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
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionOut, QuestionListOut,
    BatchDeleteRequest, BatchTagRequest,
)
from app.services import question_service

router = APIRouter(prefix="/api", tags=["questions"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def _format_question(q: Question) -> QuestionOut:
    stats = question_service.get_question_stats(db=None, question_id=q.id)  # FIXME
    return QuestionOut(
        id=q.id,
        subject_id=q.subject_id,
        question_type_id=q.question_type_id,
        content=q.content,
        content_plain=q.content_plain,
        answer=q.answer,
        explanation=q.explanation,
        source=q.source,
        is_deleted=q.is_deleted,
        created_at=q.created_at,
        updated_at=q.updated_at,
        tag_ids=[t.id for t in q.tags],
        tag_names=[t.name for t in q.tags],
        **stats,
    )


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
    params = {k: v for k, v in locals().items() if v is not None and k not in ("db", "current_user")}
    questions, total = question_service.paginate_questions(db, current_user.id, params)

    items = []
    for q in questions:
        items.append(_build_question_out(q, db, truncate=True))

    return QuestionListOut(items=items, total=total, page=page, page_size=page_size)


def _build_question_out(q: Question, db: Session, truncate: bool = False) -> QuestionOut:
    from app.models.subject import Subject
    from app.models.question_type import QuestionType
    stats = question_service.get_question_stats(db, q.id)
    subject = db.query(Subject).filter(Subject.id == q.subject_id).first()
    qtype = db.query(QuestionType).filter(QuestionType.id == q.question_type_id).first()
    return QuestionOut(
        id=q.id, subject_id=q.subject_id, question_type_id=q.question_type_id,
        content=q.content[:200] if truncate else q.content,
        content_plain=q.content_plain,
        answer=q.answer, explanation=q.explanation, source=q.source,
        is_deleted=q.is_deleted, created_at=q.created_at, updated_at=q.updated_at,
        subject_name=subject.name if subject else "",
        subject_color=subject.color if subject else "",
        type_name=qtype.name if qtype else "",
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


@router.put("/questions/batch-tag", status_code=status.HTTP_200_OK)
def batch_tag(req: BatchTagRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question_service.batch_update_tags(db, current_user.id, req.ids, req.tag_ids)
    return {"ok": True}


@router.post("/upload/image")
def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ext = file.filename.split(".")[-1].lower() if file.filename else "png"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {ext}")
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
