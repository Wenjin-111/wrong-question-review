import base64
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENCRYPTION_KEY: str = ""
    UPLOAD_ROOT: str = "uploads"
    CORS_ORIGINS: str = "http://localhost:5173"
    HUNYUAN_MODEL_DIR: str = "D:/AI_code/hunyuanOCR/HunyuanOCR"
    DEBUG: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}

    def validate(self) -> None:
        """校验所有必需配置项，缺失或无效则启动失败。"""
        errors: list[str] = []

        if not self.DATABASE_URL:
            errors.append("DATABASE_URL 未配置，请在 .env 文件中设置数据库连接地址")

        if not self.JWT_SECRET or self.JWT_SECRET == "change-me-in-production":
            errors.append(
                "JWT_SECRET 未配置或仍为不安全默认值，"
                "请生成随机密钥: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )

        if not self.ENCRYPTION_KEY:
            errors.append(
                "ENCRYPTION_KEY 未配置，"
                "请生成: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        else:
            try:
                key = self.ENCRYPTION_KEY.encode()
                if len(base64.urlsafe_b64decode(key)) != 32:
                    errors.append("ENCRYPTION_KEY 解码后必须为 32 字节")
            except Exception:
                errors.append("ENCRYPTION_KEY 不是有效的 Fernet 密钥")

        if errors:
            raise ValueError(
                "配置校验失败，请检查 .env 文件:\n  " + "\n  ".join(errors)
            )


settings = Settings()
settings.validate()
