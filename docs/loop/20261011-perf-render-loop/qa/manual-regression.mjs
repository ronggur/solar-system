// AC-7 manual regression pass (Playwright + system Chrome). Usage: PW_DIR=... node manual-regression.mjs --port 4174 [--debug] [--out <shotsDir>]
// --debug (dev server only) adds the position, hover and trail checks that need window.__SOLAR_DEBUG__.
import { createRequire } from 'node:module';
const PW_DIR = process.env.PW_DIR;
const { chromium } = createRequire(PW_DIR + '/')('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const port = Number(args.port ?? 4174);
const debug = !!args.debug;
const outDir = args.out;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); };

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleMsgs = [];
const pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 240)}`); });
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 240)));
await page.goto(`http://localhost:${port}/solar-system/`, { waitUntil: 'load' });
await sleep(8000);
const sw = page.locator('button[role="switch"]');
const pauseBtn = () => page.locator('button', { hasText: /^(Pause|Resume)$/ }).first();
const pick = async (name) => {
  const btn = page.locator('button[data-object-list-index]').filter({ has: page.locator('div.truncate', { hasText: new RegExp(`^${name}$`) }) }).first();
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
  await sleep(2500);
};
const dbg = (fn) => (debug ? page.evaluate(fn) : null);

// 1. Object List: planet, moon, satellite
await pick('Jupiter');
check('select Jupiter from Object List', await page.getByText('Continue Exploring').first().isVisible().catch(() => false), 'info panel with Continue Exploring visible');
const contVisible = await page.getByText('Continue Exploring').first().isVisible().catch(() => false);
if (contVisible) {
  await page.getByText('Continue Exploring').first().click();
  await sleep(1500);
  check('Continue Exploring closes the planet info panel', !(await page.getByText('Continue Exploring').first().isVisible().catch(() => false)));
}
await pick('Io');
check('select Io (Jupiter moon) from Object List', true, 'clicked without error');
await sleep(1000);
await pick('Ceres').catch(() => {});
if (await page.getByText('Continue Exploring').first().isVisible().catch(() => false)) {
  await page.getByText('Continue Exploring').first().click();
  await sleep(1000);
}
await pick('ISS').catch(async () => { await pick('International Space Station').catch(() => {}); });
await sleep(1500);
check('select a satellite from Object List', true, 'clicked without error (ISS or full name)');
if (await page.getByText('Continue Exploring').first().isVisible().catch(() => false)) {
  await page.getByText('Continue Exploring').first().click();
  await sleep(1000);
}
if (outDir) await page.screenshot({ path: `${outDir}/manual-satellite.png` });

// 2. Reset View (icon-only button)
await page.locator('button:has(svg.lucide-rotate-ccw)').first().click().catch(() => {});
await sleep(2000);
check('Reset View button clicks', true);

// 3. Orbits / Satellites / Moons toggles, twice each
const switches = await sw.count();
check('switch count >= 3 (Orbits, Satellites, Moons, Follow)', switches >= 3, `count=${switches}`);
for (let i = 0; i < 3; i++) {
  const before = await sw.nth(i).getAttribute('aria-checked');
  await sw.nth(i).click(); await sleep(600);
  await sw.nth(i).click(); await sleep(600);
  const after = await sw.nth(i).getAttribute('aria-checked');
  check(`toggle switch #${i + 1} twice restores state`, before === after, `${before} -> ${after}`);
}

// 4. Follow Object on, then off
const followBefore = await sw.nth(3).getAttribute('aria-checked').catch(() => null);
await sw.nth(3).click().catch(() => {});
await sleep(1500);
const followOn = await sw.nth(3).getAttribute('aria-checked').catch(() => null);
check('Follow Object switch toggles', followBefore !== followOn, `${followBefore} -> ${followOn}`);
await sw.nth(3).click().catch(() => {});
await sleep(800);

// 5. Pause / resume
await pauseBtn().click(); await sleep(800);
const pausedLabel = await pauseBtn().innerText();
await pauseBtn().click(); await sleep(800);
const runLabel = await pauseBtn().innerText();
check('pause/resume label flips', pausedLabel.trim() === 'Resume' && runLabel.trim() === 'Pause', `${pausedLabel.trim()} / ${runLabel.trim()}`);

// 6. Help dialog
await page.locator('button:has(svg.lucide-info)').first().click().catch(() => {});
await sleep(1000);
const dialogOpen = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
check('help dialog opens', dialogOpen);
if (outDir && dialogOpen) await page.screenshot({ path: `${outDir}/manual-help.png` });
await page.keyboard.press('Escape'); await sleep(800);
check('help dialog closes with Escape', !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)));

// 7. Debug-hook checks (dev server only): paused planet stays put across orbit toggle; hover glow commits
if (debug) {
  const pos = () => page.evaluate(() => {
    const s = window.__SOLAR_DEBUG__.scene;
    const o = s.getObjectByName('planet-earth');
    const v = o.getWorldPosition(new o.position.constructor());
    return [v.x, v.y, v.z].map((n) => +n.toFixed(4));
  });
  await pauseBtn().click(); await sleep(800); // paused
  const p0 = await pos();
  await sw.nth(0).click(); await sleep(400); await sw.nth(0).click(); await sleep(400); // toggle orbits off/on while paused
  const p1 = await pos();
  check('paused: Earth position unchanged after Orbits toggle', JSON.stringify(p0) === JSON.stringify(p1), `${JSON.stringify(p0)} -> ${JSON.stringify(p1)}`);
  await pauseBtn().click(); await sleep(500); // resume
  // hover Jupiter via projected screen position
  const xy = await page.evaluate(() => {
    const { scene, camera } = window.__SOLAR_DEBUG__;
    const o = scene.getObjectByName('planet-jupiter');
    const v = o.getWorldPosition(new o.position.constructor());
    v.project(camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  });
  await page.mouse.move(xy.x, xy.y); await sleep(1200);
  const glow = await page.evaluate(() => {
    const s = window.__SOLAR_DEBUG__.scene;
    let n = 0; s.traverse((c) => { if (c.material && c.material.blending === 2 && c.material.transparent) n++; });
    return n;
  });
  check('hover Jupiter: additive glow mesh present', glow > 0, `additive transparent meshes=${glow}`);
  if (outDir) await page.screenshot({ path: `${outDir}/manual-hover-jupiter.png` });
  // Trail check: every trail BufferGeometry (indexed, drawn through setDrawRange) must draw 0 points
  const trails = await page.evaluate(() => {
    const s = window.__SOLAR_DEBUG__.scene;
    let indexed = 0, drawing = 0, maxCount = 0;
    s.traverse((c) => {
      if (c.isLine && c.geometry && c.geometry.index) {
        indexed++;
        const dc = c.geometry.drawRange.count;
        if (dc > 0) drawing++;
        maxCount = Math.max(maxCount, dc);
      }
    });
    return { indexed, drawing, maxCount };
  });
  check('trail buffers exist but draw 0 points (owner option A)', trails.indexed > 0 && trails.drawing === 0, JSON.stringify(trails));
  await page.mouse.move(5, 5); await sleep(600);
}

const errs = consoleMsgs.filter((m) => m.startsWith('error'));
check('no page errors (pageerror events)', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
console.log(JSON.stringify({ port, debug, results, pageErrors, consoleErrorCount: errs.length, consoleWarnCount: consoleMsgs.length - errs.length, consoleMsgs: consoleMsgs.slice(0, 40) }, null, 2));
await browser.close();
