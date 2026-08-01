import logging
import time

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_ocr_instance = None


def _get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        from paddleocr import PaddleOCR
        _ocr_instance = PaddleOCR(lang="ch", use_gpu=False)
    return _ocr_instance


def _load_image(image_path: str, crop: dict | None, rotation: int):
    img = Image.open(image_path)
    if rotation:
        img = img.rotate(-rotation, expand=True)
    if crop:
        img = img.crop((crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"]))
    return img


def _ocr_paddle(image) -> dict:
    """PaddleOCR: 本地 CPU 推理，返回逐块结果。"""
    ocr = _get_ocr()
    img_array = np.array(image)
    t0 = time.perf_counter()
    results = ocr.ocr(img_array, cls=False)
    elapsed = round(time.perf_counter() - t0, 2)

    blocks = []
    if results and results[0]:
        for item in results[0]:
            if len(item) == 2:
                bbox, (text, confidence) = item
            else:
                text = getattr(item, "text", "")
                confidence = getattr(item, "confidence", 0)
                bbox = getattr(item, "bbox", [])
            blocks.append({"text": str(text), "confidence": round(float(confidence), 4), "bbox": bbox if isinstance(bbox, list) else []})

    raw_text = "\n".join(b["text"] for b in blocks if b["text"].strip())
    return {"raw_text": raw_text, "blocks": blocks, "elapsed": elapsed}


def _ocr_hunyuan(image) -> dict:
    """HunyuanOCR: 本地模型推理（懒加载），返回 Markdown 格式文本。"""
    from app.services.hunyuan_ocr import hunyuan_ocr

    return hunyuan_ocr(image)


def ocr_recognize(image_path: str, crop: dict | None = None, rotation: int = 0, engine: str = "hunyuan") -> dict:
    """OCR 识别，支持 paddle（本地 PaddleOCR）和 hunyuan（本地 HunyuanOCR 模型）两种引擎。"""
    img = _load_image(image_path, crop, rotation)

    if engine == "hunyuan":
        return _ocr_hunyuan(img)
    else:
        return _ocr_paddle(img)


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
