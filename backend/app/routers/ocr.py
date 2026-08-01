import os
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question_image import QuestionImage
from app.services.ocr_service import ocr_recognize, extract_pdf, pdf_to_images, _ocr_hunyuan, _ocr_paddle
from app.services.ai_service import parse_question_text, parse_questions_batch
from app.utils.shared import get_user_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ocr"])

MAX_PDF_SIZE = 50 * 1024 * 1024  # 50MB


class RecognizeRequest(BaseModel):
    image_file_id: int
    crop: dict | None = None
    rotation: int = 0
    engine: str = "hunyuan"  # "hunyuan" | "paddle"


class ParseRequest(BaseModel):
    ocr_text: str


@router.post("/ocr/recognize")
def recognize(req: RecognizeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    img = db.query(QuestionImage).filter(QuestionImage.id == req.image_file_id, QuestionImage.user_id == current_user.id).first()
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在")
    image_path = os.path.join(settings.UPLOAD_ROOT, img.file_path)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片文件不存在")
    try:
        result = ocr_recognize(image_path, req.crop, req.rotation, req.engine)
        return result
    except Exception as e:
        logger.exception(f"OCR recognition failed for image {req.image_file_id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OCR 识别失败: {str(e)}")


@router.post("/ocr/parse")
async def parse_ocr(req: ParseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    api_url = get_user_config(db, current_user.id, "ai_api_url")
    api_key = get_user_config(db, current_user.id, "ai_api_key")
    model = get_user_config(db, current_user.id, "ai_model")

    if not api_url or not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请先在设置中配置 AI API")

    from app.utils.security import decrypt_api_key

    try:
        result = await parse_question_text(api_url, decrypt_api_key(api_key), model or "gpt-4o", req.ocr_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI 解析失败: {str(e)}")


@router.post("/ocr/parse-batch")
async def parse_ocr_batch(req: ParseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """AI 多题拆分解析，返回题目数组。"""
    api_url = get_user_config(db, current_user.id, "ai_api_url")
    api_key = get_user_config(db, current_user.id, "ai_api_key")
    model = get_user_config(db, current_user.id, "ai_model")

    if not api_url or not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请先在设置中配置 AI API")

    from app.utils.security import decrypt_api_key

    try:
        result = await parse_questions_batch(api_url, decrypt_api_key(api_key), model or "gpt-4o", req.ocr_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI 解析失败: {str(e)}")


@router.post("/pdf/ocr")
async def pdf_ocr(
    file: UploadFile = File(...),
    engine: str = Form("hunyuan"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PDF 导入 + OCR 识别 + AI 多题解析，全流程串联。"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="请上传 PDF 文件")
    # 读前先按 Content-Length 拦截超限文件（防超大文件整体读入内存）
    if file.size is not None and file.size > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="PDF 大小不能超过 50MB")
    contents = await file.read()
    if len(contents) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="PDF 大小不能超过 50MB")

    tmp_dir = os.path.join(settings.UPLOAD_ROOT, "temp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"{current_user.id}_{uuid.uuid4().hex[:8]}.pdf")
    with open(tmp_path, "wb") as f:
        f.write(contents)

    try:
        import time as _time
        t_total = _time.perf_counter()
        timing = {}

        # 1. PDF → 图片
        t0 = _time.perf_counter()
        images = pdf_to_images(tmp_path, max_pages=30)
        timing["pdf_to_images"] = round(_time.perf_counter() - t0, 2)
        if not images:
            raise HTTPException(status_code=400, detail="PDF 无有效页面")

        # 2. 逐页 OCR
        ocr_texts = []
        ocr_timings = []
        for i, img in enumerate(images):
            try:
                if engine == "hunyuan":
                    result = _ocr_hunyuan(img)
                else:
                    result = _ocr_paddle(img)
                ocr_texts.append(result["raw_text"])
                ocr_timings.append(result.get("elapsed", 0))
            except Exception as e:
                logger.warning(f"OCR failed for page {i + 1}: {e}")
                ocr_texts.append(f"[第 {i + 1} 页识别失败]")
                ocr_timings.append(0)
        timing["ocr_per_page"] = ocr_timings

        full_text = "\n\n".join(t for t in ocr_texts if t.strip())

        # 3. AI 解析多题
        api_url = get_user_config(db, current_user.id, "ai_api_url")
        api_key = get_user_config(db, current_user.id, "ai_api_key")
        model = get_user_config(db, current_user.id, "ai_model")

        questions = []
        if api_url and api_key:
            from app.utils.security import decrypt_api_key
            t0 = _time.perf_counter()
            try:
                result = await parse_questions_batch(api_url, decrypt_api_key(api_key), model or "gpt-4o", full_text)
                questions = result.get("questions", [])
            except Exception as e:
                logger.exception("AI parse failed in PDF OCR")
                questions = [{"question": full_text, "answer": "", "explanation": "", "type": "subjective"}]
            timing["ai_parse"] = round(_time.perf_counter() - t0, 2)
        else:
            questions = [{"question": full_text, "answer": "", "explanation": "", "type": "subjective"}]
            timing["ai_parse"] = 0

        timing["total"] = round(_time.perf_counter() - t_total, 2)
        return {"raw_text": full_text, "questions": questions, "page_count": len(images), "timing": timing}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PDF OCR failed")
        raise HTTPException(status_code=500, detail=f"PDF 处理失败: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/pdf/extract")
async def extract_pdf_text(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="请上传 PDF 文件")
    # 读前先按 Content-Length 拦截超限文件（防超大文件整体读入内存）
    if file.size is not None and file.size > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="PDF 大小不能超过 50MB")
    contents = await file.read()
    if len(contents) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="PDF 大小不能超过 50MB")

    tmp_dir = os.path.join(settings.UPLOAD_ROOT, "temp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"{current_user.id}_{uuid.uuid4().hex[:8]}.pdf")
    with open(tmp_path, "wb") as f:
        f.write(contents)

    try:
        result = extract_pdf(tmp_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 解析失败: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
