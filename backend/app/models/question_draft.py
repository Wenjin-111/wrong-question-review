from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func

from app.database import Base


class QuestionDraft(Base):
    __tablename__ = "question_draft"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, nullable=True)
    question_type_id = Column(Integer, nullable=True)
    content = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)
    tag_ids = Column(JSON, nullable=True)
    ocr_text = Column(Text, nullable=True)
    ai_parse_result = Column(JSON, nullable=True)
    image_file_id = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, nullable=False, server_default=func.now())
