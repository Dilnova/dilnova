const { chromium } = require('playwright');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(302, { Location: 'http://this-domain-does-not-exist.com' });
  res.end();
});

server.listen(3001, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:3001/test');
  } catch (e) {
    console.error("CAUGHT ERROR:", e.message);
  }
  await browser.close();
  server.close();
});
