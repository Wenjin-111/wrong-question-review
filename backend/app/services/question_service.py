import re
import json
from datetime import datetime

from sqlalchemy import func, or_, text, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.models.question import Question
from app.models.tag import Tag
from app.models.question_tag import QuestionTag
from app.models.review_record import ReviewRecord


def strip_html(html: str) -> str:
    clean = re.sub(r"<[^>]+>", " ", html or "")
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def build_question_query(db: Session, user_id: int, params: dict):
    q = db.query(Question).filter(Question.user_id == user_id, Question.is_deleted == False)

    if params.get("subject_id"):
        ids = [int(x) for x in params["subject_id"].split(",")]
        q = q.filter(Question.subject_id.in_(ids))
    if params.get("type_id"):
        ids = [int(x) for x in params["type_id"].split(",")]
        q = q.filter(Question.question_type_id.in_(ids))
    if params.get("tag_id"):
        ids = [int(x) for x in params["tag_id"].split(",")]
        q = q.join(QuestionTag).filter(QuestionTag.tag_id.in_(ids))
    if params.get("keyword"):
        kw = params["keyword"]
        if len(kw) >= 2:
            q = q.filter(
                or_(
                    func.match(Question.content_plain, kw).bool(),
                    Question.content_plain.like(f"%{kw}%"),
                )
            )
        else:
            q = q.filter(Question.content_plain.like(f"%{kw}%"))
    if params.get("date_from"):
        q = q.filter(Question.created_at >= params["date_from"])
    if params.get("date_to"):
        q = q.filter(Question.created_at <= params["date_to"])
    return q


def paginate_questions(db: Session, user_id: int, params: dict) -> tuple[list[Question], int]:
    q = build_question_query(db, user_id, params)

    total = q.count()

    sort = params.get("sort", "created_at_desc")
    sort_map = {
        "created_at_desc": desc(Question.created_at),
        "created_at_asc": asc(Question.created_at),
    }
    q = q.order_by(sort_map.get(sort, desc(Question.created_at)))

    page = max(1, int(params.get("page", 1)))
    page_size = min(50, max(1, int(params.get("page_size", 20))))
    q = q.offset((page - 1) * page_size).limit(page_size)

    questions = q.options(joinedload(Question.tags)).all()
    return questions, total


def get_question_with_tags(db: Session, question_id: int, user_id: int) -> Question | None:
    return (
        db.query(Question)
        .options(joinedload(Question.tags))
        .filter(Question.id == question_id, Question.user_id == user_id, Question.is_deleted == False)
        .first()
    )


def create_question(db: Session, user_id: int, data: dict) -> Question:
    q = Question(
        user_id=user_id,
        subject_id=data["subject_id"],
        question_type_id=data["question_type_id"],
        content=data["content"],
        content_plain=strip_html(data["content"]),
        answer=json.dumps(data["answer"], ensure_ascii=False) if isinstance(data["answer"], dict) else data["answer"],
        explanation=data.get("explanation"),
        source=data.get("source"),
    )
    db.add(q)
    db.flush()

    for tag_id in data.get("tag_ids", []):
        db.add(QuestionTag(question_id=q.id, tag_id=tag_id))

    db.commit()
    db.refresh(q)
    return q


def update_question(db: Session, q: Question, data: dict) -> Question:
    for field in ["subject_id", "question_type_id", "explanation", "source"]:
        if data.get(field) is not None:
            setattr(q, field, data[field])
    if data.get("content") is not None:
        q.content = data["content"]
        q.content_plain = strip_html(data["content"])
    if data.get("answer") is not None:
        q.answer = json.dumps(data["answer"], ensure_ascii=False) if isinstance(data["answer"], dict) else data["answer"]
    if data.get("tag_ids") is not None:
        db.query(QuestionTag).filter(QuestionTag.question_id == q.id).delete()
        for tag_id in data["tag_ids"]:
            db.add(QuestionTag(question_id=q.id, tag_id=tag_id))
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return q


def soft_delete_question(db: Session, q: Question):
    q.is_deleted = True
    q.updated_at = datetime.utcnow()
    db.commit()


def batch_delete_questions(db: Session, user_id: int, ids: list[int]) -> int:
    count = (
        db.query(Question)
        .filter(Question.id.in_(ids), Question.user_id == user_id, Question.is_deleted == False)
        .update({"is_deleted": True, "updated_at": datetime.utcnow()}, synchronize_session=False)
    )
    db.commit()
    return count


def batch_update_tags(db: Session, user_id: int, ids: list[int], tag_ids: list[int]):
    questions = db.query(Question).filter(Question.id.in_(ids), Question.user_id == user_id).all()
    for q in questions:
        db.query(QuestionTag).filter(QuestionTag.question_id == q.id).delete()
        for tag_id in tag_ids:
            db.add(QuestionTag(question_id=q.id, tag_id=tag_id))
    db.commit()


def get_question_stats(db: Session, question_id: int) -> dict:
    total = db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.question_id == question_id).scalar() or 0
    correct = db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.question_id == question_id, ReviewRecord.is_correct == True).scalar() or 0
    return {"total_attempts": total, "correct_attempts": correct, "accuracy": (correct / total * 100) if total > 0 else 0.0}
