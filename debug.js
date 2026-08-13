const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const fileUrl = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(fileUrl);
  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => {
    function describe(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName, cls: el.className,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        bg: cs.backgroundImage.slice(0, 60),
        boxShadow: cs.boxShadow.slice(0, 80),
        transform: cs.transform,
      };
    }
    const results = [];
    document.querySelectorAll('.hub, .hub-glow, .node, .ring, .label').forEach(el => {
      results.push(describe(el));
    });
    return results;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
