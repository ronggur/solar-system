// Follow-mode check (dev server only): NDC distance of Jupiter from screen centre with Follow on/off. Usage: PW_DIR=... node follow-check.mjs 5174
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.PW_DIR + '/')('playwright');
const port = Number(process.argv[2] ?? 5174);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${port}/solar-system/`, { waitUntil: 'load' });
await sleep(8000);
const pick = async (name) => {
  const btn = page.locator('button[data-object-list-index]').filter({ has: page.locator('div.truncate', { hasText: new RegExp(`^${name}$`) }) }).first();
  await btn.waitFor({ timeout: 10000}); await btn.click(); await sleep(2500);
};
const ndc = (name) => page.evaluate((n) => {
  const { scene, camera } = window.__SOLAR_DEBUG__;
  const o = scene.getObjectByName(n);
  const v = o.getWorldPosition(new o.position.constructor());
  v.project(camera);
  return Math.hypot(v.x, v.y);
}, name);
await pick('Jupiter');
const pauseBtn = page.locator('button', { hasText: /^(Pause|Resume)$/ }).first();
if ((await pauseBtn.innerText()).trim() === 'Resume') { await pauseBtn.click(); await sleep(500); }
const sw = page.locator('button[role="switch"]');
const samples = [];
samples.push(['selected, follow OFF', await ndc('planet-jupiter')]);
await sw.nth(3).click(); // Follow Object on
await sleep(300);
samples.push(['follow ON +0.3s', await ndc('planet-jupiter')]);
await sleep(3000);
samples.push(['follow ON +3.3s', await ndc('planet-jupiter')]);
await sleep(3000);
samples.push(['follow ON +6.3s', await ndc('planet-jupiter')]);
await sw.nth(3).click(); // Follow off
await sleep(3000);
samples.push(['follow OFF again +3s', await ndc('planet-jupiter')]);
console.log(JSON.stringify(samples.map(([k, v]) => ({ step: k, ndcDistFromCenter: +v.toFixed(4) })), null, 1));
await browser.close();
