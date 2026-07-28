import json
from typing import AsyncGenerator

import httpx

from app.config import settings

_client: httpx.AsyncClient | None = None


def get_ai_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10, read=120, write=10, pool=10),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


async def call_ai(
    api_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
    stream: bool = False,
) -> str | AsyncGenerator[str, None]:
    url = f"{api_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    body = {"model": model, "messages": messages, "stream": stream}

    if stream:
        return _stream_ai_response(url, headers, body)

    client = get_ai_client()
    response = await client.post(url, headers=headers, json=body, timeout=60)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


async def _stream_ai_response(url: str, headers: dict, body: dict) -> AsyncGenerator[str, None]:
    client = get_ai_client()
    async with client.stream("POST", url, headers=headers, json=body) as response:
        response.raise_for_status()
        async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        if "content" in delta and delta["content"] is not None:
                            yield delta["content"]
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


async def parse_question_text(api_url: str, api_key: str, model: str, ocr_text: str) -> dict:
    prompt = f"""你是一个错题解析助手。请从以下OCR识别的文本中，提取出三个部分：
1. 题目内容（题干，包含选项等）
2. 正确答案
3. 答案解析（解题思路或知识点说明）

如果某一部分在原文本中没有找到，请留空。

请严格按以下JSON格式返回，不要添加任何其他内容：
{{
  "question": "提取的题目内容",
  "answer": "提取的正确答案",
  "explanation": "提取的答案解析"
}}

以下是OCR识别文本：
---
{ocr_text}
---"""
    result = await call_ai(api_url, api_key, model, [{"role": "user", "content": prompt}])
    if isinstance(result, str):
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"question": ocr_text, "answer": "", "explanation": ""}
    # streaming — shouldn't happen for parse
    return {"question": ocr_text, "answer": "", "explanation": ""}
