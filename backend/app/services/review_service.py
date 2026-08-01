import json
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.question import Question
from app.models.review_record import ReviewRecord
from app.models.review_session import ReviewSession
from app.models.fsrs_state import FsrsState
from app.services.fsrs import apply_fsrs, init_fsrs_state
from app.models.question_tag import QuestionTag
from app.models.subject import Subject
from app.models.question_type import QuestionType

def get_user_retention(db: Session, user_id: int) -> float:
    from app.models.user_config import UserConfig

    config = (
        db.query(UserConfig)
        .filter(UserConfig.user_id == user_id, UserConfig.config_key == "fsrs_retention")
        .first()
    )
    if config:
        try:
            return float(config.config_value)
        except (ValueError, TypeError):
            pass
    return 0.90  # default 90% target retention


def create_session(db: Session, user_id: int, params: dict) -> dict:
    review_mode = params.get("review_mode", "free")
    subject_ids = params.get("subject_ids", [])
    type_ids = params.get("type_ids", [])
    tag_ids = params.get("tag_ids", [])
    question_ids = params.get("question_ids", [])
    limit = min(params.get("limit", 20), 100)
    order = params.get("order", "random")

    q = db.query(Question).filter(Question.user_id == user_id, Question.is_deleted == False)

    if question_ids:
        q = q.filter(Question.id.in_(question_ids))
        limit = len(question_ids)  # override limit when specific questions are selected
    else:
        if subject_ids:
            q = q.filter(Question.subject_id.in_(subject_ids))
        if type_ids:
            q = q.filter(Question.question_type_id.in_(type_ids))
        if tag_ids:
            q = q.join(QuestionTag).filter(QuestionTag.tag_id.in_(tag_ids))

        if review_mode == "spaced":
            due_ids = _get_due_question_ids(db, user_id)
            q = q.filter(Question.id.in_(due_ids))

    # Use database-level random or sort, with LIMIT pushed to DB
    if order == "random":
        q = q.order_by(func.rand())
    elif order == "created_at_desc":
        q = q.order_by(Question.created_at.desc())

    questions = q.options(joinedload(Question.tags)).limit(limit).all()

    if not questions:
        raise ValueError("没有符合条件的题目")

    # Batch-load type and subject info to avoid N+1
    type_ids_set = {q.question_type_id for q in questions}
    subject_ids_set = {q.subject_id for q in questions}
    types_map = {
        t.id: t
        for t in db.query(QuestionType).filter(QuestionType.id.in_(type_ids_set)).all()
    }
    subjects_map = {
        s.id: s
        for s in db.query(Subject).filter(Subject.id.in_(subject_ids_set)).all()
    }

    session = ReviewSession(
        user_id=user_id,
        review_mode=review_mode,
        subject_ids=subject_ids,
        question_ids=[q.id for q in questions],
        total_count=len(questions),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    result = []
    for q in questions:
        t = types_map.get(q.question_type_id)
        s = subjects_map.get(q.subject_id)
        result.append({
            "id": q.id,
            "content": q.content,
            "answer": q.answer,
            "explanation": q.explanation or "",
            "question_type": {"id": t.id, "name": t.name} if t else {"id": 0, "name": ""},
            "subject": {"id": s.id, "name": s.name} if s else {"id": 0, "name": ""},
        })

    return {"session_id": session.id, "questions": result, "total": len(result)}


def _get_due_question_ids(db: Session, user_id: int) -> set[int]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Questions with FSRS next_review_at <= now
    due_from_fsrs = (
        db.query(FsrsState.question_id)
        .filter(
            FsrsState.user_id == user_id,
            FsrsState.next_review_at <= now,
        )
        .all()
    )
    due_ids = {r.question_id for r in due_from_fsrs}

    # Questions never reviewed in spaced mode (no FSRS state yet)
    questions_with_fsrs = (
        db.query(FsrsState.question_id)
        .filter(FsrsState.user_id == user_id)
        .all()
    )
    fsrs_set = {r.question_id for r in questions_with_fsrs}

    if fsrs_set:
        never_reviewed = (
            db.query(Question.id)
            .filter(
                Question.user_id == user_id,
                Question.is_deleted == False,
                ~Question.id.in_(fsrs_set),
            )
            .all()
        )
    else:
        never_reviewed = (
            db.query(Question.id)
            .filter(Question.user_id == user_id, Question.is_deleted == False)
            .all()
        )

    return due_ids | {q.id for q in never_reviewed}


def submit_answer(
    db: Session, user_id: int, session_id: int, question_id: int,
    user_answer: str, is_correct: bool | None, current_index: int = 0,
    rating: int | None = None,
) -> dict:
    question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.user_id == user_id)
        .first()
    )
    if not question:
        raise ValueError("题目不存在")

    session = (
        db.query(ReviewSession)
        .filter(ReviewSession.id == session_id, ReviewSession.user_id == user_id)
        .first()
    )
    if not session:
        raise ValueError("会话不存在")

    if is_correct is None:
        return {
            "is_correct": False,
            "correct_answer": question.answer,
            "explanation": question.explanation or "",
            "user_answer": user_answer,
            "need_self_evaluate": True,
        }

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    record = ReviewRecord(
        user_id=user_id,
        question_id=question_id,
        session_id=session_id,
        is_correct=is_correct,
        user_answer=user_answer,
        review_mode=session.review_mode,
    )

    if session.review_mode == "spaced":
        retention = get_user_retention(db, user_id)
        fsrs_rating = rating or (3 if is_correct else 1)  # use explicit rating or derive

        # Load or create FSRS state
        fsrs = (
            db.query(FsrsState)
            .filter(FsrsState.user_id == user_id, FsrsState.question_id == question_id)
            .first()
        )
        if not fsrs:
            init = init_fsrs_state()
            fsrs = FsrsState(
                user_id=user_id, question_id=question_id,
                stability=init["stability"], difficulty=init["difficulty"],
                reps=0, state=0,
            )
            db.add(fsrs)
            db.flush()

        elapsed = 0.0
        if fsrs.last_review_at:
            elapsed = (now - fsrs.last_review_at).total_seconds() / 86400.0

        result_state = apply_fsrs(
            current_stability=fsrs.stability,
            current_difficulty=fsrs.difficulty,
            rating=fsrs_rating,
            elapsed_days=elapsed,
            request_retention=retention,
        )

        fsrs.stability = result_state["stability"]
        fsrs.difficulty = result_state["difficulty"]
        fsrs.reps += 1
        fsrs.state = 2  # review
        fsrs.last_review_at = now
        fsrs.next_review_at = now + timedelta(days=result_state["interval_days"])

        record.sr_stage = fsrs.reps
        record.sr_next_review = fsrs.next_review_at

    db.add(record)

    if is_correct:
        session.correct_count += 1
    else:
        session.wrong_count += 1
    session.current_index = current_index

    # Record daily streak
    from app.models.daily_streak import DailyStreak
    today = date.today()
    streak = db.query(DailyStreak).filter(
        DailyStreak.user_id == user_id, DailyStreak.date == today
    ).first()
    if streak:
        streak.review_count += 1
    else:
        db.add(DailyStreak(user_id=user_id, date=today, review_count=1))

    db.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": question.answer,
        "explanation": question.explanation or "",
        "sr_next_review": record.sr_next_review,
        "need_self_evaluate": False,
    }


def finish_session(db: Session, user_id: int, session_id: int):
    session = (
        db.query(ReviewSession)
        .filter(ReviewSession.id == session_id, ReviewSession.user_id == user_id)
        .first()
    )
    if session:
        session.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()


def get_session_summary(db: Session, user_id: int, session_id: int) -> dict:
    session = (
        db.query(ReviewSession)
        .filter(ReviewSession.id == session_id, ReviewSession.user_id == user_id)
        .first()
    )
    if not session:
        raise ValueError("会话不存在")

    records = (
        db.query(ReviewRecord)
        .filter(ReviewRecord.session_id == session_id, ReviewRecord.user_id == user_id)
        .order_by(ReviewRecord.created_at.desc())
        .all()
    )

    # Batch-load questions to avoid N+1
    question_ids = {r.question_id for r in records}
    questions_map = {
        q.id: q
        for q in db.query(Question).filter(Question.id.in_(question_ids)).all()
    }

    questions_data = []
    for r in records:
        q = questions_map.get(r.question_id)
        if q:
            questions_data.append({
                "question_id": q.id,
                "content": q.content[:200] if q.content else "",
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


def list_user_sessions(db: Session, user_id: int, page: int = 1, page_size: int = 20) -> dict:
    total = (
        db.query(func.count(ReviewSession.id))
        .filter(ReviewSession.user_id == user_id)
        .scalar()
    ) or 0
    sessions = (
        db.query(ReviewSession)
        .filter(ReviewSession.user_id == user_id)
        .order_by(ReviewSession.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "review_mode": s.review_mode,
            "total_count": s.total_count,
            "correct_count": s.correct_count,
            "wrong_count": s.wrong_count,
            "current_index": s.current_index,
            "is_finished": s.finished_at is not None,
            "started_at": s.started_at.isoformat(),
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
        })
    return {"total": total, "items": result}


def get_session_for_resume(db: Session, user_id: int, session_id: int) -> dict:
    session = (
        db.query(ReviewSession)
        .filter(ReviewSession.id == session_id, ReviewSession.user_id == user_id)
        .first()
    )
    if not session:
        raise ValueError("会话不存在")
    if session.finished_at:
        raise ValueError("该练习已完成，无法继续")

    # Load questions by stored IDs
    qids = session.question_ids or []
    questions = (
        db.query(Question)
        .options(joinedload(Question.tags))
        .filter(Question.id.in_(qids))
        .all()
    )
    # Preserve original order
    qid_order = {qid: idx for idx, qid in enumerate(qids)}
    questions.sort(key=lambda q: qid_order.get(q.id, 0))

    # Batch-load type and subject info
    type_ids_set = {q.question_type_id for q in questions}
    subject_ids_set = {q.subject_id for q in questions}
    types_map = {
        t.id: t
        for t in db.query(QuestionType).filter(QuestionType.id.in_(type_ids_set)).all()
    }
    subjects_map = {
        s.id: s
        for s in db.query(Subject).filter(Subject.id.in_(subject_ids_set)).all()
    }

    # Load existing review records for progress
    records = (
        db.query(ReviewRecord)
        .filter(ReviewRecord.session_id == session_id, ReviewRecord.user_id == user_id)
        .all()
    )
    answered_map = {}
    for r in records:
        answered_map[r.question_id] = {
            "is_correct": r.is_correct,
            "user_answer": r.user_answer,
        }

    result = []
    for q in questions:
        t = types_map.get(q.question_type_id)
        s = subjects_map.get(q.subject_id)
        result.append({
            "id": q.id,
            "content": q.content,
            "answer": q.answer,
            "explanation": q.explanation or "",
            "question_type": {"id": t.id, "name": t.name} if t else {"id": 0, "name": ""},
            "subject": {"id": s.id, "name": s.name} if s else {"id": 0, "name": ""},
            "answered": q.id in answered_map,
            "previous_result": answered_map.get(q.id),
        })

    return {
        "session_id": session.id,
        "review_mode": session.review_mode,
        "current_index": session.current_index,
        "total_count": session.total_count,
        "correct_count": session.correct_count,
        "wrong_count": session.wrong_count,
        "questions": result,
    }
