from sqlalchemy import Column, Integer, Boolean, String, Enum, DateTime, ForeignKey, func

from app.database import Base


class ReviewRecord(Base):
    __tablename__ = "review_record"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("review_session.id", ondelete="SET NULL"), nullable=True)
    is_correct = Column(Boolean, nullable=False)
    user_answer = Column(String(2000), nullable=True)
    review_mode = Column(Enum("free", "spaced", "select"), nullable=False)
    sr_stage = Column(Integer, nullable=True)
    sr_next_review = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
