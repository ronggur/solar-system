#!/usr/bin/env node
/**
 * QA probes for run 20261011-perf-render-loop (Playwright + system Chrome, same protocol as measure.mjs).
 * Covers the SPEC checks that measure.mjs does not:
 *   commits   AC-1  React commits per component name per second (dev server; names are readable there).
 *             --settle ms: wait before measuring (AC-1 steady state: 40000). --hover <id>: also measure with the pointer on that planet
 *   angular   AC-3  orbital angular speed (rad/s) at 1x / 5x / 10x, from world positions (dev server)
 *   buffers   AC-2  live WebGL buffers (createBuffer - deleteBuffer) + renderer.info.memory.geometries over time
 *   shots     AC-5  seeded, paused screenshots of overview and selected Jupiter (production preview)
 *
 * Usage (PW_DIR = scratch dir that holds node_modules/playwright, outside the repo):
 *   PW_DIR=... node probes.mjs commits  --port 5174 [--seconds 10] [--settle 5000] [--hover jupiter]
 *   PW_DIR=... node probes.mjs angular  --port 5174
 *   PW_DIR=... node probes.mjs buffers  --port 5174 [--minutes 5] [--scenario overview|selected]
 *   PW_DIR=... node probes.mjs shots    --port 4174 --out <dir>
 * Output is JSON on stdout.
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

const rest = process.argv.slice(3);
const args = {};
rest.forEach((a, i) => {
  if (a.startsWith('--')) args[a.slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true;
});
const command = process.argv[2];
const port = Number(args.port ?? 5174);
const URL_APP = `http://localhost:${port}/solar-system/`;
const VIEWPORT = { width: 1440, height: 900 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (obj) => console.log(JSON.stringify(obj, null, 2));
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Installs a minimal React DevTools global hook before any page script runs. react-dom and
 * @react-three/fiber call `onCommitFiberRoot` on every commit. A function component counts as
 * re-rendered in that commit when its hook list object changed against the alternate fiber, which is
 * what React's Profiler reports as "rendered". Counts are per display name.
 */
const COMMIT_HOOK = `(() => {
  const counts = {};
  const FN_TAGS = new Set([0, 11, 14, 15]); // FunctionComponent, ForwardRef, Memo, SimpleMemo
  const visit = (root) => {
    const stack = [root];
    while (stack.length) {
      const f = stack.pop();
      if (!f) continue;
      if (FN_TAGS.has(f.tag) && f.alternate && f.memoizedState !== f.alternate.memoizedState) {
        const t = f.type && (f.type.type || f.type);
        const name = (t && (t.displayName || t.name)) || 'anonymous';
        counts[name] = (counts[name] || 0) + 1;
      }
      if (f.child) stack.push(f.child);
      if (f.sibling) stack.push(f.sibling);
    }
  };
  window.__COMMITS__ = counts;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    checkDCE() {},
    inject() { return 1; },
    onScheduleFiberRoot() {},
    onCommitFiberRoot(_id, root) { visit(root.current); },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
  };
})();`;

/** Counts WebGL2 buffers created and deleted, so live = created - deleted. */
const BUFFER_HOOK = `(() => {
  const counts = { created: 0, deleted: 0 };
  window.__GL_BUF__ = counts;
  const P = WebGL2RenderingContext.prototype;
  const cb = P.createBuffer;
  const db = P.deleteBuffer;
  P.createBuffer = function (...a) { const b = cb.apply(this, a); if (b) counts.created++; return b; };
  P.deleteBuffer = function (b) { if (b) counts.deleted++; return db.call(this, b); };
})();`;

/** Seeded Math.random (mulberry32) so both builds start every orbit at the same angle. */
const SEEDED_RANDOM = `(() => {
  let s = 1234567;
  Math.random = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

async function launch(initScripts = []) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  for (const s of initScripts) await context.addInitScript(s);
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => logs.push(`pageerror: ${String(e.message).slice(0, 300)}`));
  return { browser, page, logs };
}

async function openApp(page) {
  await page.goto(URL_APP, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForSelector('text=Controls', { timeout: 30000 });
}

async function selectFromObjectList(page, name) {
  const btn = page
    .locator('button[data-object-list-index]')
    .filter({ has: page.locator('div.truncate', { hasText: new RegExp(`^${escapeRegExp(name)}$`) }) })
    .first();
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
}

async function playbackLabel(page) {
  const b = page.locator('button', { hasText: /^(Pause|Resume)$/ }).first();
  return (await b.innerText()).trim();
}

const speedValue = (page) =>
  page.evaluate(() => {
    const s = document.querySelector('[role="slider"]');
    return s ? s.getAttribute('aria-valuenow') : null;
  });

/* ---------- AC-1: commits ---------- */
/** Screen position (CSS px) of a planet's centre, from the dev debug hook; null when behind the camera. */
const PROJECT_PLANET = (id) => {
  const dbg = window.__SOLAR_DEBUG__;
  const o = dbg.scene.getObjectByName(`planet-${id}`);
  if (!o) return null;
  const v = new dbg.scene.position.constructor();
  o.getWorldPosition(v);
  v.project(dbg.camera);
  if (v.z > 1) return null;
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
};

async function cmdCommits() {
  const seconds = Number(args.seconds ?? 10);
  const settle = Number(args.settle ?? 5000);
  const hover = args.hover ? String(args.hover) : null;
  const { browser, page, logs } = await launch([COMMIT_HOOK]);
  await openApp(page);
  await sleep(settle);
  const snap = () => page.evaluate(() => ({ ...(window.__COMMITS__ || {}) }));
  // `during` runs for the whole window; by default it only waits.
  const measure = async (label, during = () => sleep(seconds * 1000)) => {
    const a = await snap();
    await during();
    const b = await snap();
    const rates = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = (b[k] || 0) - (a[k] || 0);
      if (d > 0) rates[k] = Math.round((d / seconds) * 10) / 10;
    }
    const top = Object.entries(rates).sort((x, y) => y[1] - x[1]).slice(0, 12);
    return { label, seconds, commitsPerSecond: Object.fromEntries(top), total: Object.values(rates).reduce((s, v) => s + v, 0) };
  };
  const running = await measure('running (overview)');
  const label1 = await playbackLabel(page);
  const results = [running];
  if (hover) {
    // Hover is measured while paused: a running planet moves out from under the pointer, and each
    // enter/leave mounts or unmounts the glow, which would count as commits that are not per frame.
    await page.locator('button', { hasText: /^Pause$/ }).first().click();
    await sleep(1500);
    // Offsets from the projected centre, nearest first (the projection can be a few px off the disc).
    const OFFSETS = [];
    for (let dx = -15; dx <= 15; dx += 3) for (let dy = -15; dy <= 15; dy += 3) OFFSETS.push([dx, dy]);
    OFFSETS.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
    const centre = await page.evaluate(PROJECT_PLANET, hover);
    let hit = null;
    for (const [dx, dy] of OFFSETS) {
      await page.mouse.move(centre.x + dx, centre.y + dy);
      if ((await page.evaluate(() => document.body.style.cursor)) === 'pointer') {
        hit = [dx, dy];
        break;
      }
    }
    if (!hit) throw new Error(`pointer did not hover ${hover}`);
    // The pointer stays still during the window, so only per-frame commits are counted.
    const h = await measure(`hover ${hover} (paused, pointer steady)`);
    h.cursorAfter = await page.evaluate(() => document.body.style.cursor);
    results.push(h);
    await page.mouse.move(1, 1);
    await sleep(1000);
    results.push(await measure('paused (idle)'));
  } else {
    await page.locator('button', { hasText: /^Pause$/ }).first().click();
    await sleep(1500);
    results.push(await measure('paused (idle)'));
  }
  out({ url: URL_APP, settleMs: settle, playbackAtRunning: label1, results, consoleIssues: logs.slice(0, 5) });
  await browser.close();
}

/* ---------- AC-3: angular speed ---------- */
const ANGULAR_SAMPLE = async ({ tracked, dtMs }) => {
  const scene = window.__SOLAR_DEBUG__.scene;
  const V = scene.position.constructor;
  const worldPos = (name) => {
    const o = scene.getObjectByName(name);
    if (!o) return null;
    const v = new V();
    o.getWorldPosition(v);
    return v;
  };
  const rel = () =>
    tracked.map((t) => {
      const c = worldPos(t.child);
      const p = worldPos(t.parent);
      return c && p ? c.clone().sub(p) : null;
    });
  // Accumulate the angle between consecutive samples. One long window would alias for fast bodies
  // (ISS at 10x is ~15 rad/s, more than pi per second), so each step is kept short.
  const steps = Math.round(dtMs / 50);
  const total = tracked.map(() => 0);
  const radius = tracked.map(() => null);
  let prev = rel();
  const t0 = performance.now();
  for (let s = 0; s < steps; s++) {
    await new Promise((r) => setTimeout(r, 50));
    const cur = rel();
    tracked.forEach((_, i) => {
      if (!prev[i] || !cur[i]) return;
      if (radius[i] === null) radius[i] = prev[i].length();
      const cos = prev[i].dot(cur[i]) / (prev[i].length() * cur[i].length());
      total[i] += Math.acos(Math.min(1, Math.max(-1, cos)));
    });
    prev = cur;
  }
  const dt = (performance.now() - t0) / 1000;
  return tracked.map((t, i) => {
    if (radius[i] === null) return { child: t.child, omegaRadPerSec: null };
    return { child: t.child, radius: Math.round(radius[i] * 1000) / 1000, omegaRadPerSec: total[i] / dt };
  });
};

async function cmdAngular() {
  // orbitalSpeed from src/data (Earth 1, Io 3.5, ISS 15). Expected omega = orbitalSpeed * speed * 0.1 rad/s.
  const tracked = [
    { child: 'planet-earth', parent: 'planet-sun', orbitalSpeed: 1 },
    { child: 'moon-io', parent: 'planet-jupiter', orbitalSpeed: 3.5 },
    { child: 'satellite-iss', parent: 'planet-earth', orbitalSpeed: 15 },
  ];
  const { browser, page, logs } = await launch([SEEDED_RANDOM]);
  await openApp(page);
  await sleep(4000);
  const label = await playbackLabel(page);
  const speeds = [];
  const sampleSpeed = async (target) => {
    // Speed steps by 0.1 per ArrowRight press (global key handler in ControlPanel).
    let v = Number(await speedValue(page));
    const presses = Math.round((target - v) * 10);
    for (let i = 0; i < Math.abs(presses); i++) {
      await page.keyboard.press(presses > 0 ? 'ArrowRight' : 'ArrowLeft');
      await sleep(15);
    }
    await sleep(1500);
    const shown = Number(await speedValue(page));
    const reads = [];
    for (let k = 0; k < 3; k++) {
      reads.push(await page.evaluate(ANGULAR_SAMPLE, { tracked, dtMs: 2000 }));
      await sleep(300);
    }
    const expected = Object.fromEntries(tracked.map((t) => [t.child, Math.round(t.orbitalSpeed * target * 0.1 * 1e5) / 1e5]));
    speeds.push({ target, sliderValue: shown, expectedOmega: expected, samples: reads });
  };
  await sampleSpeed(1);
  await sampleSpeed(5);
  await sampleSpeed(10);
  out({ url: URL_APP, playbackLabel: label, tracked, speeds, consoleIssues: logs.slice(0, 5) });
  await browser.close();
}

/* ---------- AC-2: buffers and geometries over time ---------- */
async function cmdBuffers() {
  const minutes = Number(args.minutes ?? 5);
  const scenario = args.scenario ?? 'overview';
  const { browser, page, logs } = await launch([BUFFER_HOOK]);
  await openApp(page);
  if (scenario === 'selected') {
    await selectFromObjectList(page, 'Jupiter');
    await sleep(1500);
    await page.locator('button', { hasText: /^Resume$/ }).first().click();
    // Show orbits, moons and satellites (switch order: Orbits, Satellites, Moons, Follow).
    const sw = page.locator('button[role="switch"]');
    for (const i of [0, 1, 2]) {
      if ((await sw.nth(i).getAttribute('aria-checked')) !== 'true') await sw.nth(i).click();
    }
  }
  const read = () =>
    page.evaluate(() => {
      const i = window.__SOLAR_DEBUG__.info;
      const b = window.__GL_BUF__;
      return {
        geometries: i.memory.geometries,
        textures: i.memory.textures,
        liveBuffers: b.created - b.deleted,
        createdBuffers: b.created,
        deletedBuffers: b.deleted,
        calls: i.render.calls,
      };
    });
  const samples = [];
  const t0 = Date.now();
  for (let m = 1; m <= minutes; m++) {
    const wait = t0 + m * 60000 - Date.now();
    if (wait > 0) await sleep(wait);
    samples.push({ minute: m, tSec: Math.round((Date.now() - t0) / 1000), ...(await read()) });
  }
  out({ url: URL_APP, scenario, note: 'dev server (StrictMode): growth only', samples, consoleIssues: logs.slice(0, 5) });
  await browser.close();
}

/* ---------- AC-5: screenshots of a frozen scene ---------- */
async function cmdShots() {
  const dir = args.out;
  if (!dir) throw new Error('--out <dir> is required');
  mkdirSync(dir, { recursive: true });
  const { browser, page, logs } = await launch([SEEDED_RANDOM]);
  await openApp(page);
  await sleep(6000);
  if ((await playbackLabel(page)) === 'Pause') await page.locator('button', { hasText: /^Pause$/ }).first().click();
  await sleep(1500);
  await page.screenshot({ path: path.join(dir, 'overview-1.png') });
  await sleep(1500);
  await page.screenshot({ path: path.join(dir, 'overview-2.png') });
  await selectFromObjectList(page, 'Jupiter');
  await sleep(3000);
  await page.screenshot({ path: path.join(dir, 'selected-jupiter-1.png') });
  await sleep(1500);
  await page.screenshot({ path: path.join(dir, 'selected-jupiter-2.png') });
  out({ url: URL_APP, dir, files: ['overview-1.png', 'overview-2.png', 'selected-jupiter-1.png', 'selected-jupiter-2.png'], consoleIssues: logs.slice(0, 5) });
  await browser.close();
}

const table = { commits: cmdCommits, angular: cmdAngular, buffers: cmdBuffers, shots: cmdShots };
if (!table[command]) {
  console.error('usage: probes.mjs <' + Object.keys(table).join('|') + '> [--port N] ...');
  process.exit(2);
}
await table[command]();
