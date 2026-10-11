# Loop Log — 20261011-perf-render-loop
Scope: Phase A render loop (P1–P3 in PERFORMANCE_AND_VISUALIZATION.md), no visual change  ·  Branch: perf/render-loop (from main 8c37a31)  ·  Started: 2026-10-11  ·  Machine: Apple M1 (8-core CPU/GPU), 8 GB, macOS 26.6.2, Chrome 154.0.8037.98 headless via Playwright 1.64.0, ANGLE Metal, 1440×900, DPR 1

## Status: IN_PROGRESS   (current iteration: 1/2, QA iteration 1 done: FAIL, open Major Q1-01 (AC-5); Dev fixes or owner waiver needed)

## Iteration summary
| Iter | Dev completed | Gates (lint/build/audit/test) | QA verdict | New findings | Verified |
|---|---|---|---|---|---|
| 0 (baseline, orchestrator) | — | ✅ / ✅ / prod ✅ (full audit 9 pre-existing) / ✅ 18 passed | — | — | — |
| 1 | Yes. P3 registry, P1 refs + memoized lines, P2 ring buffer, docs, one Dev-found regression fixed (F-1). Commits 953b4b9…f7a9a22 + docs/LOG commit (see "Dev commits") | ✅ / ✅ (index 280.49, css 32.22 kB) / ✅ prod, full audit 9 = baseline / ✅ 23 passed (QA rerun: same) | **FAIL**: 1 Major open (Q1-01, AC-5 pixel diff above noise) | 6 (Q1-01 Major; Q1-02..Q1-04 and Q1-06 Minor; Q1-05 Nit) | 3 VERIFIED (B-001, B-002, F-1); B-003 OPEN (Q1-03); B-006 DEFERRED (confirmed) |
| 2 | | | | | |

Dev commits (iteration 1, in order):
- `953b4b9` refactor(scene): add parent registry for moon and satellite lookups (P3)
- `6ab0bbe` perf(planet): remove per-frame setState and per-render lines (P1)
- `2941a8e` perf(moon): remove per-frame setState and per-render orbit line (P1)
- `c9aaad6` perf(satellite): remove per-frame setState and dispose orbit line (P1)
- `029a137` perf(planet): replace per-frame trail geometry with a ring buffer (P2)
- `e7c1cfa` test(lib): cover trail ring order and wrap-around (P2)
- `0ee0a86` docs(architecture): describe ref-based angles and parent registry
- `f7a9a22` fix(scene): avoid code-path error on re-attached orbit lines (F-1)

## Metrics (same protocol every time)
Baseline = main 8c37a31, measured in this run. Full table with methods: SPEC.md, "Baseline".
Iter 1 column: values tagged **Dev** were measured by Dev. Values tagged **QA** were measured by QA in iteration 1 with the protocol named in each cell (dev 5174 or preview 4174, Playwright + system Chrome, same machine as the baseline). Frame-time spread in the baseline is large (bimodal: 50 / 66.6 ms p50 on overview), so a difference is called real only when it is outside the base spread.

| Metric | Baseline (main 8c37a31) | Iter 1 | Iter 2 |
|---|---|---|---|
| Bundle index / vendor-three / vendor-react / css (kB raw) | 278.05 / 976.03 / 192.98 / 32.16 | **QA** (`npm run build`): 280.49 / 976.03 / 192.98 / 32.22. Index +0.9 %, css +0.2 %, gzip index 86.91 → 87.76 (+1.0 %). Within ±2 %: PASS (AC-6) | |
| First load: requests / bytes (cache off) | 26 / 2 759 196 B at +5 s; 40 / 7 254 432 B at +30 s | **QA** (preview, `measure.mjs load`): 26 / 2 760 072 B at +5 s; 40 / 7 255 308 B at +30 s (+876 B, +0.01 %). No 4xx | |
| Frame time p50 / p95 (ms), overview, A/B interleaved, 3 rounds (median) | 50.1 / 83.4 (rounds p50 50.0 / 50.1 / 66.6; p95 66.8 / 83.4 / 100) | **QA** (`ab-overview.sh`): 66.6 / 83.3 (rounds p50 66.6 / 66.6 / 50.0; p95 83.3 / 83.3 / 66.7). The branch values sit inside the base spread: no regression above 10 %, no improvement claimed (AC-4 PASS) | |
| Frame time p50 / p95 (ms), selected Jupiter, 3 runs (info only) | 16.7 / 16.8 (fps 58.6 / 15.1 / 60) | **QA** (`measure.mjs perf --scenario selected --runs 3`): 16.7 / 33.4 (fps 60.0 / 21.8 / 52.9; run 3 had 9.7 % of frames > 33 ms). Inconclusive, see Q1-06 | |
| React commits/s, running overview, dev, 10 s | Planet 205 · Moon 411 · Satellite 326 · HoverGlowMesh 995 · … (summed over instances) | **Dev** (5 s window, settle 40 s): 0 / 0 / 0, every component 0. **QA** `probes.mjs commits` as committed (5 s after load): Planet 63.7 · Moon 127.4 · Satellite 64.7 · HoverGlowMesh 307 · MemoLine 372 · TexturedPlanetMesh 57.6 · GLBModel 32.1 per s (load-time, B-006). **QA** 40 s settle: 0 for every listed component. Steady state PASS; window issue Q1-02 | |
| React commits/s, paused, dev, 10 s | 0 | **QA**: 0 | |
| geometries @1min → @5min, overview | 273 → 273 | **QA** (dev, 5 min): 279 → 279 → 279 → 279 → 279 (flat). AC-2 PASS. (Dev 3-min run: 287, flat) | |
| geometries @1min → @5min, selected Jupiter | 276 → 276 | **QA** (dev, 5 min): 264 → 264 (flat). AC-2 PASS | |
| Live WebGL buffers @1min → @5min, overview / selected | 847 → 847 / 856 → 856 | **QA** (dev, 5 min): overview 891 → 891 (created 1059, deleted 168); selected 842 → 842 (created 1002, deleted 160). Both flat. AC-2 PASS | |
| Orbital ω (rad/s) vs theory, Earth / Io / ISS, 1x | 0.094 / 0.298 / 1.275 (theory 0.100 / 0.350 / 1.500) | **QA** (dev, `probes.mjs angular` ×2, median of 6 samples): 0.1003 / 0.3512 / 1.5051, all +0.3 % vs theory: PASS (AC-3, ±1 %). Vs baseline: +6.7 % / +17.9 % / +18.0 % (Q1-04) | |
| Orbital ω (rad/s) vs theory, 5x | 0.472 / 1.493 / 6.397 (theory 0.500 / 1.750 / 7.500) | **QA**: 0.4992 / 1.7472 / 7.4878, −0.2 % vs theory: PASS | |
| Orbital ω (rad/s) vs theory, 10x | 0.952 / 3.198 / 13.705 (theory 1.000 / 3.500 / 15.000) | **QA**: 1.0005 / 3.5018 / 15.0077, +0.05 % vs theory: PASS | |
| Shots, pixel difference (pixelmatch, threshold 0.1, 1 296 000 px per image) | Noise floor (base vs base): overview 2 900 px; selected-jupiter 1 505 px | **QA** (`compare-shots.mjs`): branch vs base overview-1 15 415 px, overview-2 15 397 px; selected-jupiter-1 11 988 px, selected-jupiter-2 12 006 px. **Above noise: AC-5 not met** (Q1-01) | |

## Findings
Status: OPEN → FIXED (Dev) → VERIFIED (QA) | DISPUTED | DEFERRED | NEEDS-MANUAL
Area: 3d | ui | data | build | perf | a11y | docs
QA IDs: Q<iter>-<nn> (found by QA in that iteration). Evidence files are in `qa/results/iter1/` unless a path says otherwise.

Pre-run observations (orchestrator, baseline) and their iteration 1 status:

| ID | Iter | Sev | Area | Location | Finding & repro/evidence | Status | Fix (file/commit) | Regression evidence |
|---|---|---|---|---|---|---|---|---|
| B-001 | 0 | Major | perf | Planet.tsx trail block | `trailRef` is never attached on main, so the trail never runs. Owner decision A: keep the trail hidden. The ring buffer is implemented on the same gated path, and the trail is still not drawn. Visual output is unchanged by design. | VERIFIED (QA) | `029a137` (TrailLine, TrailBuffer), `e7c1cfa` tests | QA: `npm test` 23/23 pass (incl. trailBuffer order and wrap-around). Dev scene check (`manual-regression.mjs --debug`, dev 5174): 13 indexed trail lines, all with `drawRange.count` 0, so nothing is drawn (`manual-dev.json`). |
| B-002 | 0 | Minor | perf | Planet/Moon/Satellite `useFrame` | ω was 5–15 % below theory on main (stale closure: increments lost while React state lagged). With a ref every frame counts. | VERIFIED (QA) | `6ab0bbe`, `2941a8e`, `c9aaad6` | QA `probes.mjs angular` ×2 on dev: 1x / 5x / 10x all within ±0.4 % of theory (Metrics). Side effect in Q1-04. |
| B-003 | 0 | Minor | perf | HoverGlowMesh (Planet, Moon, Satellite) | Per-frame `setPulsePhase` while hovered. Now a ref: scale and material opacity are set in `useFrame`. The pulse reads one frame earlier. | OPEN (QA, see Q1-03) | `6ab0bbe`, `2941a8e`, `c9aaad6` | QA: hover on Jupiter in dev and preview, no errors, additive glow path runs (`manual-regression`). Commit count under hover NOT measured; value/reason text incomplete (Q1-03). |
| B-004 | 0 | Nit | ui | ControlPanel | `Switch` / `SwitchProvider` / `Presence` re-render while running (outside scope). Steady-state count is 0; load-time only. | DEFERRED | — | — |
| B-005 | 0 | Minor | build | index.html | Sun, earth_day and earth_night are fetched twice (preload without `crossorigin`). 419 kB wasted. Pre-existing. Same preload warnings on base and branch preview (QA console comparison). | DEFERRED | — | `manual-base-preview.json` / `manual-branch-preview.json` |
| B-006 | 1 | Minor | perf | App.tsx:31 (`useProgress((s) => s.active)`) | Loading-time re-renders during the staggered satellite GLB loads. Pre-existing; not steady state. | DEFERRED (out of scope) | — | QA: commits probe 5 s window non-zero, 40 s settle zero (Q1-02). |
| F-1 | 1 | Major | 3d | Planet, Moon, Satellite (orbit and trail lines) | Dev-found regression: Orbits off then on threw `R3F: Cannot set "code-path"` (dev only) and lost the Controls switches. Cause: inspect plugin adds `code-path` to JSX; re-attaching a memoized `<primitive>` applied it twice. | VERIFIED (QA) | `f7a9a22` (`src/components/MemoLine.tsx`) | QA on dev, `manual-regression.mjs --debug`: Orbits, Satellites and Moons switches each toggled off and on; 0 console errors, no `code-path` error, all switches restored (`manual-dev.json`). |
| Q1-01 | 1 | **Major** | 3d | `probes.mjs shots` → `shots/iter1/branch`, `qa/compare-shots.mjs` | **AC-5 not met.** Pixel difference vs BASE is above the BASE noise floor: overview 15 415 / 15 397 px vs 2 900 px; selected-jupiter 11 988 / 12 006 px vs 1 505 px. The diff image (`shots/iter1/diff/diff-overview-1.png`) lies on the labels and on the moons and satellites (Jupiter and Saturn moons, Mercury and Venus labels), not on the Sun, planet surfaces or the UI. Likely cause: the ω fix (Q1-04) combined with the wall-clock time before the probe pauses (6 s after load, which differs between builds). **Not isolated**, so the render path is not proven unchanged. Repro: `probes.mjs shots --port 4174 --out docs/loop/20261011-perf-render-loop/shots/iter1/branch`, then `compare-shots.mjs base branch diff`. | OPEN | — (Dev: controlled re-shoot at an identical simulated state, or an owner waiver written into SPEC AC-5) | `results/iter1/compare-shots.json`, `shots/iter1/branch`, `shots/iter1/diff` (gitignored) |
| Q1-02 | 1 | Minor | perf | `qa/probes.mjs commits` (AC-1 window) | AC-1 steady state holds: every listed component is 0 commits/s after a 40 s settle. The committed command measures 5 s after load and shows Planet 63.7, Moon 127.4, Satellite 64.7, HoverGlowMesh 307, MemoLine 372, TexturedPlanetMesh 57.6, GLBModel 32.1 per s (B-006). The LOG note "`probes commits` copy with `--settle 40000`" refers to a copy that is not in the repo; `probes.mjs` has no settle option (QA used a copy with `await sleep(Number(args.settle ?? 5000))`). Owner decision needed on the AC-1 window. | OPEN | — | `results/iter1/commits-5s.json`, `results/iter1/commits-40s-settle.json` |
| Q1-03 | 1 | Minor | docs | Planet.tsx `HoverGlowMesh`, Moon.tsx `HoverGlowMesh`, Satellite.tsx `HoverGlowMesh` | (f) hidden visual change is only partly recorded. The pulse phase moved from state to a ref, applied in `useFrame`. Values are unchanged: planet scale 1.15 ± 0.05 and opacity 0.3 ± 0.1 (phase ×3 per s); moon scale 1.3 ± 0.05 and opacity 0.25 ± 0.1 (×3); satellite scale base ± 0.3 and opacity 0.1 ± 0.05 (×4). The LOG says only "reads one frame earlier". Write the values and the reason in the LOG. The hover commit count (HoverGlowMesh 0/s, as B-003 asks) was not measured. | OPEN | — | — |
| Q1-04 | 1 | Minor | perf | Planet/Moon/Satellite `useFrame` (ω) | Orbital motion is now at theory speed, so bodies move visibly faster than on main at 1x: Earth 0.094 → 0.1003 rad/s (+6.7 %), Io 0.298 → 0.351 (+17.9 %), ISS 1.275 → 1.505 (+18.0 %). The owner accepted this in the AC-3 reference decision, but the SPEC's "No visual change" and the Merge notes do not say it. State it in the PR description and the Merge notes. | OPEN | — | `results/iter1/angular-1.json`, `angular-2.json`, Metrics |
| Q1-05 | 1 | Nit | perf | SolarSystem.tsx:304, 341, 377 | Object List selection effects still call `scene.getObjectByName`. They run on selection, not per frame, so the SPEC allows it. Could use the registry later. | DEFERRED | — | — |
| Q1-06 | 1 | Minor | perf | Selected Jupiter scene (info) | Selected-scene frame time is inconclusive. Branch: 60.0 / 21.8 / 52.9 fps, p95 16.8 / 66.6 / 33.4 ms. Base: 58.6 / 15.1 / 60 fps, p95 16.8 / 83.4 / 16.7 ms. The base spread alone covers the branch numbers, so there is neither proof of a regression nor proof of none. Needs at least 5 interleaved runs per variant before a claim. | OPEN | — | `results/iter1/perf-selected-branch.json`, `results/base/perf-selected.json` |

## NEEDS-MANUAL (real device / other browsers)
- [ ] iPhone or Android Safari and Chrome: select Jupiter and a moon, confirm smooth frame time and touch behaviour, no visible change.
- [ ] Safari and Firefox: planet orbits and moons move, no artefacts from dynamic buffers or `setDrawRange`.
- [ ] 120 Hz display: planet spin is not delta-scaled (P8, out of scope). Confirm it is unchanged by this run.
- [ ] Desktop pointer (not automated by QA): hover Jupiter and a moon, and compare the pulse with main by eye (Q1-03).

## Decisions & notes
- Owner decision (2026-10-11): AC-3 reference = theory ω (`orbitalSpeed × speed × 0.1`), not the baseline measurement (baseline is 5–15 % low).
- Owner decision (2026-10-11): P2 option A — keep the trail hidden, ring buffer only, identical visuals. Option B (visible trail) is a separate run.
- Owner approval (2026-10-11): SPEC approved, Workflow `loop-dev-qa` started (maxIterations 2). No push, PR, merge, tag or release.
- Scope extensions over the doc's text, recorded in SPEC: `HoverGlowMesh` `setPulsePhase` (P1), follow-mode `getObjectByName` in `SolarSystem.tsx` (P3).
- Dev (iter 1), registry: Sun, Planet, Moon and Satellite register their group in a layout effect (`useRegisterObject`, `src/lib/sceneRegistry.ts`) and remove it on unmount. Moons and satellites look up their parent with `Map.get` each frame (no allocation). When Moons are hidden, `moon-moon` is missing and satellites with parent `moon` fall back exactly as before. The Object List selection effects in `SolarSystem.tsx` still use `scene.getObjectByName`; they run on selection changes, not per frame, so they are out of the P3 scope.
- Dev (iter 1), P2 check: the trail is not drawn, so the seam check (SPEC: "must be checked") was done on the draw order, not visually. `TrailBuffer.writeDrawOrder()` returns slots oldest→newest across the wrap-around (tests in `tests/trailBuffer.test.ts`). A visible trail (option B) needs a visual check in its own run.
- Dev (iter 1), random start angles: the `useState(() => Math.random() * 2π)` calls keep their order, so seeded starts match the baseline. The running angle is updated in the same frame it is used; Moon and Satellite used to position from the previous frame's state. The difference is one frame and is not visible.
- Dev (iter 1), StrictMode (dev only): the orbit and trail effects dispose geometry and material at the simulated unmount. Three.js re-uploads them on the next draw, so the scene stays correct. This causes the dev-only "deleted 176" and extra "created" buffer counts. Production builds do not run the double effect. Growth is flat (AC-2).
- Dev (iter 1), environment: the worktree's `node_modules` lacked `autoprefixer` (a declared devDependency), so `npm run build` failed in PostCSS. `npm ci` from the committed lockfile fixed it. `package.json` and `package-lock.json` are unchanged (diff vs 8c37a31 is empty).
- Dev (iter 1), probe protocol: `probes.mjs commits` starts measuring 5 s after load, while satellite GLBs are still streaming. The baseline used the same window, so both numbers include loading. QA should report the 5 s and 40 s settle numbers, and AC-1 applies to the settled one.
- Not measured by Dev (QA's protocol): frame time on the preview build, first-load bytes, selected-scene geometries and buffers at 5 min, AC-5 shots, hover commits, the manual AC-7 items on the preview.
- Docs changed in iter 1: `ARCHITECTURE.md` §1 (name-based lookups), §4.1 (registry), §4.3 (angles in refs), §6.1 (orbit and trail), §6.3 (moon orbit line), §11 (limitations); `TECHNICAL.md` §9 (two debugging lines about per-frame re-renders and the trail leak). `PERFORMANCE_AND_VISUALIZATION.md` is unchanged (checkbox is the orchestrator's after PASS).

- QA (iter 1), gates: lint ✅; build ✅ (`__SOLAR_DEBUG__` in dist: 0 hits); `npm test` 23/23 ✅; `npm audit --omit=dev --audit-level=moderate` 0 ✅; full audit 9 = baseline ✅; `package.json` and `package-lock.json` unchanged vs 8c37a31 ✅.
- QA (iter 1), code review: no `setState`, `new` allocation or `getObjectByName` inside the touched `useFrame` bodies. Registry cleanup is identity-checked; effects dispose geometry and material. Random start-angle calls keep their order in the code (AC-5 could not confirm it, see Q1-01). Trail seam: drawn through the index in time order, not visible (B-001).
- QA (iter 1), follow mode (`qa/follow-check.mjs`, dev): with Follow on, Jupiter stays 0.008–0.010 (NDC from centre) for 6 s; with Follow off for 3 s it drifts to 0.040. Directional evidence only.
- QA (iter 1), console: dev and preview runs have 0 errors. Preview base and branch show the same 32 warnings (GSAP target, preload, DialogContent description), so no new warning (AC-7). The Object List clicks (Jupiter, Io, one satellite) ran without error; the satellite panel was not checked by eye.
- QA (iter 1), process note: one buffer-probe run was accidentally duplicated in background and overwrote the same result files. Both buffer scenarios were rerun one at a time; only the clean runs are in `results/iter1/`.
- QA (iter 1), tools: `qa/compare-shots.mjs`, `qa/manual-regression.mjs` and `qa/follow-check.mjs` were added under `qa/`. `pngjs` and `pixelmatch` are installed only in the scratch Playwright directory, not in the repo.
- QA (iter 1), needed from owner or Dev before iteration 2: decide Q1-01 (controlled re-shoot or written waiver), the AC-1 window (Q1-02), and whether the speed change in Q1-04 goes into the PR text as a user-visible change.

## Merge notes
- Docs updated: `ARCHITECTURE.md` (§1, §4.1, §4.3, §6.1, §6.3, §11), `TECHNICAL.md` (§9)  ·  Counts changed: none  ·  Release/tag: not created (needs owner approval)

## Owner delegation (2026-10-11)
- Q1-04 disposition: DECIDED. Keep the documented ω formula (theory). Speed change is a behaviour fix, to be stated in the PR. See SPEC "Decisions made after iteration 1".
- Escalation handled by a new Workflow run starting at iteration 2 (cap of 2 still applies). Pending commit QA scripts: `ddc9c32`.
