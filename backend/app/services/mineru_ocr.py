"""MinerU 精准解析在线 API — 图片/PDF 上传解析为 Markdown 文本。

流程: 申请签名上传链接 → 上传文件 → 轮询解析结果 → 下载解析包 → 读取 full.md
Token 在 https://mineru.net/apiManage/token 免费创建，按用户配置加密存储。
"""
import io
import logging
import os
import re
import time
import zipfile

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# 图片文件名只允许安全字符，防 zip 路径穿越 / 异常文件名
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]")

BASE_URL = "https://mineru.net"
API_UPLOAD_BATCH = "/api/v4/file-urls/batch"
API_RESULTS_BATCH = "/api/v4/extract-results/batch/{batch_id}"
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
POLL_INTERVAL = 3
POLL_TIMEOUT = 600
# vlm: 复杂版式/公式更准（官方推荐）；pipeline: 零幻觉、更忠实原文
DEFAULT_MODEL = "vlm"


def parse_file(file_path: str, token: str, model: str = DEFAULT_MODEL) -> dict:
    """上传单个文件到 MinerU 解析，返回 {raw_text, elapsed}。"""
    if os.path.getsize(file_path) > MAX_FILE_SIZE:
        raise RuntimeError("文件超过 MinerU 200MB 限制")

    t0 = time.perf_counter()
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    file_name = os.path.basename(file_path)

    with httpx.Client(timeout=httpx.Timeout(30, connect=15)) as client:
        # 1. 申请签名上传链接（is_ocr=True: 图片/扫描件必须开启 OCR，否则提取不到内容）
        payload = {"files": [{"name": file_name, "is_ocr": True}], "model_version": model}
        r = client.post(BASE_URL + API_UPLOAD_BATCH, headers=headers, json=payload)
        data = r.json()
        if data.get("code") != 0:
            raise RuntimeError(f"MinerU 申请上传链接失败: {data.get('msg')} (trace_id: {data.get('trace_id')})")
        batch_id = data["data"]["batch_id"]
        upload_url = data["data"]["file_urls"][0]

        # 2. 上传文件（流式，不整文件读入内存）
        with open(file_path, "rb") as f:
            r = client.put(upload_url, content=f, timeout=httpx.Timeout(600, connect=30))
        if r.status_code not in (200, 201):
            raise RuntimeError(f"{file_name} 上传失败 HTTP {r.status_code}: {r.text[:300]}")

        # 3. 轮询解析结果
        zip_url = None
        start = time.time()
        while time.time() - start < POLL_TIMEOUT:
            r = client.get(BASE_URL + API_RESULTS_BATCH.format(batch_id=batch_id), headers=headers)
            data = r.json()
            if data.get("code") != 0:
                raise RuntimeError(f"MinerU 查询结果失败: {data.get('msg')}")
            for item in data["data"]["extract_result"]:
                state = item.get("state")
                if state == "done":
                    zip_url = item.get("full_zip_url")
                elif state == "failed":
                    raise RuntimeError(f"{item.get('file_name')} 解析失败: {item.get('err_msg')}")
            if zip_url:
                break
            time.sleep(POLL_INTERVAL)
        if not zip_url:
            raise RuntimeError(f"MinerU 解析超时 ({POLL_TIMEOUT}s)")

        # 4. 下载解析包
        r = client.get(zip_url, timeout=httpx.Timeout(120, connect=30))
        r.raise_for_status()
        zip_bytes = r.content

    # 5. 提取 full.md 和 images/ 目录，改写引用，图片落盘
    raw_text, image_files = _process_archive(zip_bytes)

    return {"raw_text": raw_text, "elapsed": round(time.perf_counter() - t0, 2), "images": image_files}


def _process_archive(zip_bytes: bytes) -> tuple[str, list[str]]:
    """从 MinerU 解析包提取 full.md；保存 images/ 下图片到 uploads/mineru/，
    并把 markdown 引用 ![](images/xxx.jpg) 改写为 /uploads/mineru/xxx.jpg。
    返回 (改写后的 markdown, 已保存图片文件名列表)。"""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        md_name = next((n for n in z.namelist() if n.endswith("full.md")), None)
        if not md_name:
            raise RuntimeError("MinerU 解析包中未找到 full.md")
        raw_text = z.read(md_name).decode("utf-8", errors="replace")

        image_map: dict[str, bytes] = {}
        for name in z.namelist():
            if name.startswith("images/") and not name.endswith("/"):
                image_map[name.rsplit("/", 1)[-1]] = z.read(name)

    image_files = []
    if image_map:
        image_dir = os.path.join(settings.UPLOAD_ROOT, "mineru")
        os.makedirs(image_dir, exist_ok=True)
        for name, data in image_map.items():
            safe = _SAFE_NAME.sub("_", name)
            if not safe or safe in (".", ".."):
                continue
            with open(os.path.join(image_dir, safe), "wb") as f:
                f.write(data)
            image_files.append(safe)

        raw_text = re.sub(
            r"\]\(\s*images/([^)]*?)\s*\)",
            lambda m: f"](/uploads/mineru/{_SAFE_NAME.sub('_', m.group(1).rsplit('/', 1)[-1])})",
            raw_text,
        )

    return raw_text, image_files
