from sqlalchemy.orm import Session

from app.models.tag import Tag


def get_tags(db: Session, user_id: int) -> list[Tag]:
    return db.query(Tag).filter(Tag.user_id == user_id).order_by(Tag.created_at).all()


def create_tag(db: Session, user_id: int, name: str, color: str) -> Tag:
    tag = Tag(user_id=user_id, name=name, color=color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag: Tag, name: str | None, color: str | None) -> Tag:
    if name is not None:
        tag.name = name
    if color is not None:
        tag.color = color
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag: Tag):
    db.delete(tag)
    db.commit()
