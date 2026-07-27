from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.subject import Subject
from app.models.question_type import QuestionType
from app.schemas.subject import SubjectOut, SubjectCreate, SubjectUpdate, QuestionTypeCreate, QuestionTypeUpdate, QuestionTypeOut
from app.services import subject_service
from app.models.question import Question  # forward ref for count check

router = APIRouter(prefix="/api", tags=["subjects"])


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subjects = subject_service.get_subjects(db, current_user.id)
    result = []
    for s in subjects:
        q_count = db.query(Question).filter(Question.subject_id == s.id, Question.is_deleted == False).count()
        result.append(SubjectOut(
            id=s.id, name=s.name, color=s.color, sort_order=s.sort_order,
            question_count=q_count,
            question_types=[QuestionTypeOut.model_validate(t) for t in s.question_types],
        ))
    return result


@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(req: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Subject).filter(Subject.user_id == current_user.id, Subject.name == req.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="学科名称已存在")
    s = subject_service.create_subject(db, current_user.id, req.name, req.color)
    return SubjectOut(id=s.id, name=s.name, color=s.color, sort_order=s.sort_order, question_types=[])


@router.put("/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, req: SubjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学科不存在")
    s = subject_service.update_subject(db, s, req.name, req.color)
    q_count = db.query(Question).filter(Question.subject_id == s.id, Question.is_deleted == False).count()
    return SubjectOut(id=s.id, name=s.name, color=s.color, sort_order=s.sort_order,
                      question_count=q_count,
                      question_types=[QuestionTypeOut.model_validate(t) for t in s.question_types])


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学科不存在")
    q_count = db.query(Question).filter(Question.subject_id == subject_id, Question.is_deleted == False).count()
    if q_count > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"该学科下还有 {q_count} 道错题，请先删除所有错题后再删除学科")
    subject_service.delete_subject(db, s)


@router.post("/subjects/{subject_id}/types", response_model=QuestionTypeOut, status_code=status.HTTP_201_CREATED)
def create_type(subject_id: int, req: QuestionTypeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学科不存在")
    existing = db.query(QuestionType).filter(QuestionType.subject_id == subject_id, QuestionType.name == req.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该学科下已存在相同名称的题型")
    qt = subject_service.create_question_type(db, current_user.id, subject_id, req.name)
    return QuestionTypeOut.model_validate(qt)


@router.put("/types/{type_id}", response_model=QuestionTypeOut)
def update_type(type_id: int, req: QuestionTypeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    qt = db.query(QuestionType).filter(QuestionType.id == type_id, QuestionType.user_id == current_user.id).first()
    if not qt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题型不存在")
    qt = subject_service.update_question_type(db, qt, req.name)
    return QuestionTypeOut.model_validate(qt)


@router.delete("/types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_type(type_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    qt = db.query(QuestionType).filter(QuestionType.id == type_id, QuestionType.user_id == current_user.id).first()
    if not qt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题型不存在")
    q_count = db.query(Question).filter(Question.question_type_id == type_id, Question.is_deleted == False).count()
    if q_count > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"该题型下还有 {q_count} 道错题，请先删除所有错题后再删除题型")
    subject_service.delete_question_type(db, qt)
