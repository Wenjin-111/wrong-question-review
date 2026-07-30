from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint, func

from app.database import Base


class FsrsState(Base):
    """Per-question-per-user FSRS memory state."""

    __tablename__ = "fsrs_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=False)
    stability = Column(Float, nullable=False, default=0.5)
    difficulty = Column(Float, nullable=False, default=0.5)
    reps = Column(Integer, nullable=False, default=0)
    state = Column(Integer, nullable=False, default=0)  # 0=new, 2=review
    last_review_at = Column(DateTime, nullable=True)
    next_review_at = Column(DateTime, nullable=True)

    __table_args__ = (UniqueConstraint("user_id", "question_id"),)
