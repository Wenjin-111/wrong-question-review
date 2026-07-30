from datetime import date, timedelta, datetime

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
    total = (
        db.query(func.count(Question.id))
        .filter(Question.user_id == current_user.id, Question.is_deleted == False)
        .scalar()
    ) or 0
    pending = get_today_pending(db, current_user.id)

    # Combined query for attempts and correct count
    stats_row = (
        db.query(
            func.count(ReviewRecord.id).label("total"),
            func.sum(ReviewRecord.is_correct.cast(Integer)).label("correct"),
        )
        .filter(ReviewRecord.user_id == current_user.id)
        .first()
    )
    total_attempts = stats_row.total or 0
    correct = stats_row.correct or 0
    accuracy = (correct / total_attempts * 100) if total_attempts > 0 else 0

    recent = (
        db.query(Question)
        .filter(Question.user_id == current_user.id, Question.is_deleted == False)
        .order_by(Question.created_at.desc())
        .limit(5)
        .all()
    )

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
        "recent_questions": [
            {"id": q.id, "content": (q.content or "")[:100]} for q in recent
        ],
        "subject_distribution": [{"name": s[0], "count": s[1]} for s in subjects],
    }


@router.get("/overview")
def overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = (
        db.query(func.count(Question.id))
        .filter(Question.user_id == current_user.id, Question.is_deleted == False)
        .scalar()
    ) or 0

    stats_row = (
        db.query(
            func.count(ReviewRecord.id).label("total"),
            func.sum(ReviewRecord.is_correct.cast(Integer)).label("correct"),
        )
        .filter(ReviewRecord.user_id == current_user.id)
        .first()
    )
    total_attempts = stats_row.total or 0
    correct = stats_row.correct or 0
    accuracy = (correct / total_attempts * 100) if total_attempts > 0 else 0
    pending = get_today_pending(db, current_user.id)

    return {
        "total": total,
        "total_attempts": total_attempts,
        "accuracy": round(accuracy, 2),
        "today_pending": pending,
    }


@router.get("/trends")
def trends(days: int = 7, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    end = date.today()
    start = end - timedelta(days=days - 1)
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end, datetime.max.time())

    rows = (
        db.query(
            cast(ReviewRecord.created_at, Date).label("d"),
            func.count(ReviewRecord.id).label("total"),
            func.sum(ReviewRecord.is_correct.cast(Integer)).label("correct"),
        )
        .filter(
            ReviewRecord.user_id == current_user.id,
            ReviewRecord.created_at >= start_dt,
            ReviewRecord.created_at <= end_dt,
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
        daily.append({
            "date": key,
            "total": total,
            "correct": correct,
            "accuracy": round((correct / total * 100), 2) if total > 0 else 0,
        })
    return daily


@router.get("/subjects-breakdown")
def subjects_breakdown(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()

    if not subjects:
        return []

    subject_ids = [s.id for s in subjects]

    # Single query: total questions per subject
    q_counts = (
        db.query(Question.subject_id, func.count(Question.id))
        .filter(Question.subject_id.in_(subject_ids), Question.is_deleted == False)
        .group_by(Question.subject_id)
        .all()
    )
    total_map = {sid: cnt for sid, cnt in q_counts}

    # Single query: attempts and correct per subject
    review_stats = (
        db.query(
            Question.subject_id,
            func.count(ReviewRecord.id).label("attempts"),
            func.sum(ReviewRecord.is_correct.cast(Integer)).label("correct"),
        )
        .join(ReviewRecord, ReviewRecord.question_id == Question.id)
        .filter(Question.subject_id.in_(subject_ids), ReviewRecord.user_id == current_user.id)
        .group_by(Question.subject_id)
        .all()
    )
    stats_map = {}
    for sid, attempts, correct in review_stats:
        correct = correct or 0
        stats_map[sid] = {
            "attempts": attempts,
            "accuracy": round((correct / attempts * 100), 2) if attempts > 0 else 0,
        }

    results = []
    for s in subjects:
        st = stats_map.get(s.id, {"attempts": 0, "accuracy": 0})
        results.append({
            "subject_id": s.id,
            "name": s.name,
            "color": s.color,
            "total": total_map.get(s.id, 0),
            "attempts": st["attempts"],
            "accuracy": st["accuracy"],
            "pending": 0,
        })
    return results


@router.get("/streak")
def streak(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.daily_streak import DailyStreak

    dates = (
        db.query(DailyStreak.date)
        .filter(DailyStreak.user_id == current_user.id)
        .order_by(DailyStreak.date.desc())
        .all()
    )
    date_set = {d.date for d in dates}

    if not date_set:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "total_days": 0,
            "today_reviewed": False,
            "recent_dates": [],
        }

    today = date.today()

    # Current streak: count consecutive days backward from today or yesterday
    current_streak = 0
    check = today
    if check not in date_set:
        check = today - timedelta(days=1)
    while check in date_set:
        current_streak += 1
        check -= timedelta(days=1)

    # Longest streak
    sorted_dates = sorted(date_set)
    longest_streak = 0
    temp_streak = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            temp_streak += 1
        else:
            longest_streak = max(longest_streak, temp_streak)
            temp_streak = 1
    longest_streak = max(longest_streak, temp_streak)

    # Recent 90 days for calendar heatmap
    recent_dates = []
    for i in range(90):
        d = today - timedelta(days=i)
        recent_dates.append({
            "date": d.isoformat(),
            "reviewed": d in date_set,
        })

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_days": len(date_set),
        "today_reviewed": today in date_set,
        "recent_dates": recent_dates,
    }
