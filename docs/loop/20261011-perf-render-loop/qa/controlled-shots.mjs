#!/usr/bin/env node
/**
 * AC-5 controlled re-shoot (finding Q1-01). Same four screenshots as `probes.mjs shots`
 * (overview x2, selected Jupiter x2, production preview, seeded Math.random, paused), but the page
 * clock is virtual, so the two builds reach the same simulated state:
 *
 *   0. Seeded random ignores three.js-internal draws (UUIDs). Without this, the base's per-frame
 *      allocations shifted the seeded start angles of later moons and satellites (Q1-01 root cause).
 *   1. performance.now() stays at 0 until the scene is paused. THREE.Clock therefore gives delta 0,
 *      and every orbit stays at its seeded start angle (no dependence on wall-clock time, and no
 *      dependence on the orbital speed, which Q1-04 changed on purpose).
 *   2. Planet spin is per frame (rotation.y += rotationSpeed), so the pause is placed at a fixed
 *      requestAnimationFrame count (PAUSE_AT_FRAME), not after a wall-clock delay.
 *   3. After the pause the virtual clock runs again. Paused motion stays frozen; camera tweens and
 *      damping still complete, with the same number of frames in both builds.
 *
 * Both builds get the same protocol, so the BASE pair (overview-1 vs -2, selected-jupiter-1 vs -2)
 * still gives the noise floor for compare-shots.mjs.
 *
 * Usage (PW_DIR = scratch dir that holds node_modules/playwright, outside the repo):
 *   PW_DIR=... node controlled-shots.mjs --port 4174 --out <dir> [--pause-frame 600]
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const PW_DIR = process.env.PW_DIR;
if (!PW_DIR) {
  console.error('PW_DIR is required (directory that contains node_modules/playwright)');
  process.exit(2);
}
const { chromium } = createRequire(PW_DIR + '/')('playwright');

const rest = process.argv.slice(2);
const args = {};
rest.forEach((a, i) => {
  if (a.startsWith('--')) args[a.slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true;
});
const port = Number(args.port ?? 4174);
const PAUSE_AT_FRAME = Number(args['pause-frame'] ?? 600);
const dir = args.out;
if (!dir) throw new Error('--out <dir> is required');
const URL_APP = `http://localhost:${port}/solar-system/`;
const VIEWPORT = { width: 1440, height: 900 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (obj) => console.log(JSON.stringify(obj, null, 2));

/**
 * Seeded Math.random (mulberry32). Same generator as probes.mjs, but calls made from three.js code
 * (stack frame in vendor-three or node_modules) bypass the seed, so app draws (start angles, textures)
 * are the same sequence in both builds.
 */
const SEEDED_RANDOM = `(() => {
  let s = 1234567;
  const real = Math.random.bind(Math);
  Math.random = () => {
    // Draws made inside three.js (generateUUID in every constructor) must not advance the seed.
    // Their count depends on how many objects a build allocates, so counting them moves the start
    // angles of later bodies between builds (Q1-01). Only app code draws from the seeded stream.
    const caller = new Error().stack.split('\\n')[2] || '';
    if (caller.includes('vendor-three') || caller.includes('node_modules')) return real();
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

/**
 * Virtual clock. Runs before any page script. Frames are counted by wrapping requestAnimationFrame,
 * so the count is exact. The pause click is issued inside the frame callback at PAUSE_AT_FRAME.
 */
const VIRTUAL_CLOCK = `(() => {
  const STEP = 1000 / 60;
  let now = 0;
  const state = { frames: 0, ticking: false, paused: false, pausedAtFrame: null, pauseAt: ${PAUSE_AT_FRAME} };
  window.__CLOCK__ = state;
  performance.now = () => now;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    raf(() => {
      state.frames++;
      if (state.ticking) now += STEP;
      if (!state.paused && state.frames >= state.pauseAt) {
        const b = [...document.querySelectorAll('button')].find((x) => /^Pause$/.test(x.textContent.trim()));
        if (b) {
          state.paused = true;
          state.pausedAtFrame = state.frames;
          b.click();
        }
      }
      cb(now);
    });
})();`;

async function waitFrames(page, extra) {
  const target = (await page.evaluate(() => window.__CLOCK__.frames)) + extra;
  await page.waitForFunction((n) => window.__CLOCK__.frames >= n, target, { timeout: 600000 });
}

async function main() {
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await context.addInitScript(SEEDED_RANDOM);
  await context.addInitScript(VIRTUAL_CLOCK);
  const page = await context.newPage();
  const logs = [];
  const glbResponses = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => logs.push(`pageerror: ${String(e.message).slice(0, 300)}`));
  page.on('response', (r) => {
    if (r.url().endsWith('.glb')) glbResponses.push(r.status());
  });

  await page.goto(URL_APP, { waitUntil: 'load' });
  await page.waitForSelector('text=Controls', { timeout: 60000 });
  // Pause happens at a fixed frame count; wait for it, then for the label to show "Resume".
  await page.waitForFunction(() => window.__CLOCK__.paused, null, { timeout: 600000 });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some((x) => /^Resume$/.test(x.textContent.trim()))
  );
  const pausedAtFrame = await page.evaluate(() => window.__CLOCK__.pausedAtFrame);
  const glbAtPause = glbResponses.length;

  // Run the virtual clock again (the scene stays paused) so camera tweens and damping finish.
  await page.evaluate(() => {
    window.__CLOCK__.ticking = true;
  });
  await waitFrames(page, 300);
  await sleep(3000);
  await page.screenshot({ path: path.join(dir, 'overview-1.png') });
  await waitFrames(page, 60);
  await page.screenshot({ path: path.join(dir, 'overview-2.png') });

  const btn = page
    .locator('button[data-object-list-index]')
    .filter({ has: page.locator('div.truncate', { hasText: /^Jupiter$/ }) })
    .first();
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
  await waitFrames(page, 300);
  await sleep(3000);
  await page.screenshot({ path: path.join(dir, 'selected-jupiter-1.png') });
  await waitFrames(page, 60);
  await page.screenshot({ path: path.join(dir, 'selected-jupiter-2.png') });

  const final = await page.evaluate(() => ({ frames: window.__CLOCK__.frames, paused: window.__CLOCK__.paused }));
  out({
    url: URL_APP,
    dir,
    pauseAtFrame: PAUSE_AT_FRAME,
    pausedAtFrame,
    framesAtEnd: final.frames,
    glbResponsesAtPause: glbAtPause,
    glbResponsesTotal: glbResponses.length,
    glbStatuses: [...new Set(glbResponses)],
    files: ['overview-1.png', 'overview-2.png', 'selected-jupiter-1.png', 'selected-jupiter-2.png'],
    consoleIssues: logs.slice(0, 5),
  });
  await browser.close();
}

await main();
