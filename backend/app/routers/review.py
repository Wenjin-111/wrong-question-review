from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.review import CreateSessionRequest, SubmitAnswerRequest
from app.services import review_service

router = APIRouter(prefix="/api/review", tags=["review"])


@router.post("/sessions")
def create_session(req: CreateSessionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        result = review_service.create_session(db, current_user.id, req.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return review_service.get_session_summary(db, current_user.id, session_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/sessions/{session_id}/submit")
def submit_answer(
    session_id: int,
    req: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return review_service.submit_answer(
            db, current_user.id, session_id, req.question_id, req.user_answer, req.is_correct,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/sessions/{session_id}/finish")
def finish_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    review_service.finish_session(db, current_user.id, session_id)
    return {"ok": True}


@router.get("/today-pending")
def today_pending(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = review_service.get_today_pending(db, current_user.id)
    return {"count": count}
