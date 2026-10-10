# Loop Log — 20261011-perf-render-loop
Scope: Phase A render loop (P1–P3 in PERFORMANCE_AND_VISUALIZATION.md), no visual change  ·  Branch: perf/render-loop (from main 8c37a31)  ·  Started: 2026-10-11  ·  Machine: Apple M1 (8-core CPU/GPU), 8 GB, macOS 26.6.2, Chrome 154.0.8037.98 headless via Playwright 1.64.0, ANGLE Metal, 1440×900, DPR 1

## Status: IN_PROGRESS   (current iteration: 1/2, Dev done, awaiting QA)

## Iteration summary
| Iter | Dev completed | Gates (lint/build/audit/test) | QA verdict | New findings | Verified |
|---|---|---|---|---|---|
| 0 (baseline, orchestrator) | — | ✅ / ✅ / prod ✅ (full audit 9 pre-existing) / ✅ 18 passed | — | — | — |
| 1 | Yes. P3 registry, P1 refs + memoized lines, P2 ring buffer, docs, one Dev-found regression fixed (F-1). Commits 953b4b9…f7a9a22 + docs/LOG commit (see "Dev commits") | ✅ / ✅ (index 280.49, css 32.22 kB) / ✅ prod, full audit 9 = baseline / ✅ 23 passed (18 → 23) | pending (QA iteration 1) | 2 (B-006 DEFERRED; F-1 FIXED by Dev) | 0 |
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
Iter 1 column: values measured by Dev on the dev server or the build named in the cell. Rows marked "QA" are for QA's protocol (preview build, 5-min runs, shots).

| Metric | Baseline (main 8c37a31) | Iter 1 | Iter 2 |
|---|---|---|---|
| Bundle index / vendor-three / vendor-react / css (kB raw) | 278.05 / 976.03 / 192.98 / 32.16 | 280.49 / 976.03 / 192.98 / 32.22 (index +0.9 %, css +0.2 %; within ±2 %) | |
| First load: requests / bytes (+30 s, cache off) | 40 / 7 254 432 B | QA (preview build) | |
| Frame time p50 / p95 (ms), overview, median of 3 | 66.7 / 83.4 | QA (preview build, not measured on dev server) | |
| Frame time p50 / p95 (ms), selected Jupiter, median of 3 | 16.7 / 16.8 (bimodal) | QA | |
| React commits/s, running, Planet / Moon / Satellite (dev, sum of instances) | 205 / 411 / 326 (+ HoverGlowMesh 995, ProceduralMoonMesh 395, TexturedPlanetMesh 190, GLBModel 165, anonymous 1007) | 0 / 0 / 0, all components 0 after a 40 s settle (`probes commits` copy with `--settle 40000`, 10 s window). With the 5 s protocol the counts are ~60 / 120 / 60 per s, from satellite GLB loading (see B-006) | |
| React commits/s, paused | 0 | 0 (dev, 10 s) | |
| geometries @1min → @5min, overview | 273 → 273 | 287 → 287 → 287 at min 1 / 2 / 3 (3-min run; the 5-min run is QA's). +14 vs baseline: the 13 trail geometries are now allocated once and counted, +1 not investigated | |
| geometries @1min → @5min, selected Jupiter | 276 → 276 | QA | |
| Live WebGL buffers @1min → @5min, overview / selected | 847 → 847 / 856 → 856 | overview 917 → 917 → 917 (min 1 / 2 / 3). created 1093 and deleted 176, both flat. +70 vs baseline: 26 trail buffers (position + index, 13 planets) and ~176 dev-only re-uploads after StrictMode's simulated unmount (see notes). Selected: QA | |
| Orbital ω (rad/s) vs theory, Earth / Io / ISS, 1x | 0.094 / 0.298 / 1.275 (theory 0.100 / 0.350 / 1.500) | 0.1007 / 0.3524 / 1.5103 (theory 0.100 / 0.350 / 1.500), +0.7 % (median of 3 samples) | |
| Orbital ω (rad/s) vs theory, Earth / Io / ISS, 5x | 0.472 / 1.493 / 6.397 (theory 0.500 / 1.750 / 7.500) | 0.5001 / 1.7503 / 7.5013 (theory 0.500 / 1.750 / 7.500), +0.02 % | |
| Orbital ω (rad/s) vs theory, Earth / Io / ISS, 10x | 0.952 / 3.198 / 13.705 (theory 1.000 / 3.500 / 15.000) | 1.0031 / 3.5107 / 15.0459 (theory 1.000 / 3.500 / 15.000), +0.3 % | |

## Findings
Status: OPEN → FIXED (Dev) → VERIFIED (QA) | DISPUTED | DEFERRED | NEEDS-MANUAL
Area: 3d | ui | data | build | perf | a11y | docs

Pre-run observations (orchestrator, baseline) and their iteration 1 status:

| ID | Iter | Sev | Area | Location | Finding & repro/evidence | Status | Fix (file/commit) | Regression evidence |
|---|---|---|---|---|---|---|---|---|
| B-001 | 0 | Major | perf | Planet.tsx trail block | `trailRef` is never attached on main, so the trail never runs. Owner decision A: keep the trail hidden. The ring buffer is implemented on the same gated path, and the trail is still not drawn. Visual output is unchanged by design. | FIXED (Dev), inactive path | `029a137` (TrailLine, TrailBuffer), `e7c1cfa` tests | 5 unit tests on draw order and wrap-around. Three of them fail when the draw order is broken (checked). No visual test: nothing is drawn |
| B-002 | 0 | Minor | perf | Planet/Moon/Satellite `useFrame` | ω was 5–15 % below theory on main. Cause (Dev, supported by the change): the per-frame increment used the angle from the last React render (stale closure), so increments were lost. With a ref every frame counts. | FIXED (Dev), QA to verify | `6ab0bbe`, `2941a8e`, `c9aaad6` | Dev `probes angular` on the dev server: 1x / 5x / 10x all within +0.7 % of theory (see Metrics). QA: rerun on the preview build |
| B-003 | 0 | Minor | perf | HoverGlowMesh (Planet, Moon, Satellite) | Per-frame `setPulsePhase` while hovered. Now a ref: scale and material opacity are set in `useFrame`. The pulse reads one frame earlier (not visible in the no-hover shots). | FIXED (Dev), QA to verify | `6ab0bbe`, `2941a8e`, `c9aaad6` | Not measured with hover by Dev. QA: hover a planet and moon, then check the commit probe (HoverGlowMesh 0/s) |
| B-004 | 0 | Nit | ui | ControlPanel | `Switch` / `SwitchProvider` / `Presence` re-render while running (outside Planet/Moon/Satellite; not in scope). Steady-state count is 0 now, so this was load-time only. | DEFERRED | — | — |
| B-005 | 0 | Minor | build | index.html | Sun, earth_day and earth_night are fetched twice (preload without `crossorigin`). 419 kB wasted. Pre-existing, outside this run's scope. Console still reports the preload warning (not a new message). | DEFERRED | — | — |
| B-006 | 1 | Minor | perf | App.tsx:31 (`useProgress((s) => s.active)`) | Loading-time re-renders. During the staggered satellite GLB loads (≈250 ms apart, starting after first paint), `active` flips and App re-renders, which re-renders the whole scene tree (~5 App renders/s measured). Pre-existing; not steady state. Repro: `probes commits` (5 s settle) gives Planet ~60/s, Moon ~120/s; the same run with a 40 s settle gives 0. | DEFERRED (out of scope) | — | Commit probe, 5 s vs 40 s settle (Metrics row above) |
| F-1 | 1 | Major | 3d | Planet, Moon, Satellite (orbit and trail `<primitive>`) | Regression found by Dev during the functional switch test: Show Orbits off, then on, threw `R3F: Cannot set "code-path"` (in dev) and the Controls lost switches #1–#3. Cause: the dev inspect plugin adds `code-path` to every JSX element; R3F applies it to a `<primitive>` object and writes a `code` property. Re-attaching the same memoized Line applies it a second time and throws. Baseline did not hit this because it built a new Line on every render. | FIXED (Dev) | `f7a9a22` (`src/components/MemoLine.tsx`, used by Planet orbit and trail, Moon and Satellite orbit lines) | Same toggle sequence now: 4 of 4 toggles pass, 0 page errors (baseline same sequence: 0 errors). `measure.mjs smoke`: 11 of 11 steps pass, 0 console errors. Screenshot of overview shows orbit lines |

## NEEDS-MANUAL (real device / other browsers)
- [ ] iPhone or Android Safari and Chrome: select Jupiter and a moon, confirm smooth frame time and touch behaviour, no visible change.
- [ ] Safari and Firefox: planet orbits and moons move, no artefacts from dynamic buffers or `setDrawRange`.
- [ ] 120 Hz display: planet spin is not delta-scaled (P8, out of scope). Confirm it is unchanged by this run.

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

## Merge notes
- Docs updated: `ARCHITECTURE.md` (§1, §4.1, §4.3, §6.1, §6.3, §11), `TECHNICAL.md` (§9)  ·  Counts changed: none  ·  Release/tag: not created (needs owner approval)
