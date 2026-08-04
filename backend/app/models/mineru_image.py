from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func

from app.database import Base


class MineruImage(Base):
    """MinerU 解析产物图片的归属记录（文件本身为共享去重存储，此表记录"哪个用户解析出了它"）。"""

    __tablename__ = "mineru_image"
    __table_args__ = (UniqueConstraint("user_id", "file_name", name="uq_mineru_image_user_file"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
