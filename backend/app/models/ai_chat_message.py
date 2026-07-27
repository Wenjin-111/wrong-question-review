from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, func

from app.database import Base


class AiChatMessage(Base):
    __tablename__ = "ai_chat_message"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("chat_session.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum("user", "assistant", "system"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
