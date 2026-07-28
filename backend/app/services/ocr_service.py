import os

from app.config import settings

_ocr_instance = None


def _get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        from paddleocr import PaddleOCR
        _ocr_instance = PaddleOCR(lang="ch", use_gpu=False)
    return _ocr_instance


def ocr_recognize(image_path: str, crop: dict | None = None, rotation: int = 0) -> dict:
    from PIL import Image

    img = Image.open(image_path)
    if rotation:
        img = img.rotate(-rotation, expand=True)
    if crop:
        img = img.crop((crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"]))

    ocr = _get_ocr()
    import numpy as np
    img_array = np.array(img)
    results = ocr.ocr(img_array, cls=False)

    blocks = []
    if results and results[0]:
        for item in results[0]:
            if len(item) == 2:
                # PaddleOCR v2 format: (bbox, (text, confidence))
                bbox, (text, confidence) = item
            else:
                # PaddleOCR v3 format: OCRResult object
                text = getattr(item, "text", "")
                confidence = getattr(item, "confidence", 0)
                bbox = getattr(item, "bbox", [])
            blocks.append({"text": str(text), "confidence": round(float(confidence), 4), "bbox": bbox if isinstance(bbox, list) else []})

    raw_text = "\n".join(b["text"] for b in blocks if b["text"].strip())
    return {"raw_text": raw_text, "blocks": blocks}


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
