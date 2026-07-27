from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.chat_session import ChatSession
from app.models.ai_chat_message import AiChatMessage
from app.services.ai_service import call_ai

router = APIRouter(prefix="/api/chat", tags=["ai_chat"])


class SendMessageRequest(BaseModel):
    message: str


class CreateSessionRequest(BaseModel):
    question_id: int


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        q = db.query(Question).filter(Question.id == s.question_id).first()
        last_msg = (
            db.query(AiChatMessage)
            .filter(AiChatMessage.session_id == s.id, AiChatMessage.role != "system")
            .order_by(AiChatMessage.created_at.desc())
            .first()
        )
        result.append({
            "id": s.id,
            "question_id": s.question_id,
            "title": s.title or ((q.content_plain or q.content)[:50] if q else "未知题目"),
            "question_preview": (q.content_plain or "")[:80] if q else "",
            "last_message": last_msg.content[:80] if last_msg else "",
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        })
    return result


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(req: CreateSessionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Question).filter(Question.id == req.question_id, Question.user_id == current_user.id).first()
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")

    title = (q.content_plain or q.content or "")[:50]
    session = ChatSession(user_id=current_user.id, question_id=req.question_id, title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "question_id": session.question_id, "title": session.title}


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="会话不存在")
    db.delete(s)
    db.commit()


@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="会话不存在")
    messages = (
        db.query(AiChatMessage)
        .filter(AiChatMessage.session_id == session_id, AiChatMessage.role != "system")
        .order_by(AiChatMessage.created_at)
        .all()
    )
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]


@router.post("/sessions/{session_id}/send")
async def send_message(session_id: int, req: SendMessageRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="会话不存在")

    question = db.query(Question).filter(Question.id == s.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    api_url = _get_config(db, current_user.id, "ai_api_url")
    api_key = _get_config(db, current_user.id, "ai_api_key")
    model = _get_config(db, current_user.id, "ai_model") or "gpt-4o"

    if not api_url or not api_key:
        raise HTTPException(status_code=400, detail="请先在设置中配置 AI API")

    from app.utils.security import decrypt_api_key
    decrypted_key = decrypt_api_key(api_key)

    history = (
        db.query(AiChatMessage)
        .filter(AiChatMessage.session_id == session_id)
        .order_by(AiChatMessage.created_at)
        .all()
    )

    uid = current_user.id
    qid = s.question_id
    sid = session_id

    api_messages = []
    if not history:
        system_prompt = f"用户正在复习一道错题。题目内容：{question.content} 正确答案：{question.answer} 解析：{question.explanation or '无'}。请以答疑老师的身份帮助用户理解这道题目涉及的知识点。"
        api_messages.append({"role": "system", "content": system_prompt})
        db.add(AiChatMessage(user_id=uid, question_id=qid, session_id=sid, role="system", content=system_prompt))

    for m in history:
        api_messages.append({"role": m.role, "content": m.content})

    db.add(AiChatMessage(user_id=uid, question_id=qid, session_id=sid, role="user", content=req.message))
    api_messages.append({"role": "user", "content": req.message})
    s.updated_at = datetime.utcnow()
    db.commit()

    async def generate():
        full = ""
        try:
            stream = await call_ai(api_url, decrypted_key, model, api_messages, stream=True)
            if hasattr(stream, "__aiter__"):
                async for chunk in stream:
                    if chunk is None:
                        continue
                    full += chunk
                    yield f"data: {chunk}\n\n"

                if full:
                    from app.database import SessionLocal
                    save_db = SessionLocal()
                    try:
                        save_db.add(AiChatMessage(user_id=uid, question_id=qid, session_id=sid, role="assistant", content=full))
                        save_db.commit()
                    finally:
                        save_db.close()

                yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


def _get_config(db: Session, user_id: int, key: str) -> str | None:
    from app.models.user_config import UserConfig
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id, UserConfig.config_key == key).first()
    return config.config_value if config else None
