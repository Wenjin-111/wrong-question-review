from sqlalchemy import Column, Integer, Date, ForeignKey, UniqueConstraint

from app.database import Base


class DailyStreak(Base):
    __tablename__ = "daily_streak"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    review_count = Column(Integer, nullable=False, default=0)

    __table_args__ = (UniqueConstraint("user_id", "date"),)
