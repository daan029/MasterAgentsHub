const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const fileUrl = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(fileUrl);
  await page.waitForTimeout(1500);
  await page.click('.label:not(.hub-label)');
  await page.waitForTimeout(400);
  await page.click('#panelStatsToggle summary');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshot_panel.png' });
  await browser.close();
  console.log('done');
})();
