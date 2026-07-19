const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:3002/');
  } catch (e) {
    console.error(e.message);
  }
  await browser.close();
})();
