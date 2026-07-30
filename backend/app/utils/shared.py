import re

from sqlalchemy.orm import Session


def strip_html(html: str) -> str:
    """Strip HTML tags, returning plain text."""
    clean = re.sub(r"<[^>]+>", " ", html or "")
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def get_user_config(db: Session, user_id: int, key: str) -> str | None:
    from app.models.user_config import UserConfig

    config = (
        db.query(UserConfig)
        .filter(UserConfig.user_id == user_id, UserConfig.config_key == key)
        .first()
    )
    return config.config_value if config else None
