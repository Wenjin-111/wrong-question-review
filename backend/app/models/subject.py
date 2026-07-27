from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class Subject(Base):
    __tablename__ = "subject"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    color = Column(String(7), default="#007AFF")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    question_types = relationship("QuestionType", back_populates="subject", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("user_id", "name"),)
