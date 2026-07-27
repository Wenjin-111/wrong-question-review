from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class QuestionType(Base):
    __tablename__ = "question_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subject.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    subject = relationship("Subject", back_populates="question_types")

    __table_args__ = (UniqueConstraint("subject_id", "name"),)
