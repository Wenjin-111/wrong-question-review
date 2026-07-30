import uuid

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func

from app.database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(20), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    token_version = Column(Integer, nullable=False, default=0)
    token_family = Column(String(36), nullable=False, default=lambda: uuid.uuid4().hex)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
