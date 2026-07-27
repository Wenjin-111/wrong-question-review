from sqlalchemy import Column, Integer, ForeignKey

from app.database import Base


class QuestionTag(Base):
    __tablename__ = "question_tag"

    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True)
