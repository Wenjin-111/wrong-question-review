from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, func

from app.database import Base


class Tag(Base):
    __tablename__ = "tag"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(30), nullable=False)
    color = Column(String(7), default="#007AFF")
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "name"),)
