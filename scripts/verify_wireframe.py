# -*- coding: utf-8 -*-
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
WIRE_PATH = "C:/Users/leerom/AppData/Local/Temp/claude-wireframe.png"
SHADED_PATH = "C:/Users/leerom/AppData/Local/Temp/claude-shaded.png"


def main() -> None:
    username = f"claude_test_{int(time.time())}"
    password = "Test123456"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for _ in range(30):
            try:
                page.goto(BASE_URL, wait_until="networkidle", timeout=5000)
                break
            except Exception:
                time.sleep(1)
        else:
            raise RuntimeError("Server not ready on http://localhost:5173")

        if page.locator("#username").count() > 0:
            page.click("text=还没有账号？立即注册", force=True)
            page.wait_for_selector("#reg-username", timeout=5000)

            page.fill("#reg-username", username)
            page.fill("#reg-email", f"{username}@example.com")
            page.fill("#reg-password", password)
            page.once("dialog", lambda dialog: dialog.accept())
            page.get_by_role("button", name="注册", exact=True).click()

            page.wait_for_timeout(500)
            page.wait_for_selector("#username", timeout=5000)

            page.fill("#username", username)
            page.fill("#password", password)
            page.get_by_role("button", name="登录", exact=True).click()

        page.wait_for_load_state("networkidle")

        if page.locator("text=创建新项目").count() > 0:
            page.click("text=创建新项目")
            page.fill("#project-name", "Wireframe Test")
            page.fill("#project-description", "wireframe check")
            page.click("button:has-text('创建项目')")

        page.wait_for_selector("text=Wireframe", timeout=20000)

        page.click("text=添加")
        page.click("text=立方体 (Cube)")
        page.wait_for_timeout(1000)

        page.click("text=Wireframe")
        page.wait_for_timeout(1000)
        page.screenshot(path=WIRE_PATH, full_page=True)

        page.click("text=Shaded")
        page.wait_for_timeout(1000)
        page.screenshot(path=SHADED_PATH, full_page=True)

        browser.close()

    print(f"WIRE_FRAME_SHOT={WIRE_PATH}")
    print(f"SHADED_SHOT={SHADED_PATH}")


if __name__ == "__main__":
    main()
