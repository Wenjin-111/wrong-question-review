from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question_draft import QuestionDraft
from app.models.question import Question
from app.services.question_service import create_question, strip_html

router = APIRouter(prefix="/api/drafts", tags=["drafts"])

MAX_DRAFTS = 5


class DraftSave(BaseModel):
    subject_id: int | None = None
    question_type_id: int | None = None
    content: str | None = None
    answer: str | None = None
    explanation: str | None = None
    source: str | None = None
    tag_ids: list[int] | None = None
    ocr_text: str | None = None
    ai_parse_result: dict | None = None
    image_file_id: int | None = None


@router.get("")
def list_drafts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    drafts = db.query(QuestionDraft).filter(QuestionDraft.user_id == current_user.id).order_by(QuestionDraft.updated_at.desc()).all()
    return [{"id": d.id, "content": (d.content or "")[:100], "subject_id": d.subject_id, "updated_at": d.updated_at.isoformat()} for d in drafts]


@router.get("/{draft_id}")
def get_draft(draft_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(QuestionDraft).filter(QuestionDraft.id == draft_id, QuestionDraft.user_id == current_user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="草稿不存在")
    return {
        "id": d.id, "subject_id": d.subject_id, "question_type_id": d.question_type_id,
        "content": d.content, "answer": d.answer, "explanation": d.explanation,
        "source": d.source, "tag_ids": d.tag_ids, "ocr_text": d.ocr_text,
        "ai_parse_result": d.ai_parse_result, "image_file_id": d.image_file_id,
        "updated_at": d.updated_at.isoformat(),
    }


@router.post("")
def save_draft(req: DraftSave, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    drafts = db.query(QuestionDraft).filter(QuestionDraft.user_id == current_user.id).order_by(QuestionDraft.created_at.asc()).all()
    while len(drafts) >= MAX_DRAFTS:
        db.delete(drafts.pop(0))
        db.flush()

    draft = QuestionDraft(user_id=current_user.id, **req.model_dump(exclude_none=True))
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return {"id": draft.id, "message": "草稿已保存"}


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft(draft_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(QuestionDraft).filter(QuestionDraft.id == draft_id, QuestionDraft.user_id == current_user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="草稿不存在")
    db.delete(d)
    db.commit()


@router.post("/{draft_id}/convert")
def convert_draft(draft_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(QuestionDraft).filter(QuestionDraft.id == draft_id, QuestionDraft.user_id == current_user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="草稿不存在")
    if not d.subject_id or not d.question_type_id or not d.content or not d.answer:
        raise HTTPException(status_code=400, detail="草稿不完整，请补全必填字段（学科、题型、题目内容、答案）")

    q = Question(
        user_id=current_user.id, subject_id=d.subject_id, question_type_id=d.question_type_id,
        content=d.content, content_plain=strip_html(d.content),
        answer=d.answer, explanation=d.explanation or "", source=d.source or "",
    )
    db.add(q)
    db.delete(d)
    db.commit()
    db.refresh(q)
    return {"id": q.id, "message": "草稿已转为错题"}
