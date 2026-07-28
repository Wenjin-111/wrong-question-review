from fastapi import APIRouter, Depends
from sqlalchemy import func, cast, Date, Integer
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.review_record import ReviewRecord
from app.models.subject import Subject
from app.services.review_service import get_today_pending

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(func.count(Question.id)).filter(Question.user_id == current_user.id, Question.is_deleted == False).scalar() or 0
    pending = get_today_pending(db, current_user.id)

    total_attempts = db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.user_id == current_user.id).scalar() or 0
    correct = db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.user_id == current_user.id, ReviewRecord.is_correct == True).scalar() or 0
    accuracy = (correct / total_attempts * 100) if total_attempts > 0 else 0

    # Recent questions
    recent = (
        db.query(Question)
        .filter(Question.user_id == current_user.id, Question.is_deleted == False)
        .order_by(Question.created_at.desc())
        .limit(5)
        .all()
    )

    # Subject distribution
    subjects = (
        db.query(Subject.name, func.count(Question.id).label("count"))
        .join(Question, Question.subject_id == Subject.id)
        .filter(Question.user_id == current_user.id, Question.is_deleted == False)
        .group_by(Subject.id, Subject.name)
        .all()
    )

    return {
        "total_questions": total,
        "today_pending": pending,
        "total_attempts": total_attempts,
        "accuracy": round(accuracy, 2),
        "recent_questions": [{"id": q.id, "content": (q.content or "")[:100]} for q in recent],
        "subject_distribution": [{"name": s[0], "count": s[1]} for s in subjects],
    }


@router.get("/overview")
def overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(func.count(Question.id)).filter(Question.user_id == current_user.id, Question.is_deleted == False).scalar() or 0
    total_attempts = db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.user_id == current_user.id).scalar() or 0
    correct = db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.user_id == current_user.id, ReviewRecord.is_correct == True).scalar() or 0
    accuracy = (correct / total_attempts * 100) if total_attempts > 0 else 0
    pending = get_today_pending(db, current_user.id)
    return {"total": total, "total_attempts": total_attempts, "accuracy": round(accuracy, 2), "today_pending": pending}


@router.get("/trends")
def trends(days: int = 7, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import date, timedelta
    end = date.today()
    start = end - timedelta(days=days - 1)

    rows = (
        db.query(
            cast(ReviewRecord.created_at, Date).label("d"),
            func.count(ReviewRecord.id).label("total"),
            func.sum(ReviewRecord.is_correct.cast(Integer)).label("correct"),
        )
        .filter(
            ReviewRecord.user_id == current_user.id,
            cast(ReviewRecord.created_at, Date) >= start,
            cast(ReviewRecord.created_at, Date) <= end,
        )
        .group_by("d")
        .all()
    )
    row_map = {str(r.d): (r.total, r.correct or 0) for r in rows}

    daily = []
    for i in range(days):
        d = start + timedelta(days=i)
        key = d.isoformat()
        total, correct = row_map.get(key, (0, 0))
        daily.append({"date": key, "total": total, "correct": correct, "accuracy": round((correct / total * 100), 2) if total > 0 else 0})
    return daily


@router.get("/subjects-breakdown")
def subjects_breakdown(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = []
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()
    for s in subjects:
        total = db.query(func.count(Question.id)).filter(Question.subject_id == s.id, Question.is_deleted == False).scalar() or 0

        attempts = (
            db.query(func.count(ReviewRecord.id))
            .join(Question, ReviewRecord.question_id == Question.id)
            .filter(Question.subject_id == s.id, ReviewRecord.user_id == current_user.id)
            .scalar()
        ) or 0

        correct = (
            db.query(func.count(ReviewRecord.id))
            .join(Question, ReviewRecord.question_id == Question.id)
            .filter(Question.subject_id == s.id, ReviewRecord.user_id == current_user.id, ReviewRecord.is_correct == True)
            .scalar()
        ) or 0

        accuracy = (correct / attempts * 100) if attempts > 0 else 0

        results.append({"subject_id": s.id, "name": s.name, "color": s.color, "total": total, "attempts": attempts, "accuracy": round(accuracy, 2), "pending": 0})
    return results
