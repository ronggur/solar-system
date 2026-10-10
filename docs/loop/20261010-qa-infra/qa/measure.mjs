#!/usr/bin/env node
/**
 * QA measurement harness for run 20261010-qa-infra (Playwright + system Chrome).
 *
 * Playwright is NOT a repo dependency; it is resolved from a scratch directory:
 *   PW_DIR=/path/to/dir/with/node_modules/playwright node measure.mjs <command> [options]
 *
 * Fixed context for every measurement: system Google Chrome (channel 'chrome'), headless,
 * viewport 1440x900, deviceScaleFactor 1, one page, nothing else running.
 *
 * Commands
 *   machine                          print machine / browser / WebGL renderer facts
 *   perf   --port 4174 --scenario overview|selected|paused [--runs 3] [--warmup 30000] [--sample 30000]
 *   info   --port 5174 [--minutes 5] [--select Jupiter]  renderer.info growth through window.__SOLAR_DEBUG__ (dev server)
 *   load   --port 4174               cold first load (cache disabled): requests, bytes, largest
 *   verify-selected --port 5174      dev-only: prove scenario (b) really moves objects (hook, 2 times)
 *   smoke  --port 5174               functional regression pass + console errors
 *
 * App path is http://localhost:<port>/solar-system/ (Vite base). Output is JSON on stdout.
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PW_DIR = process.env.PW_DIR;
if (!PW_DIR) {
  console.error('PW_DIR is required (directory that contains node_modules/playwright)');
  process.exit(2);
}
const { chromium } = createRequire(PW_DIR + '/')('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLER = readFileSync(path.join(HERE, '../../../../scripts/perf-sampler.js'), 'utf8');
const SHOTS = path.join(HERE, '../shots/iter1');
const VIEWPORT = { width: 1440, height: 900 };

const rest = process.argv.slice(3);
const args = {};
rest.forEach((a, i) => {
  if (a.startsWith('--')) args[a.slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true;
});
const command = process.argv[2];
const port = Number(args.port ?? 4174);
const URL_APP = `http://localhost:${port}/solar-system/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const out = (obj) => console.log(JSON.stringify(obj, null, 2));

async function launch() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => logs.push(`pageerror: ${String(e.message).slice(0, 300)}`));
  page.on('requestfailed', (r) => logs.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`http ${r.status()}: ${r.url()}`);
  });
  return { browser, context, page, logs };
}

async function openApp(page) {
  await page.goto(URL_APP, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForSelector('text=Controls', { timeout: 30000 });
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Clicks the Object List entry whose name is exactly `name`. */
async function selectFromObjectList(page, name) {
  const btn = page
    .locator('button[data-object-list-index]')
    .filter({ has: page.locator('div.truncate', { hasText: new RegExp(`^${escapeRegExp(name)}$`) }) })
    .first();
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
}

/** Text of the play/pause button: 'Pause' = running, 'Resume' = paused. */
async function playbackLabel(page) {
  const b = page.locator('button', { hasText: /^(Pause|Resume)$/ }).first();
  return (await b.innerText()).trim();
}

async function setScenario(page, scenario) {
  const steps = [];
  if (scenario === 'overview') {
    steps.push(`playback label=${await playbackLabel(page)} (Pause = running)`);
  } else if (scenario === 'selected') {
    await selectFromObjectList(page, 'Jupiter');
    await sleep(1500);
    steps.push(`label after selecting Jupiter=${await playbackLabel(page)} (selection pauses motion)`);
    await page.locator('button', { hasText: /^Resume$/ }).first().click();
    await sleep(500);
    steps.push(`label after Resume=${await playbackLabel(page)}`);
    const sw = await page.evaluate(() =>
      [...document.querySelectorAll('button[role="switch"]')].map((b) => b.getAttribute('aria-checked')),
    );
    steps.push(`switches aria-checked (Orbits, Satellites, Moons, Follow)=${JSON.stringify(sw)}`);
  } else if (scenario === 'paused') {
    await page.locator('button', { hasText: /^Pause$/ }).first().click();
    await sleep(500);
    steps.push(`label after Pause=${await playbackLabel(page)}`);
  } else {
    throw new Error('unknown scenario ' + scenario);
  }
  return steps;
}

async function runSampler(page, ms) {
  await page.evaluate((v) => {
    window.__PERF_SAMPLER_MS__ = v;
  }, ms);
  return page.evaluate(SAMPLER);
}

async function cmdMachine() {
  const { browser, page } = await launch();
  await page.setContent('<canvas id=c></canvas>');
  const gl = await page.evaluate(() => {
    const g = document.getElementById('c').getContext('webgl2');
    const e = g.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER),
      vendor: e ? g.getParameter(e.UNMASKED_VENDOR_WEBGL) : g.getParameter(g.VENDOR),
      version: g.getParameter(g.VERSION),
      dpr: window.devicePixelRatio,
      inner: [window.innerWidth, window.innerHeight],
      ua: navigator.userAgent,
    };
  });
  const pw = JSON.parse(readFileSync(path.join(PW_DIR, 'node_modules/playwright/package.json'), 'utf8')).version;
  out({ chrome: browser.version(), playwright: pw, headless: true, ...gl });
  await browser.close();
}

async function cmdPerf() {
  const scenario = args.scenario;
  const runs = Number(args.runs ?? 3);
  const warmup = Number(args.warmup ?? 30000);
  const sample = Number(args.sample ?? 30000);
  const results = [];
  let setup = [];
  for (let i = 0; i < runs; i++) {
    const { browser, page, logs } = await launch();
    await openApp(page);
    setup = await setScenario(page, scenario);
    await sleep(warmup);
    const r = await runSampler(page, sample);
    results.push({ run: i + 1, ...r, userAgent: undefined, consoleIssues: logs.length, firstIssues: logs.slice(0, 3) });
    await browser.close();
    await sleep(2000);
  }
  const pick = (f) => results.map(f);
  out({
    url: URL_APP,
    scenario,
    setup,
    warmupMs: warmup,
    sampleMs: sample,
    runs: results,
    median: {
      p50Ms: median(pick((r) => r.p50Ms)),
      p95Ms: median(pick((r) => r.p95Ms)),
      maxMs: median(pick((r) => r.maxMs)),
      fpsAvg: median(pick((r) => r.fpsAvg)),
      over33msCount: median(pick((r) => r.over33ms.count)),
      over33msPct: median(pick((r) => r.over33ms.pct)),
      longTaskCount: median(pick((r) => r.longTasks.count)),
      longTaskTotalMs: median(pick((r) => r.longTasks.totalMs)),
      frames: median(pick((r) => r.frames)),
    },
    anyHidden: results.some((r) => r.hiddenDuringRun),
    allCompleted: results.every((r) => r.endedBy === 'complete'),
  });
}

async function cmdInfo() {
  const minutes = Number(args.minutes ?? 5);
  const { browser, page, logs } = await launch();
  await openApp(page);
  if (args.select) {
    // Optional: select an object and resume motion (selection pauses it) before sampling.
    await selectFromObjectList(page, String(args.select));
    await sleep(1500);
    await page.locator('button', { hasText: /^Resume$/ }).first().click();
  }
  const t0 = Date.now();
  const read = () =>
    page.evaluate(() => {
      const i = window.__SOLAR_DEBUG__.info;
      return {
        geometries: i.memory.geometries,
        textures: i.memory.textures,
        calls: i.render.calls,
        triangles: i.render.triangles,
        programs: i.programs ? i.programs.length : null,
      };
    });
  const samples = [];
  for (let m = 1; m <= minutes; m++) {
    const wait = t0 + m * 60000 - Date.now();
    if (wait > 0) await sleep(wait);
    samples.push({ minute: m, tSec: Math.round((Date.now() - t0) / 1000), ...(await read()) });
  }
  out({ url: URL_APP, note: 'dev server (StrictMode): use growth, not absolute values', samples, consoleIssues: logs.slice(0, 5) });
  await browser.close();
}

async function cmdLoad() {
  const { browser, context, page, logs } = await launch();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url }));
  cdp.on('Network.responseReceived', (e) => {
    const r = reqs.get(e.requestId);
    if (r) Object.assign(r, { status: e.response.status, mime: e.response.mimeType });
  });
  cdp.on('Network.dataReceived', (e) => {
    const r = reqs.get(e.requestId);
    if (r) r.decoded = (r.decoded || 0) + e.dataLength;
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId);
    if (r) r.transfer = e.encodedDataLength;
  });
  const snapshot = (label) => {
    const list = [...reqs.values()].filter((r) => r.transfer !== undefined && !/^(data|blob):/.test(r.url));
    const total = list.reduce((s, r) => s + r.transfer, 0);
    return {
      label,
      requests: list.length,
      transferBytes: total,
      top10: [...list]
        .sort((a, b) => b.transfer - a.transfer)
        .slice(0, 10)
        .map((r) => ({ url: r.url.replace(`http://localhost:${port}`, ''), transfer: r.transfer, decoded: r.decoded ?? null, status: r.status })),
    };
  };
  const snaps = [];
  const t0 = Date.now();
  await page.goto(URL_APP, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await sleep(5000);
  snaps.push({ ...snapshot('load + 5 s'), tSec: Math.round((Date.now() - t0) / 1000) });
  await sleep(25000);
  snaps.push({ ...snapshot('load + 30 s (idle-deferred assets included)'), tSec: Math.round((Date.now() - t0) / 1000) });
  const bad = [...reqs.values()].filter((r) => r.status >= 400);
  const byKind = {};
  for (const r of reqs.values()) {
    if (r.transfer === undefined || /^(data|blob):/.test(r.url)) continue;
    const m = r.url.split('?')[0].match(/\.([a-z0-9]+)$/i);
    const ext = m ? m[1].toLowerCase() : 'html';
    byKind[ext] = byKind[ext] || { n: 0, bytes: 0 };
    byKind[ext].n++;
    byKind[ext].bytes += r.transfer;
  }
  const duplicates = {};
  for (const r of reqs.values()) if (r.transfer !== undefined) duplicates[r.url] = (duplicates[r.url] || 0) + 1;
  const dupes = Object.entries(duplicates)
    .filter(([, n]) => n > 1)
    .map(([url, n]) => ({ url: url.replace(`http://localhost:${port}`, ''), fetches: n }));
  const all = [...reqs.values()]
    .filter((r) => r.transfer !== undefined && !/^(data|blob):/.test(r.url))
    .map((r) => ({ url: r.url.replace(`http://localhost:${port}`, '').slice(0, 120), transfer: r.transfer, status: r.status }));
  out({ url: URL_APP, cacheDisabled: true, snapshots: snaps, byExtensionAt30s: byKind, duplicateFetches: dupes, errors4xx: bad.map((r) => r.url), allRequests: all, consoleIssues: logs.slice(0, 5) });
  await browser.close();
}

async function cmdVerifySelected() {
  const { browser, page, logs } = await launch();
  await openApp(page);
  await sleep(8000);
  const pos = (name) =>
    page.evaluate((n) => {
      const o = window.__SOLAR_DEBUG__.scene.getObjectByName(n);
      if (!o) return null;
      const v = o.getWorldPosition(o.position.clone());
      return [v.x, v.y, v.z].map((x) => Math.round(x * 1e4) / 1e4);
    }, name);
  const names = await page.evaluate(() => {
    const found = [];
    window.__SOLAR_DEBUG__.scene.traverse((o) => {
      if (/^(planet|moon|satellite)-/.test(o.name)) found.push(o.name);
    });
    return found;
  });
  const tracked = ['planet-jupiter', names.find((n) => /^moon-(io|europa|ganymede|callisto)$/.test(n))].filter(Boolean);
  await selectFromObjectList(page, 'Jupiter');
  await sleep(2000);
  const label1 = await playbackLabel(page);
  const read = async () => Object.fromEntries(await Promise.all(tracked.map(async (n) => [n, await pos(n)])));
  const pausedA = await read();
  await sleep(1500);
  const pausedB = await read();
  await page.locator('button', { hasText: /^Resume$/ }).first().click();
  await sleep(500);
  const label2 = await playbackLabel(page);
  const runA = await read();
  await sleep(3000);
  const runB = await read();
  const differs = (a, b) => tracked.some((n) => JSON.stringify(a[n]) !== JSON.stringify(b[n]));
  const toggles = await page.evaluate(() =>
    [...document.querySelectorAll('button[role="switch"]')].map((b) => b.getAttribute('aria-checked')),
  );
  out({
    sceneObjectNames: { count: names.length, sample: names.slice(0, 6) },
    tracked,
    afterSelect: { label: label1, t1: pausedA, t2: pausedB, positionChanged: differs(pausedA, pausedB) },
    afterResume: { label: label2, t1: runA, t2: runB, positionChanged: differs(runA, runB) },
    switchesAriaChecked_Orbits_Sat_Moons_Follow: toggles,
    consoleIssues: logs,
  });
  await browser.close();
}

async function cmdSmoke() {
  const { browser, page, logs } = await launch();
  const steps = [];
  const ok = (name, pass, extra = '') => steps.push({ name, pass: !!pass, extra });
  await openApp(page);
  await sleep(6000);
  ok(`typeof window.__SOLAR_DEBUG__ on port ${port}`, true, await page.evaluate(() => typeof window.__SOLAR_DEBUG__));
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? [c.width, c.height] : null;
  });
  ok('canvas present, sized to viewport', box && box[0] === 1440 && box[1] === 900, JSON.stringify(box));

  await selectFromObjectList(page, 'Jupiter');
  await sleep(2500);
  ok('selection pauses motion (label Resume)', (await playbackLabel(page)) === 'Resume');
  const jup = await page.locator('text=Jupiter').count();
  ok('Jupiter info/list visible after selection', jup > 1, `matches=${jup}`);

  await page.locator('button:has(svg.lucide-rotate-ccw)').first().click();
  await sleep(1500);
  ok('Reset View click', true);

  const search = page.locator('input[placeholder="Search objects..."]');
  await search.fill('mars');
  await sleep(300);
  const rows = await page.locator('button[data-object-list-index]').count();
  ok('search "mars" narrows the list (Mars, its moons and probes)', rows >= 1 && rows <= 12, `rows=${rows}`);
  await search.fill('');

  const sw = page.locator('button[role="switch"]');
  const n = await sw.count();
  ok('four switches present', n === 4, `n=${n}`);
  for (let i = 0; i < n; i++) {
    const before = await sw.nth(i).getAttribute('aria-checked');
    await sw.nth(i).click();
    await sleep(200);
    const after = await sw.nth(i).getAttribute('aria-checked');
    ok(`switch #${i} toggles`, before !== after, `${before}->${after}`);
    await sw.nth(i).click();
    await sleep(200);
  }

  const before = await playbackLabel(page);
  await page.keyboard.press('Space');
  await sleep(300);
  const mid = await playbackLabel(page);
  await page.keyboard.press('Space');
  await sleep(300);
  ok('Space toggles pause/resume', mid !== before && (await playbackLabel(page)) === before, `${before}->${mid}`);

  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `smoke-${port}.png`) });
  out({ url: URL_APP, steps, consoleIssues: [...new Set(logs)] });
  await browser.close();
}

const table = { machine: cmdMachine, perf: cmdPerf, info: cmdInfo, load: cmdLoad, 'verify-selected': cmdVerifySelected, smoke: cmdSmoke };
if (!table[command]) {
  console.error('usage: measure.mjs <' + Object.keys(table).join('|') + '> [--port N] [--scenario S] [--runs N]');
  process.exit(2);
}
await table[command]();
