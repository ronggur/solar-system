#!/usr/bin/env node
/**
 * Self-test of scripts/perf-sampler.js on synthetic pages (no app, no server).
 * Usage: PW_DIR=<dir with node_modules/playwright> node sampler-selftest.mjs
 * Prints one JSON object; `checks` lists each expectation with pass/fail.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(process.env.PW_DIR + '/')('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLER = readFileSync(path.join(HERE, '../../../../scripts/perf-sampler.js'), 'utf8');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });
const run = async (ms) => {
  await page.evaluate((v) => (window.__PERF_SAMPLER_MS__ = v), ms);
  return page.evaluate(SAMPLER);
};

// T1: idle page, 3 s
await page.setContent('<html><body>idle</body></html>');
const keysBefore = await page.evaluate(() => Object.keys(window).length);
const t1 = await run(3000);
const keysAfter = await page.evaluate(() => Object.keys(window).length);
check('T1 idle: ~60 fps frame cadence', t1.p50Ms > 14 && t1.p50Ms < 20, `p50=${t1.p50Ms} fps=${t1.fpsAvg} frames=${t1.frames}`);
check('T1 idle: endedBy complete, visible, longTasks supported', t1.endedBy === 'complete' && t1.visibility === 'visible' && t1.longTasks.supported, JSON.stringify({ e: t1.endedBy, v: t1.visibility, l: t1.longTasks }));
check('T1 durationMs close to requested', Math.abs(t1.durationMs - 3000) < 100, `durationMs=${t1.durationMs}`);
check('T1 window key count unchanged (only __PERF_SAMPLER_MS__ added by the caller)', keysAfter - keysBefore <= 1, `before=${keysBefore} after=${keysAfter}`);
check('T1 result is JSON-serialisable with the documented fields', ['frames', 'durationMs', 'fpsAvg', 'p50Ms', 'p95Ms', 'maxMs', 'over33ms', 'longTasks', 'visibility'].every((k) => k in JSON.parse(JSON.stringify(t1))), Object.keys(t1).join(','));

// T2: one 200 ms busy loop inside the window -> 1 long task, 1 slow frame
await page.setContent('<html><body>busy</body></html>');
await page.evaluate(() => {
  setTimeout(() => {
    const t = performance.now();
    while (performance.now() - t < 200);
  }, 1000);
});
const t2 = await run(3000);
check('T2 busy loop: exactly 1 long task of >=190 ms', t2.longTasks.count === 1 && t2.longTasks.maxMs >= 190, JSON.stringify(t2.longTasks));
// rAF timestamps are vsync-aligned begin-frame times, so a 200 ms block can show as ~180-200 ms.
check('T2 busy loop: a frame interval >= 150 ms and over33ms.count >= 1', t2.maxMs >= 150 && t2.over33ms.count >= 1, `maxMs=${t2.maxMs} over33=${JSON.stringify(t2.over33ms)}`);

// T3: a long task BEFORE sampling must not be counted
await page.setContent('<html><body>pre</body></html>');
await page.evaluate(() => {
  const t = performance.now();
  while (performance.now() - t < 200);
});
const t3 = await run(1500);
check('T3 pre-window long task not counted', t3.longTasks.count === 0, JSON.stringify(t3.longTasks));

// T4: back-to-back runs are independent (no accumulated observers)
const t4a = await run(1000);
const t4b = await run(1000);
check('T4 back-to-back runs both complete with sane frame counts', t4a.endedBy === 'complete' && t4b.endedBy === 'complete' && Math.abs(t4a.frames - t4b.frames) < 15, `${t4a.frames} vs ${t4b.frames}`);

// T5: hidden tab flag
await page.setContent('<html><body>hide</body></html>');
await page.evaluate(() => {
  setTimeout(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, 500);
});
const t5 = await run(1500);
check('T5 hidden tab recorded (hiddenDuringRun + visibility)', t5.hiddenDuringRun === true && t5.visibility === 'hidden', `hiddenDuringRun=${t5.hiddenDuringRun} visibility=${t5.visibility}`);

// T6: rAF never fires (hidden-tab throttling) -> safety timeout resolves the promise
await page.setContent('<html><body>raf-stall</body></html>');
await page.evaluate(() => {
  window.requestAnimationFrame = () => 0;
});
const started = Date.now();
const t6 = await run(1000);
check('T6 rAF stall: resolves via safety timer (endedBy timeout, ~6 s)', t6.endedBy === 'timeout' && Date.now() - started < 8000 && t6.frames === 0, `endedBy=${t6.endedBy} elapsed=${Date.now() - started}ms frames=${t6.frames}`);

console.log(JSON.stringify({ allPass: checks.every((c) => c.pass), checks }, null, 2));
await browser.close();
