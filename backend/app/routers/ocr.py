import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.question_image import QuestionImage
from app.services.ocr_service import ocr_recognize, extract_pdf
from app.services.ai_service import parse_question_text

router = APIRouter(prefix="/api", tags=["ocr"])


class RecognizeRequest(BaseModel):
    image_file_id: int
    crop: dict | None = None
    rotation: int = 0


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
    import traceback
    try:
        result = ocr_recognize(image_path, req.crop, req.rotation)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OCR 识别失败: {str(e)}")


@router.post("/ocr/parse")
async def parse_ocr(req: ParseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    api_url = _get_user_ai_config(db, current_user.id, "ai_api_url")
    api_key = _get_user_ai_config(db, current_user.id, "ai_api_key")
    model = _get_user_ai_config(db, current_user.id, "ai_model")

    if not api_url or not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请先在设置中配置 AI API")

    from app.utils.security import decrypt_api_key
    try:
        result = await parse_question_text(api_url, decrypt_api_key(api_key), model or "gpt-4o", req.ocr_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI 解析失败: {str(e)}")


@router.post("/pdf/extract")
async def extract_pdf_text(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="请上传 PDF 文件")
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF 大小不能超过 50MB")

    tmp_dir = os.path.join(settings.UPLOAD_ROOT, "temp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf")
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


def _get_user_ai_config(db: Session, user_id: int, key: str) -> str | None:
    from app.models.user_config import UserConfig
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id, UserConfig.config_key == key).first()
    return config.config_value if config else None
