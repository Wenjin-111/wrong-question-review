from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.tag import Tag
from app.schemas.tag import TagOut, TagCreate, TagUpdate
from app.services import tag_service

router = APIRouter(prefix="/api", tags=["tags"])


@router.get("/tags", response_model=list[TagOut])
def list_tags(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tags = tag_service.get_tags(db, current_user.id)
    return [TagOut.model_validate(t) for t in tags]


@router.post("/tags", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(req: TagCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Tag).filter(Tag.user_id == current_user.id, Tag.name == req.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="标签名称已存在")
    tag = tag_service.create_tag(db, current_user.id, req.name, req.color)
    return TagOut.model_validate(tag)


@router.put("/tags/{tag_id}", response_model=TagOut)
def update_tag(tag_id: int, req: TagUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签不存在")
    tag = tag_service.update_tag(db, tag, req.name, req.color)
    return TagOut.model_validate(tag)


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签不存在")
    tag_service.delete_tag(db, tag)
