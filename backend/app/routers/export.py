import os
import json
import re
import uuid
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, FileResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.review_record import ReviewRecord
from app.utils.shared import strip_html

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportRequest(BaseModel):
    format: str = "json"
    question_ids: list[int] | None = None
    subject_ids: list[int] | None = None
    mode: str = "full"


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
    qids = [q.id for q in questions]
    records = db.query(ReviewRecord).filter(ReviewRecord.question_id.in_(qids)).all() if qids else []
    data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
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
            "sr_stage": r.sr_stage,
            "sr_next_review": r.sr_next_review.isoformat() if r.sr_next_review else None,
            "created_at": r.created_at.isoformat(),
        })

    if fmt == "json":
        return Response(
            content=json.dumps(data, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=export.json"},
        )

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

        # Use a background cleanup after response is sent
        return _cleanup_file_response(zip_path, zip_name, "application/zip")


def _find_cjk_font() -> str | None:
    """Find an available CJK font file on the system."""
    windir = os.environ.get("WINDIR", "C:\\Windows")
    candidates = [
        os.path.join(windir, "Fonts", "simhei.ttf"),
        os.path.join(windir, "Fonts", "msyh.ttc"),
        os.path.join(windir, "Fonts", "simsun.ttc"),
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def _format_answer(answer_raw) -> str:
    try:
        ans = json.loads(answer_raw)
        if ans.get("options"):
            return "；".join(ans["options"])
        elif ans.get("blanks"):
            return "；".join(ans["blanks"])
        elif ans.get("reference"):
            return strip_html(ans["reference"])
    except (json.JSONDecodeError, TypeError):
        pass
    return str(answer_raw) if answer_raw else ""


def _export_pdf(questions: list[Question], mode: str = "full"):
    font_path = _find_cjk_font()
    if not font_path:
        raise HTTPException(status_code=500, detail="未找到中文字体，无法生成PDF。请安装中文字体后重试。")

    exam_mode = mode == "exam"
    pdf = _build_pdf(questions, exam_mode, font_path)

    temp_dir = os.path.join(settings.UPLOAD_ROOT, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    pdf_name = f"export_{uuid.uuid4().hex[:8]}.pdf"
    pdf_path = os.path.join(temp_dir, pdf_name)
    pdf.output(pdf_path)

    return _cleanup_file_response(pdf_path, "错题导出.pdf", "application/pdf")


def _cleanup_file_response(file_path: str, filename: str, media_type: str):
    def cleanup():
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass

    return FileResponse(
        file_path,
        filename=filename,
        media_type=media_type,
        background=BackgroundTask(cleanup),
    )


def _build_pdf(questions: list[Question], exam_mode: bool, font_path: str):
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("cjk", "", font_path, uni=True)
    title = "错题试卷" if exam_mode else "错题集"

    for i, q in enumerate(questions, 1):
        pdf.add_page()

        pdf.set_font("cjk", "", 20)
        pdf.cell(0, 12, title, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(6)

        pdf.set_font("cjk", "", 13)
        pdf.cell(0, 8, f"第{i}题", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

        content = strip_html(q.content or "")
        pdf.set_font("cjk", "", 11)
        pdf.multi_cell(0, 6.5, content)
        pdf.ln(6)

        if exam_mode:
            y = pdf.get_y()
            box_w = pdf.w - pdf.l_margin - pdf.r_margin
            box_h = 70
            if y + box_h > pdf.h - pdf.b_margin:
                pdf.add_page()
                y = pdf.get_y()
            pdf.set_draw_color(180, 180, 180)
            pdf.set_line_width(0.3)
            pdf.rect(pdf.l_margin, y, box_w, box_h, style="D")
            pdf.ln(box_h + 10)
        else:
            answer_text = _format_answer(q.answer)
            pdf.set_font("cjk", "", 11)
            pdf.set_text_color(52, 199, 89)
            pdf.cell(0, 6.5, f"答案：{answer_text}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(29, 29, 31)
            pdf.ln(6)

            explanation = strip_html(q.explanation or "")
            if explanation:
                pdf.set_font("cjk", "", 11)
                pdf.set_text_color(0, 122, 255)
                pdf.multi_cell(0, 6.5, f"解析：{explanation}")
                pdf.set_text_color(29, 29, 31)

    return pdf
