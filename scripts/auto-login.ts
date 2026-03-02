import { chromium } from 'playwright';

/**
 * 自动登录脚本
 * 使用 Playwright 打开指定 URL 并执行登录
 */
async function autoLogin() {
  const browser = await chromium.launch({
    headless: false, // 显示浏览器窗口
    slowMo: 500, // 放慢操作速度以便观察
  });

  const context = await browser.newContext({
    // 可选：设置视口大小
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  try {
    console.log('正在打开登录页面...');
    await page.goto('http://10.210.21.130:30782/login/login.html');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    console.log('正在填写登录信息...');

    // 填写用户名（根据实际页面元素调整选择器）
    await page.fill('input[name="username"], input[type="text"], #username', 'admin');

    // 填写密码（根据实际页面元素调整选择器）
    await page.fill('input[name="password"], input[type="password"], #password', '123456');

    console.log('正在点击登录按钮...');

    // 点击登录按钮（根据实际页面元素调整选择器）
    await page.click('button[type="submit"], button:has-text("登录"), input[type="submit"]');

    // 等待导航或登录成功的标志
    await page.waitForLoadState('networkidle');

    console.log('登录完成！');
    console.log('当前 URL:', page.url());

    // 保持浏览器打开，以便查看结果
    console.log('\n浏览器将保持打开状态，按 Ctrl+C 关闭...');
    await page.pause(); // 这会打开 Playwright Inspector

  } catch (error) {
    console.error('登录过程出错:', error);

    // 截图保存错误状态
    await page.screenshot({ path: 'login-error.png', fullPage: true });
    console.log('错误截图已保存到 login-error.png');

  } finally {
    // 可选：延迟关闭浏览器
    // await browser.close();
  }
}

// 执行登录
autoLogin();
