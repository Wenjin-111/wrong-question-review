import json
import random
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.question import Question
from app.models.review_record import ReviewRecord
from app.models.review_session import ReviewSession
from app.models.question_tag import QuestionTag
from app.models.subject import Subject
from app.models.question_type import QuestionType

# Default spaced repetition intervals in minutes
DEFAULT_INTERVALS = [20, 60, 1440, 2880, 8640, 44640]  # 20min, 1h, 1d, 2d, 6d, 31d


def get_user_intervals(db: Session, user_id: int) -> list[int]:
    from app.models.user_config import UserConfig
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id, UserConfig.config_key == "spaced_intervals").first()
    if config:
        try:
            return json.loads(config.config_value)
        except (json.JSONDecodeError, TypeError):
            pass
    return DEFAULT_INTERVALS


def create_session(db: Session, user_id: int, params: dict) -> dict:
    review_mode = params.get("review_mode", "free")
    subject_ids = params.get("subject_ids", [])
    type_ids = params.get("type_ids", [])
    tag_ids = params.get("tag_ids", [])
    limit = min(params.get("limit", 20), 100)
    order = params.get("order", "random")

    q = db.query(Question).filter(Question.user_id == user_id, Question.is_deleted == False)

    if subject_ids:
        q = q.filter(Question.subject_id.in_(subject_ids))
    if type_ids:
        q = q.filter(Question.question_type_id.in_(type_ids))
    if tag_ids:
        q = q.join(QuestionTag).filter(QuestionTag.tag_id.in_(tag_ids))

    if review_mode == "spaced":
        intervals = get_user_intervals(db, user_id)
        # Filter questions due for review
        due_ids = _get_due_question_ids(db, user_id)
        q = q.filter(Question.id.in_(due_ids))

    questions = q.options(joinedload(Question.tags)).all()

    if order == "random":
        random.shuffle(questions)
    elif order == "created_at_desc":
        questions.sort(key=lambda x: x.created_at, reverse=True)

    questions = questions[:limit]
    if not questions:
        raise ValueError("没有符合条件的题目")

    session = ReviewSession(
        user_id=user_id, review_mode=review_mode,
        subject_ids=subject_ids, total_count=len(questions),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    result = []
    for q in questions:
        result.append({
            "id": q.id, "content": q.content, "answer": q.answer,
            "explanation": q.explanation or "",
            "question_type": _get_type_info(db, q.question_type_id),
            "subject": _get_subject_info(db, q.subject_id),
        })

    return {"session_id": session.id, "questions": result, "total": len(result)}


def _get_due_question_ids(db: Session, user_id: int) -> set[int]:
    """Get question IDs that have a schedule review time <= now, plus never-reviewed questions"""
    # Questions with scheduled review due
    subquery = (
        db.query(ReviewRecord.question_id, func.max(ReviewRecord.created_at).label("latest"))
        .filter(ReviewRecord.user_id == user_id, ReviewRecord.review_mode == "spaced")
        .group_by(ReviewRecord.question_id)
        .subquery()
    )
    due_records = (
        db.query(ReviewRecord.question_id)
        .join(subquery, (ReviewRecord.question_id == subquery.c.question_id) & (ReviewRecord.created_at == subquery.c.latest))
        .filter(ReviewRecord.sr_next_review <= datetime.utcnow())
        .all()
    )
    due_ids = {r.question_id for r in due_records}

    # Questions never reviewed in spaced mode — also due
    reviewed_ids = (
        db.query(ReviewRecord.question_id)
        .filter(ReviewRecord.user_id == user_id, ReviewRecord.review_mode == "spaced")
        .distinct()
        .all()
    )
    reviewed_set = {r.question_id for r in reviewed_ids}

    never_reviewed = (
        db.query(Question.id)
        .filter(Question.user_id == user_id, Question.is_deleted == False, ~Question.id.in_(reviewed_set))
        .all()
    ) if reviewed_set else (
        db.query(Question.id)
        .filter(Question.user_id == user_id, Question.is_deleted == False)
        .all()
    )

    return due_ids | {q.id for q in never_reviewed}


def submit_answer(db: Session, user_id: int, session_id: int, question_id: int, user_answer: str, is_correct: bool | None) -> dict:
    question = db.query(Question).filter(Question.id == question_id, Question.user_id == user_id).first()
    if not question:
        raise ValueError("题目不存在")

    session = db.query(ReviewSession).filter(ReviewSession.id == session_id, ReviewSession.user_id == user_id).first()
    if not session:
        raise ValueError("会话不存在")

    # First call: is_correct is None → show correct answer, wait for self-evaluation
    if is_correct is None:
        return {
            "is_correct": False,
            "correct_answer": question.answer,
            "explanation": question.explanation or "",
            "user_answer": user_answer,
            "need_self_evaluate": True,
        }

    # Second call: is_correct provided → save the record
    record = ReviewRecord(
        user_id=user_id, question_id=question_id,
        is_correct=is_correct,
        user_answer=user_answer,
        review_mode=session.review_mode,
    )

    if session.review_mode == "spaced":
        intervals = get_user_intervals(db, user_id)
        last_record = (
            db.query(ReviewRecord)
            .filter(ReviewRecord.user_id == user_id, ReviewRecord.question_id == question_id, ReviewRecord.review_mode == "spaced")
            .order_by(ReviewRecord.created_at.desc())
            .first()
        )
        if is_correct:
            current_stage = (last_record.sr_stage or 0) + 1
            record.sr_stage = min(current_stage, len(intervals))
        else:
            current_stage = last_record.sr_stage or 1
            record.sr_stage = max(1, current_stage - 2)
        idx = min(record.sr_stage - 1, len(intervals) - 1)
        record.sr_next_review = datetime.utcnow() + timedelta(minutes=intervals[idx])

    db.add(record)

    if is_correct:
        session.correct_count += 1
    else:
        session.wrong_count += 1
    db.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": question.answer,
        "explanation": question.explanation or "",
        "sr_next_review": record.sr_next_review,
        "need_self_evaluate": False,
    }


def finish_session(db: Session, user_id: int, session_id: int):
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id, ReviewSession.user_id == user_id).first()
    if session:
        session.finished_at = datetime.utcnow()
        db.commit()


def get_session_summary(db: Session, user_id: int, session_id: int) -> dict:
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id, ReviewSession.user_id == user_id).first()
    if not session:
        raise ValueError("会话不存在")
    records = db.query(ReviewRecord).filter(ReviewRecord.user_id == user_id).order_by(ReviewRecord.created_at.desc()).limit(session.total_count).all()
    questions_data = []
    for r in records:
        q = db.query(Question).filter(Question.id == r.question_id).first()
        if q:
            questions_data.append({
                "question_id": q.id,
                "content": q.content[:200],
                "answer": q.answer,
                "explanation": q.explanation or "",
                "user_answer": r.user_answer,
                "is_correct": r.is_correct,
            })
    return {
        "session_id": session.id,
        "total_count": session.total_count,
        "correct_count": session.correct_count,
        "wrong_count": session.wrong_count,
        "accuracy": (session.correct_count / max(session.total_count, 1)) * 100,
        "questions": questions_data,
    }


def get_today_pending(db: Session, user_id: int) -> int:
    return len(_get_due_question_ids(db, user_id))


def _get_type_info(db: Session, type_id: int) -> dict:
    qt = db.query(QuestionType).filter(QuestionType.id == type_id).first()
    return {"id": qt.id, "name": qt.name} if qt else {"id": 0, "name": ""}


def _get_subject_info(db: Session, subject_id: int) -> dict:
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    return {"id": s.id, "name": s.name} if s else {"id": 0, "name": ""}
