import uuid

from sqlalchemy.orm import Session
from jose import JWTError

from app.models.user import User
from app.utils.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password


def register_user(db: Session, username: str, email: str, password: str) -> User:
    user = User(username=username, email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, login: str, password: str) -> User | None:
    user = db.query(User).filter(
        (User.username == login) | (User.email == login),
        User.is_active == True,
    ).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def generate_tokens(user_id: int, token_version: int, token_family: str) -> dict:
    return {
        "access_token": create_access_token(user_id, token_version, token_family),
        "refresh_token": create_refresh_token(user_id, token_version, token_family),
    }


def refresh_access_token(token: str, db: Session) -> tuple[str, str] | None:
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            return None
        user_id = int(payload["sub"])
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            return None
        if payload.get("ver") != user.token_version:
            return None
        if payload.get("fam") != user.token_family:
            return None
        user.token_version += 1
        db.commit()
        new_access = create_access_token(user_id, user.token_version, user.token_family)
        new_refresh = create_refresh_token(user_id, user.token_version, user.token_family)
        return new_access, new_refresh
    except (JWTError, ValueError, TypeError):
        return None


def revoke_user_tokens(user: User, db: Session) -> None:
    """登出时吊销所有 token：更新 token_family 使所有已签发的 token 立即失效。"""
    user.token_family = uuid.uuid4().hex
    user.token_version += 1
    db.commit()
