"""纸本红笔主题验证：登录页 + 页面基础渲染检查"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path="tests/screenshot-login.png", full_page=True)

    # 1. 登录页品牌标题（楷体）
    h3 = page.locator("h3.font-kai")
    print("TITLE:", h3.inner_text() if h3.count() else "NOT FOUND")

    # 2. body 背景 = 纸色
    print("BODY_BG:", page.evaluate("getComputedStyle(document.body).backgroundColor"))

    # 3. 登录卡片背景 = 白纸（内联 width:400px 的容器）
    card = page.evaluate(
        """() => {
          const divs = Array.from(document.querySelectorAll('div'));
          const card = divs.find(d => d.style.width === '400px');
          return card ? getComputedStyle(card).backgroundColor + ' | ' + getComputedStyle(card).borderTopColor : 'NOT FOUND';
        }"""
    )
    print("CARD_BG|BORDER:", card)

    # 4. 主按钮颜色（antd primary = 蓝墨水）
    print("BTN_BG:", page.evaluate("getComputedStyle(document.querySelector('button.ant-btn-primary')).backgroundColor"))

    # 5. 字体加载检查：LXGW WenKai bold（标题实际使用字重）
    print("KAI_FONT_LOADED:", page.evaluate("document.fonts.check('700 16px \"LXGW WenKai\"', '✎错题本')"))

    browser.close()
