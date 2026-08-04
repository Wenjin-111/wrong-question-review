"""MinerU OCR 引擎端到端测试：图片识别 + PDF 全流程导入，校验 Markdown 输出。

用法:
    cd backend && .venv\\Scripts\\python.exe ..\\tests\\test_mineru_ocr.py
环境变量:
    MINERU_TEST_TOKEN  MinerU API token（必填，勿硬编码）
依赖后端已运行: uvicorn app.main:app --port 8000
"""
import os
import sys
import time
import uuid

import httpx
from PIL import Image, ImageDraw, ImageFont

BASE = "http://localhost:8000/api"
FONT_PATH = "C:/Windows/Fonts/msyh.ttc"


def test_archive_images_unit() -> None:
    """单元验证（无需 token）: MinerU 解析包图片提取 + markdown 引用改写为 /uploads/ 可访问 URL。"""
    import io
    import zipfile

    sys.path.insert(0, os.getcwd())  # 从 backend 目录运行时导入 app 包
    from app.services.mineru_ocr import _process_archive

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("full.md", "题干\n\n![](images/abc123.jpg)\n\n![图](images/def456.png)")
        z.writestr("images/abc123.jpg", b"fake-jpg-bytes")
        z.writestr("images/def456.png", b"fake-png-bytes")
    buf.seek(0)

    text, files = _process_archive(buf.getvalue())
    assert "/uploads/mineru/abc123.jpg" in text, f"引用未改写: {text}"
    assert "/uploads/mineru/def456.png" in text, f"引用未改写: {text}"
    assert "images/abc123.jpg" not in text, "旧引用未替换干净"
    assert set(files) == {"abc123.jpg", "def456.png"}, files
    for f in files:
        path = os.path.join("uploads", "mineru", f)
        assert os.path.exists(path), f"图片未落盘: {path}"
        with open(path, "rb") as fh:
            assert fh.read(), f"图片内容为空: {path}"
        os.remove(path)
    print("✓ 图片提取单测通过: 2 张图片落盘, markdown 引用已改写")


def make_test_image(path: str) -> None:
    """画一张带公式的中文数学题图片，用于验证 OCR 效果。"""
    font = ImageFont.truetype(FONT_PATH, 28)
    img = Image.new("RGB", (760, 240), "white")
    d = ImageDraw.Draw(img)
    lines = [
        "已知函数 f(x) = x2 - 4x + 3，求 f(2) 的值。",
        "A. -1    B. 1    C. 3    D. 5",
    ]
    y = 45
    for line in lines:
        d.text((40, y), line, font=font, fill="black")
        y += 65
    img.save(path)


def make_test_pdf(path: str) -> None:
    """生成一页带中文题目的 PDF（PIL 图片转 PDF）。"""
    font = ImageFont.truetype(FONT_PATH, 26)
    img = Image.new("RGB", (900, 500), "white")
    d = ImageDraw.Draw(img)
    lines = [
        "期中测试卷",
        "1. 计算: 12 + 3 × 5 = ?",
        "2. 已知 a = 4, b = 7, 求 a + b 的值。",
    ]
    y = 60
    for line in lines:
        d.text((50, y), line, font=font, fill="black")
        y += 80
    img.save(path, "PDF", resolution=120)


def main() -> int:
    test_archive_images_unit()
    token = os.environ.get("MINERU_TEST_TOKEN", "").strip()
    if not token:
        print("错误: 请设置 MINERU_TEST_TOKEN 环境变量")
        return 1

    username = f"mineru_test_{uuid.uuid4().hex[:6]}"
    base_dir = os.path.dirname(os.path.abspath(__file__))
    img_path = os.path.join(base_dir, "_mineru_test.png")
    pdf_path = os.path.join(base_dir, "_mineru_test.pdf")
    make_test_image(img_path)
    make_test_pdf(pdf_path)

    try:
        with httpx.Client(base_url=BASE, timeout=600, trust_env=False) as c:
            # 1. 注册临时测试账号
            r = c.post("/auth/register", json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "Test1234!",
                "confirm_password": "Test1234!",
            })
            assert r.status_code == 201, f"注册失败: {r.status_code} {r.text}"
            access = r.json()["access_token"]
            h = {"Authorization": f"Bearer {access}"}

            # 2. 配置 MinerU token
            r = c.put("/settings/mineru-token", headers=h, json={"token": token})
            assert r.status_code == 200, f"配置 token 失败: {r.status_code} {r.text}"
            r = c.get("/settings/mineru-token", headers=h)
            assert r.json().get("configured") is True, f"token 未生效: {r.text}"
            print("① 测试账号已注册，MinerU token 已配置")

            # 3. 上传测试图片
            with open(img_path, "rb") as f:
                r = c.post("/upload/image", headers=h,
                           files={"file": ("test.png", f, "image/png")})
            assert r.status_code == 200, f"上传失败: {r.status_code} {r.text}"
            file_id = r.json()["file_id"]
            print(f"② 测试图片已上传, file_id={file_id}")

            # 4. MinerU OCR 识别（同步等待，可能 10~60s）
            t0 = time.perf_counter()
            r = c.post("/ocr/recognize", headers=h,
                       json={"image_file_id": file_id, "engine": "mineru"})
            wall = time.perf_counter() - t0
            assert r.status_code == 200, f"识别失败: {r.status_code} {r.text}"
            data = r.json()
            print(f"③ MinerU 图片解析完成: elapsed={data.get('elapsed')}s, 接口总耗时={wall:.1f}s")
            print("--- raw_text ---")
            print(data["raw_text"])
            assert data["raw_text"].strip(), "OCR 返回空文本"
            assert "f(" in data["raw_text"] and "A" in data["raw_text"], "识别内容缺少题目要素"

            # 5. PDF 全流程（mineru 分支: 直接上传 PDF → Markdown → AI 解析兜底）
            with open(pdf_path, "rb") as f:
                r = c.post("/pdf/ocr", headers=h,
                           files={"file": ("test.pdf", f, "application/pdf")},
                           data={"engine": "mineru"})
            assert r.status_code == 200, f"PDF 识别失败: {r.status_code} {r.text}"
            pdf_data = r.json()
            print(f"④ MinerU PDF 解析完成: mineru耗时={pdf_data.get('timing', {}).get('mineru')}s, "
                  f"page_count={pdf_data.get('page_count')}")
            print("--- PDF raw_text ---")
            print(pdf_data["raw_text"][:300])
            assert pdf_data["raw_text"].strip(), "PDF 解析返回空文本"
            assert "期中测试" in pdf_data["raw_text"], "PDF 解析内容缺失"
            assert pdf_data.get("page_count") is None, "mineru 模式 page_count 应为 null"
            assert pdf_data.get("questions"), "PDF 解析后未生成题目"
            assert pdf_data["questions"][0].get("question"), "PDF 题目内容为空"
    finally:
        for p in (img_path, pdf_path):
            if os.path.exists(p):
                os.remove(p)

    print("PASS: MinerU OCR 端到端测试通过（图片识别 + PDF 全流程）")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
