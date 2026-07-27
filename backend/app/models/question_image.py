from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func

from app.database import Base


class QuestionImage(Base):
    __tablename__ = "question_image"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="SET NULL"), nullable=True)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    original_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
