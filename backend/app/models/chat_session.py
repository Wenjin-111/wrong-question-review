from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func

from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
