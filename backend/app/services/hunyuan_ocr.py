import logging
import os
import time

import torch

logger = logging.getLogger(__name__)

DEFAULT_PROMPT = (
    "提取文档图片中正文的所有信息用markdown格式表示，其中页眉、页脚部分忽略，"
    "表格用html格式表达，文档中公式用latex格式表示，按照阅读顺序组织进行解析。"
)

_processor = None
_model = None


def _load_model():
    """懒加载 HunyuanOCR 模型，进程内仅加载一次。"""
    global _processor, _model
    if _model is not None:
        return _processor, _model

    from app.config import settings
    from transformers import AutoProcessor, HunYuanVLForConditionalGeneration

    model_dir = settings.HUNYUAN_MODEL_DIR
    if not model_dir or not os.path.isdir(model_dir):
        raise RuntimeError(
            f"HunyuanOCR 模型目录不存在: {model_dir!r}，请在 .env 中配置 HUNYUAN_MODEL_DIR"
        )
    if not torch.cuda.is_available():
        raise RuntimeError("HunyuanOCR 需要 NVIDIA GPU（CUDA）才能运行，当前机器没有可用 GPU")

    logger.info("正在加载 HunyuanOCR 模型: %s", model_dir)
    t0 = time.perf_counter()
    _processor = AutoProcessor.from_pretrained(model_dir, trust_remote_code=True, backend="pil")
    _model = HunYuanVLForConditionalGeneration.from_pretrained(
        model_dir,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        trust_remote_code=True,
    ).eval()
    logger.info("HunyuanOCR 模型加载完成，耗时 %.1fs", time.perf_counter() - t0)
    return _processor, _model


def hunyuan_ocr(image, max_new_tokens: int = 4096, prompt: str = DEFAULT_PROMPT) -> dict:
    """HunyuanOCR 本地推理：图片 → Markdown 文本。返回 {raw_text, blocks, elapsed}。"""
    processor, model = _load_model()

    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": prompt},
        ],
    }]
    inputs = processor.apply_chat_template(
        messages, add_generation_prompt=True, tokenize=True,
        return_dict=True, return_tensors="pt",
    ).to(model.device)

    t0 = time.perf_counter()
    with torch.inference_mode():
        out = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            repetition_penalty=1.08,
        )
    elapsed = round(time.perf_counter() - t0, 2)

    gen = out[:, inputs["input_ids"].shape[1]:]
    text = processor.batch_decode(gen, skip_special_tokens=True)[0]
    return {"raw_text": text, "blocks": [], "elapsed": elapsed}
