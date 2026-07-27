from sqlalchemy.orm import Session

from app.models.subject import Subject
from app.models.question_type import QuestionType

DEFAULT_SUBJECTS = [
    {"name": "数学", "color": "#007AFF"},
    {"name": "英语", "color": "#FF9500"},
    {"name": "物理", "color": "#34C759"},
    {"name": "化学", "color": "#AF52DE"},
]

DEFAULT_TYPES = [
    {"name": "选择题", "sort_order": 1},
    {"name": "填空题", "sort_order": 2},
    {"name": "主观题", "sort_order": 3},
    {"name": "客观题", "sort_order": 4},
]


def create_default_data(db: Session, user_id: int):
    for sub in DEFAULT_SUBJECTS:
        subject = Subject(user_id=user_id, name=sub["name"], color=sub["color"])
        db.add(subject)
        db.flush()
        for t in DEFAULT_TYPES:
            db.add(QuestionType(subject_id=subject.id, user_id=user_id, name=t["name"], sort_order=t["sort_order"]))
    db.commit()


def get_subjects(db: Session, user_id: int) -> list[Subject]:
    return db.query(Subject).filter(Subject.user_id == user_id).order_by(Subject.sort_order).all()


def create_subject(db: Session, user_id: int, name: str, color: str) -> Subject:
    subject = Subject(user_id=user_id, name=name, color=color)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def update_subject(db: Session, subject: Subject, name: str | None, color: str | None) -> Subject:
    if name is not None:
        subject.name = name
    if color is not None:
        subject.color = color
    db.commit()
    db.refresh(subject)
    return subject


def delete_subject(db: Session, subject: Subject):
    db.delete(subject)
    db.commit()


def create_question_type(db: Session, user_id: int, subject_id: int, name: str) -> QuestionType:
    qt = QuestionType(subject_id=subject_id, user_id=user_id, name=name)
    db.add(qt)
    db.commit()
    db.refresh(qt)
    return qt


def update_question_type(db: Session, qt: QuestionType, name: str | None) -> QuestionType:
    if name is not None:
        qt.name = name
    db.commit()
    db.refresh(qt)
    return qt


def delete_question_type(db: Session, qt: QuestionType):
    db.delete(qt)
    db.commit()
