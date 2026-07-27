from sqlalchemy import Column, Integer, Enum, DateTime, ForeignKey, JSON, func

from app.database import Base


class ReviewSession(Base):
    __tablename__ = "review_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    review_mode = Column(Enum("free", "spaced"), nullable=False)
    subject_ids = Column(JSON, nullable=False)
    total_count = Column(Integer, nullable=False)
    correct_count = Column(Integer, nullable=False, default=0)
    wrong_count = Column(Integer, nullable=False, default=0)
    started_at = Column(DateTime, nullable=False, server_default=func.now())
    finished_at = Column(DateTime, nullable=True)
