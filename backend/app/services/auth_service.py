from sqlalchemy.orm import Session

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


def generate_tokens(user_id: int) -> dict:
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
    }


def refresh_access_token(token: str) -> str | None:
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            return None
        return create_access_token(int(payload["sub"]))
    except Exception:
        return None
