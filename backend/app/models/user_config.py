from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, func

from app.database import Base


class UserConfig(Base):
    __tablename__ = "user_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    config_key = Column(String(50), nullable=False)
    config_value = Column(Text, nullable=False)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("user_id", "config_key"),)
