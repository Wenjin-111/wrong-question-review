from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class Question(Base):
    __tablename__ = "question"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subject.id", ondelete="RESTRICT"), nullable=False)
    question_type_id = Column(Integer, ForeignKey("question_type.id", ondelete="RESTRICT"), nullable=False)
    content = Column(Text, nullable=False)
    content_plain = Column(Text, nullable=True)
    answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    tags = relationship("Tag", secondary="question_tag", backref="questions")
