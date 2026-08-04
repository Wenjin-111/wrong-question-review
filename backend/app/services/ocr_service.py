import logging
import os
import time

from PIL import Image

logger = logging.getLogger(__name__)


def _load_image(image_path: str, crop: dict | None, rotation: int):
    img = Image.open(image_path)
    if rotation:
        img = img.rotate(-rotation, expand=True)
    if crop:
        img = img.crop((crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"]))
    return img


def _ocr_hunyuan(image) -> dict:
    """HunyuanOCR: 本地模型推理（懒加载），返回 Markdown 格式文本。"""
    from app.services.hunyuan_ocr import hunyuan_ocr

    return hunyuan_ocr(image)


def _ocr_mineru(image, token: str) -> dict:
    """MinerU: 在线 API 解析（图片 → Markdown），需用户配置 token。"""
    import tempfile

    from app.services.mineru_ocr import parse_file

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        image.save(tmp_path)
        result = parse_file(tmp_path, token)
    finally:
        os.remove(tmp_path)
    result["blocks"] = []
    return result


def ocr_recognize(image_path: str, crop: dict | None = None, rotation: int = 0, engine: str = "hunyuan", token: str | None = None) -> dict:
    """OCR 识别，支持 hunyuan（本地 HunyuanOCR，默认）和 mineru（MinerU 在线 API）两种引擎。"""
    img = _load_image(image_path, crop, rotation)

    if engine == "mineru":
        if not token:
            raise RuntimeError("未配置 MinerU token，请在设置页配置")
        return _ocr_mineru(img, token)
    return _ocr_hunyuan(img)


def pdf_to_images(file_path: str, max_pages: int = 30) -> list:
    """将 PDF 每页渲染为 PIL Image 列表。"""
    import fitz

    doc = fitz.open(file_path)
    images = []
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        images.append(img)
    doc.close()
    return images


def extract_pdf(file_path: str) -> dict:
    import fitz

    doc = fitz.open(file_path)
    pages = []
    for i, page in enumerate(doc):
        if i >= 200:
            break
        text = page.get_text()
        pages.append({"page_num": i + 1, "text": text, "images": []})
    doc.close()
    return {"pages": pages}
