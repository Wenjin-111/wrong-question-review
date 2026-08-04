# -*- coding: utf-8 -*-
"""UI 验证: 登录 → 设置页 MinerU Token 区块 → OCR 页引擎选项 → PDF 页引擎选项。

用法: python tests/ui_mineru_check.py
前置: 后端(8000) + 前端(5173) 已运行; 已存在测试账号 mineru_ui_test / Test1234!
"""
import re
import sys

from playwright.sync_api import sync_playwright

LOGIN = "http://localhost:5174/login"
BASE = "http://localhost:5174"


def login(page):
    page.goto(LOGIN)
    page.wait_for_load_state("networkidle")
    # 侦察登录表单
    inputs = page.locator("input")
    n = inputs.count()
    print(f"login inputs: {n}")
    for i in range(n):
        el = inputs.nth(i)
        ph = el.get_attribute("placeholder")
        tp = el.get_attribute("type")
        print(f"  input[{i}] placeholder={ph!r} type={tp!r}")
    buttons = page.locator("button")
    m = buttons.count()
    for i in range(min(m, 8)):
        print(f"  button[{i}] text={buttons.nth(i).inner_text()!r}")


def main() -> int:
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(f"console[{m.type}]: {m.text}") if m.type in ("error", "warning") else None)
        def on_resp(r):
            if "/auth/login" in r.url:
                try:
                    body = r.text()
                except Exception:
                    body = "<no body>"
                errors.append(f"login resp {r.status}: {r.url} body={body[:300]}")
            elif "/auth/" in r.url:
                errors.append(f"resp {r.status}: {r.url}")
        page.on("response", on_resp)

        login(page)
        # 按 placeholder 填表（账户名/密码）
        user_input = page.locator("input").nth(0)
        pwd_input = page.locator("input").nth(1)
        user_input.fill("mineru_ui_test")
        pwd_input.fill("Test1234!")
        page.locator("button").first.click()
        page.wait_for_timeout(2500)
        print("after login url:", page.url)
        results.append(("login", page.url != LOGIN))

        # 设置页
        page.goto(f"{BASE}/settings")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        tab = page.get_by_role("tab", name=re.compile(r"AI"))
        if tab.count():
            tab.first.click()
            page.wait_for_timeout(800)
        body = page.inner_text("body")
        results.append(("settings MinerU block", "MinerU OCR Token" in body))
        results.append(("settings status tag", ("已配置" in body) or ("未配置" in body)))
        page.screenshot(path="tests/_ui_settings.png", full_page=True)

        # OCR 页
        page.goto(f"{BASE}/questions/ocr")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        body = page.inner_text("body")
        results.append(("ocr MinerU option", "MinerU" in body))

        # PDF 页
        page.goto(f"{BASE}/questions/pdf")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        body = page.inner_text("body")
        results.append(("pdf MinerU option", "MinerU" in body))

        print("page errors:", errors if errors else "none")
        browser.close()

    ok = True
    for name, passed in results:
        print(f"{'PASS' if passed else 'FAIL'}: {name}")
        ok = ok and passed
    return 0 if ok else 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
