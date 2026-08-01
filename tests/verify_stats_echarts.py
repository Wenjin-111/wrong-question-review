"""统计页 ECharts 图表验证：mock API 数据，检查环形饼图 + 渐变条形图渲染"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

MOCK_USER = {"id": 1, "username": "test", "email": "t@t.com", "avatar_url": None}
MOCK_BREAKDOWN = {"data": [
    {"subject_id": 1, "name": "数学", "color": "#3B5BA5", "total": 32, "accuracy": 42, "pending": 5},
    {"subject_id": 2, "name": "英语", "color": "#E8A33D", "total": 24, "accuracy": 67, "pending": 2},
    {"subject_id": 3, "name": "物理", "color": "#E34A3E", "total": 10, "accuracy": 23, "pending": 3},
    {"subject_id": 4, "name": "化学", "color": "#4C8A3D", "total": 6, "accuracy": 71, "pending": 0},
]}
MOCK_OVERVIEW = {"data": {"total": 72, "total_attempts": 210, "accuracy": 54, "today_pending": 10}}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    def route_api(route):
        url = route.request.url
        if "/api/" in url and "/src/" not in url:
            print("API_ROUTE:", url)
        if url.endswith("/api/auth/me"):
            route.fulfill(json=MOCK_USER)
        elif "/api/stats/subjects-breakdown" in url:
            route.fulfill(json=MOCK_BREAKDOWN)
        elif "/api/stats/overview" in url:
            route.fulfill(json=MOCK_OVERVIEW)
        elif "/api/stats/trends" in url:
            route.fulfill(json={"data": [{"date": "07-26", "accuracy": 40}, {"date": "07-27", "accuracy": 55}]})
        else:
            route.continue_()

    page.route("**/api/**", route_api)
    page.on("response", lambda r: print("RESP:", r.status, r.url) if "/api/" in r.url and "/src/" not in r.url else None)
    page.add_init_script("""
        localStorage.setItem('access_token', 'mock-token');
        localStorage.setItem('refresh_token', 'mock-refresh');
        localStorage.setItem('user', '{"id":1,"username":"test","email":"t@t.com","avatar_url":null}');
    """)

    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto("http://localhost:5173/stats")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    # ECharts 渲染为 canvas
    canvases = page.locator("canvas")
    print("CANVAS_COUNT:", canvases.count())
    page.screenshot(path="tests/screenshot-stats.png", full_page=True)
    print("CONSOLE_ERRORS:", errors[:5] if errors else "none")
    browser.close()
