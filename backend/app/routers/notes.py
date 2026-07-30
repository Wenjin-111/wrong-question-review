from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.question_note import QuestionNote

router = APIRouter(prefix="/api", tags=["notes"])


class NoteCreate(BaseModel):
    content: str


class NoteUpdate(BaseModel):
    content: str


@router.get("/questions/{question_id}/notes")
def list_notes(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Question).filter(Question.id == question_id, Question.user_id == current_user.id, Question.is_deleted == False).first()
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")
    notes = (
        db.query(QuestionNote)
        .filter(QuestionNote.question_id == question_id, QuestionNote.user_id == current_user.id)
        .order_by(QuestionNote.updated_at.desc())
        .all()
    )
    return [
        {
            "id": n.id,
            "content": n.content,
            "created_at": n.created_at.isoformat(),
            "updated_at": n.updated_at.isoformat(),
        }
        for n in notes
    ]


@router.post("/questions/{question_id}/notes", status_code=status.HTTP_201_CREATED)
def create_note(question_id: int, req: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Question).filter(Question.id == question_id, Question.user_id == current_user.id, Question.is_deleted == False).first()
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")
    note = QuestionNote(user_id=current_user.id, question_id=question_id, content=req.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "created_at": note.created_at.isoformat(), "updated_at": note.updated_at.isoformat()}


@router.put("/notes/{note_id}")
def update_note(note_id: int, req: NoteUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(QuestionNote).filter(QuestionNote.id == note_id, QuestionNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    note.content = req.content
    note.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"id": note.id, "content": note.content, "updated_at": note.updated_at.isoformat()}


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(QuestionNote).filter(QuestionNote.id == note_id, QuestionNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    db.delete(note)
    db.commit()
