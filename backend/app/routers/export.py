import os
import json
import re
import uuid
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.review_record import ReviewRecord

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportRequest(BaseModel):
    format: str = "json"
    question_ids: list[int] | None = None
    subject_ids: list[int] | None = None
    mode: str = "full"  # full | exam (PDF only)


@router.post("/data")
def export_data(req: ExportRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Question).filter(Question.user_id == current_user.id, Question.is_deleted == False)
    if req.question_ids:
        q = q.filter(Question.id.in_(req.question_ids))
    if req.subject_ids:
        q = q.filter(Question.subject_id.in_(req.subject_ids))
    questions = q.all()

    if req.format in ("json", "json_with_images"):
        return _export_json(db, current_user, questions, req.format)

    if req.format == "pdf":
        return _export_pdf(questions, req.mode)

    raise HTTPException(status_code=400, detail="不支持的格式")


def _export_json(db: Session, user: User, questions: list[Question], fmt: str):
    records = db.query(ReviewRecord).filter(ReviewRecord.user_id == user.id).all()
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "user": {"username": user.username, "email": user.email},
        "questions": [],
        "review_records": [],
    }
    for q in questions:
        data["questions"].append({
            "id": q.id, "subject_id": q.subject_id, "question_type_id": q.question_type_id,
            "content": q.content, "answer": q.answer, "explanation": q.explanation,
            "source": q.source, "created_at": q.created_at.isoformat(),
        })
    for r in records:
        data["review_records"].append({
            "question_id": r.question_id, "is_correct": r.is_correct,
            "user_answer": r.user_answer, "review_mode": r.review_mode,
            "sr_stage": r.sr_stage, "sr_next_review": r.sr_next_review.isoformat() if r.sr_next_review else None,
            "created_at": r.created_at.isoformat(),
        })

    if fmt == "json":
        return Response(content=json.dumps(data, ensure_ascii=False, indent=2), media_type="application/json",
                        headers={"Content-Disposition": "attachment; filename=export.json"})

    if fmt == "json_with_images":
        temp_dir = os.path.join(settings.UPLOAD_ROOT, "temp")
        os.makedirs(temp_dir, exist_ok=True)
        zip_name = f"export_{uuid.uuid4().hex[:8]}.zip"
        zip_path = os.path.join(temp_dir, zip_name)
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("data.json", json.dumps(data, ensure_ascii=False, indent=2))
            for q in questions:
                urls = re.findall(r'src="(/uploads/[^"]+)"', q.content or "")
                for url in urls:
                    img_path = os.path.join(settings.UPLOAD_ROOT, url.replace("/uploads/", ""))
                    if os.path.exists(img_path):
                        zf.write(img_path, os.path.join("images", os.path.basename(img_path)))
        return FileResponse(zip_path, filename=zip_name, media_type="application/zip")


def _export_pdf(questions: list[Question], mode: str = "full"):
    from weasyprint import HTML
    html = _build_pdf_html(questions, mode == "exam")
    temp_dir = os.path.join(settings.UPLOAD_ROOT, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    pdf_name = f"export_{uuid.uuid4().hex[:8]}.pdf"
    pdf_path = os.path.join(temp_dir, pdf_name)
    HTML(string=html).write_pdf(pdf_path)
    return FileResponse(pdf_path, filename="错题导出.pdf", media_type="application/pdf")


def _build_pdf_html(questions: list[Question], exam_mode: bool) -> str:
    items_html = ""
    for i, q in enumerate(questions, 1):
        content = _strip_html(q.content)
        answer = ""
        try:
            ans = json.loads(q.answer)
            if ans.get("options"):
                answer = "；".join(ans["options"])
            elif ans.get("blanks"):
                answer = "；".join(ans["blanks"])
            elif ans.get("reference"):
                answer = _strip_html(ans["reference"])
        except (json.JSONDecodeError, TypeError):
            answer = q.answer

        explanation = _strip_html(q.explanation or "")

        items_html += f'<div class="question"><h3>第{i}题</h3><p>{content}</p>'
        if exam_mode:
            items_html += '<div class="answer-area" style="min-height:80px;border:1px dashed #ccc;margin:16px 0;"></div>'
        else:
            items_html += f'<div class="answer"><strong>答案：</strong>{answer}</div>'
            if explanation:
                items_html += f'<div class="explanation"><strong>解析：</strong>{explanation}</div>'
        items_html += '</div>'

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body {{ font-family: 'SimSun', serif; font-size: 14px; line-height: 1.8; padding: 40px; color: #1D1D1F; }}
h1 {{ text-align: center; font-size: 22px; margin-bottom: 24px; }}
h3 {{ font-size: 16px; margin: 0 0 8px; }}
.question {{ margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #eee; }}
.answer {{ color: #34C759; margin-top: 8px; }}
.explanation {{ color: #007AFF; margin-top: 4px; font-size: 13px; }}
.answer-area {{ }}
@media print {{ body {{ padding: 20px; }} }}
</style></head><body>
<h1>{'错题试卷' if exam_mode else '错题集'}</h1>
{items_html}
</body></html>"""


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html).replace("&nbsp;", " ").strip()
