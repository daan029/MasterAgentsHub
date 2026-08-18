const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  await page.goto('https://daan029.github.io/MasterAgentsHub/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('--- console/page errors ---');
  console.log(errors.length ? errors.join('\n') : '(none)');
  console.log('--- body text snippet ---');
  console.log(bodyText.slice(0, 1500));

  await browser.close();
})();
