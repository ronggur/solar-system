# Baseline of `main` (runtime performance)

Recorded by QA (Agent 2) in run `20261010-qa-infra`, 2026-10-10, following
[LOOP-DEV-QA.md](../LOOP-DEV-QA.md) §4 step 5 and the SPEC (AC-12).

**What was measured:** `BASE` = commit `ab11176` built in a separate `git worktree`. `src/`, `public/`,
`package*.json` and `vite.config.ts` of `ab11176` are byte-identical to `main`, so its production build
(`npm run build`, then `vite preview`) is the code of `main`. The run branch was never used for these
numbers, except where a row says "branch" (sanity comparison).

Numbers are comparable **only** with numbers from the same tool, machine, browser, viewport and DPR.
Raw output and the scripts that produced it live in
[`20261010-qa-infra/qa/`](20261010-qa-infra/qa/) (`measure.mjs`, `results/*.json`).

## Tool and fixed context

| Item | Value |
|---|---|
| Automation | Playwright 1.64.0 (scratch install outside the repo, `PW_DIR`) |
| Browser | system Google Chrome 154.0.8037.98, `chromium.launch({ channel: 'chrome' })`, headless, fresh profile per run |
| Viewport / DPR | 1440 x 900, `deviceScaleFactor: 1` |
| WebGL renderer | `ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)`, vendor `Google Inc. (Apple)`, `WebGL 2.0 (OpenGL ES 3.0 Chromium)` - the real GPU, not SwiftShader / llvmpipe |
| Machine | Apple M1 (8-core CPU, 8-core GPU), 8 GB RAM, macOS 26.6.2 (25G83), Node v24.20.0 |
| Server | `vite preview --port 4174` of the BASE build (gzip is applied by preview; transfer bytes below are on-the-wire) |
| Page | `http://localhost:4174/solar-system/` (base path), one page, one run per browser launch |
| Protocol | 30 s warm-up, then 30 s sampling with `scripts/perf-sampler.js`; 3 runs per scenario, median reported |

## Frame time (production preview build of BASE)

Median of 3 runs. Frame interval = `requestAnimationFrame` timestamp delta; a 60 Hz display gives a floor
of 16.7 ms, so p50/p95 move in 16.7 ms steps.

| Scenario | p50 (ms) | p95 (ms) | max (ms) | fps avg | frames > 33 ms | long tasks (count / total ms) |
|---|---|---|---|---|---|---|
| (a) overview, 1x, running | 66.7 | 100.0 | 200.0 | 14.6 | 437 (99.4 %) | 315 / 20 609 |
| (b) Jupiter selected via Object List, moons + satellites ON, motion resumed | 16.7 | 16.8 | 33.3 | 60.0 | 1 (0.06 %) | 0 / 0 |
| (c) paused (idle) | 16.7 | 16.7 | 16.8 | 60.0 | 0 | 0 / 0 |

Individual runs (frames, p50 / p95 / max ms, frames > 33 ms, long tasks):

| Scenario | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| (a) overview | 440; 66.7 / 100.0 / 200.0; 437; 315 | 352; 66.7 / 166.7 / 349.9; 350; 301 | 458; 66.7 / 83.4 / 133.3; 457; 333 |
| (b) selected | 1800; 16.7 / 16.8 / 33.3; 1; 0 | 599; 50.0 / 66.7 / 100.1; 598; 88 | 1800; 16.7 / 16.7 / 33.3; 1; 0 |
| (c) paused | 1801; 16.7 / 16.7 / 16.8; 0; 0 | 1801; 16.7 / 16.7 / 16.8; 0; 0 | 1800; 16.7 / 16.7 / 33.4; 1; 0 |

How to read it:

- **(a) is the heavy case.** With everything in view and the system running, the main thread is busy:
  about 10 long tasks per second (each ~65 ms), sampled frames arrive every 4th vsync (~15 fps). This is
  main-thread bound (long tasks), consistent with the CPU/DOM-side problems listed in
  [PERFORMANCE_AND_VISUALIZATION.md](../PERFORMANCE_AND_VISUALIZATION.md).
- **(b) is bimodal.** Two of three runs were a clean 60 fps; run 2 ran at ~20 fps (88 long tasks). A
  separate re-run of (b) (3 more runs, `perf-base-selected-rerun.json`) gave p50 16.7 ms in all three,
  p95 33.4 / 16.7 / 16.8 ms and 313 / 3 / 12 frames > 33 ms. Treat (b) as "usually 60 fps, occasional
  dips"; the median of 3 hides the dips, so compare the number of frames > 33 ms too.
- **(c) is a floor:** a paused scene holds 60 fps with no long tasks.
- Run-to-run spread in (a) p95 alone is 83 - 167 ms. A single p95 difference of one or two 16.7 ms steps is
  **not** evidence of a regression (see the A/B below).

### Run-to-run noise check (A/B, scenario a)

Interleaved BASE vs run branch builds, one run each per round, 3 rounds (`qa/ab-overview.sh`, raw output in
`qa/results/ab/`): p95 BASE 100.1 / 149.9 / 116.7 ms (median 116.7), branch 133.4 / 83.4 / 116.7 ms
(median 116.7); p50 66.7 ms for all six. A first, non-interleaved set on the branch gave p95 116.7 ms
against 100.0 ms for BASE: inside the spread above. No regression is claimed or measured.

## `renderer.info` growth (dev server, branch, scenario a, 1x)

Read through `window.__SOLAR_DEBUG__.info` on `npm run dev -- --port 5174` (StrictMode on, so absolute
values are not representative of production; **growth** is the signal). One page, no interaction after
load.

| Time | `memory.geometries` | `memory.textures` | `render.calls` | `render.triangles` | programs |
|---|---|---|---|---|---|
| minute 1 | 270 | 64 | 257 | 659 428 | 18 |
| minute 2 | 270 | 64 | 255 | 656 964 | 18 |
| minute 3 | 270 | 64 | 257 | 659 428 | 18 |
| minute 4 | 270 | 64 | 257 | 659 428 | 18 |
| minute 5 | 270 | 64 | 255 | 656 964 | 18 |

Growth minute 1 -> minute 5: geometries +0, textures +0, programs +0. `calls` / `triangles` oscillate
between two values (frustum visibility), not a trend. In the overview scenario the P2 trail leak is
therefore **not visible**; a selected-object variant is recorded in LOG.md.

## First load (cold cache, BASE preview build)

Cache disabled (CDP `Network.setCacheDisabled`), counted from CDP `loadingFinished.encodedDataLength`
(transfer size incl. headers, gzip applied by `vite preview`); `data:` and `blob:` URLs excluded.

| Snapshot | Requests | Transferred |
|---|---|---|
| `load` event + 5 s | 26 | 2 759 192 B (2.63 MiB) |
| `load` event + 30 s (idle-deferred GLBs included) | 40 | 7 254 428 B (6.92 MiB) |

At +30 s by type: 19 `webp` 2 306 260 B, 14 `glb` 4 495 236 B, 3 `js` 415 866 B, 1 `css` 7 056 B,
`html` 1 137 B, `ico` 15 676 B, `png` 13 197 B. No 4xx / failed requests.

10 largest requests (at +30 s):

| # | URL (under `/solar-system/`) | Transferred (B) |
|---|---|---|
| 1 | `3d-objects/satellites/osiris.glb` | 1 075 787 |
| 2 | `3d-objects/satellites/jwst.glb` | 855 609 |
| 3 | `3d-objects/satellites/lro.glb` | 716 849 |
| 4 | `3d-objects/satellites/voyager1.glb` | 295 749 |
| 5 | `3d-objects/satellites/voyager2.glb` | 295 749 |
| 6 | `assets/vendor-three-DweQknNf.js` (976 025 B decoded) | 267 573 |
| 7 | `3d-objects/satellites/cassini.glb` | 261 625 |
| 8 | `3d-objects/satellites/juno.glb` | 260 181 |
| 9 | `textures/pluto.webp` | 247 902 |
| 10 | `3d-objects/satellites/parker-solar-probe.glb` | 229 357 |

Observation (pre-existing, not part of this run's changes): `textures/sun.webp`, `earth_day.webp` and
`earth_night.webp` are each **fetched twice** (222 974 + 131 540 + 64 630 B = 419 144 B wasted). The
`<link rel="preload" as="image">` tags in `index.html` have no `crossorigin`, so Chrome logs "preload
... not used because the request credentials mode does not match" and the loaders download again.

## Chunk sizes (`npm run build` of BASE, 2355 modules)

| Chunk | Raw (kB) | gzip (kB) |
|---|---|---|
| `index-*.js` | 278.04 | 86.91 |
| `vendor-three-*.js` | 976.03 | 266.99 |
| `vendor-react-*.js` | 192.98 | 60.55 |
| `index-*.css` | 32.16 | 6.69 |

## Caveats

- **Noisy machine.** The Mac was not idle: the user's own Chrome and other apps were running, load average
  was 6 - 8 on 8 cores, ~7.5 of 8 GB RAM was in use (compressor ~3 GB, ~110 MB free), and `kernel_task` /
  `WindowServer` were busy. The agent must not close the user's applications. Expect run-to-run swings
  such as (a) p95 83 - 167 ms and the (b) run-2 dip. Numbers are valid as a before/after reference only
  when re-measured the same way, ideally with an interleaved A/B.
- **Automation, not a person.** Headless Chrome driven by Playwright; no real input, no GPU pressure from a
  visible window, no browser extensions. Selection is done through the Object List, not by clicking the
  canvas.
- **One machine, one browser, 60 Hz.** No mobile device, no Safari / Firefox, no 120 Hz display
  (see SPEC NEEDS-MANUAL). Frame intervals quantise to 16.7 ms.
- **Dev server numbers are growth-only** (StrictMode doubles effects; `inspectAttr` plugin).
- **Transfer size is gzip from `vite preview`;** the production nginx may differ (brotli, cache headers).
- **First load is localhost:** no network latency, so time-to-load is not reported, only requests and bytes.
- **Scenario (b) uses Jupiter.** Motion is paused by selection and was resumed through the Pause / Resume
  button; positions of `planet-jupiter` and `moon-io` were verified to change (see LOG.md).

## Reproduce

```bash
git worktree add --detach "$SCRATCH/base-worktree" ab11176
cd "$SCRATCH/base-worktree" && ln -s <repo>/node_modules node_modules && npm run build
npx vite preview --port 4174                      # BASE build
export PW_DIR=<dir containing node_modules/playwright>
node docs/loop/20261010-qa-infra/qa/measure.mjs machine
node docs/loop/20261010-qa-infra/qa/measure.mjs perf --port 4174 --scenario overview   # also: selected, paused
node docs/loop/20261010-qa-infra/qa/measure.mjs load --port 4174
npm run dev -- --port 5174                        # branch dev server (hook is dev-only)
node docs/loop/20261010-qa-infra/qa/measure.mjs info --port 5174 --minutes 5
```
