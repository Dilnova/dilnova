import { test, expect } from '@playwright/test';
import http from 'http';

test('redirect error test', async ({ page }) => {
  const server = http.createServer((req, res) => {
    res.writeHead(302, { Location: 'http://this-domain-does-not-exist-12345.com' });
    res.end();
  });
  
  await new Promise(resolve => server.listen(3005, resolve));
  
  try {
    await page.goto('http://127.0.0.1:3005/test');
  } catch (e) {
    console.log("PLAYWRIGHT ERROR EXACT MATCH:", e.message);
  }
  
  server.close();
});
