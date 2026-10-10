# Loop Log — 20261011-perf-render-loop
Scope: Phase A render loop (P1–P3 in PERFORMANCE_AND_VISUALIZATION.md), no visual change  ·  Branch: perf/render-loop (from main 8c37a31)  ·  Started: 2026-10-11  ·  Machine: Apple M1 (8-core CPU/GPU), 8 GB, macOS 26.6.2, Chrome 154.0.8037.98 headless via Playwright 1.64.0, ANGLE Metal, 1440×900, DPR 1

## Status: IN_PROGRESS   (current iteration: 0/2, awaiting owner confirmation of SPEC)

## Iteration summary
| Iter | Dev completed | Gates (lint/build/audit/test) | QA verdict | New findings | Verified |
|---|---|---|---|---|---|
| 0 (baseline, orchestrator) | — | ✅ / ✅ / prod ✅ (full audit 9 pre-existing) / ✅ 18 passed | — | — | — |
| 1 | | | | | |
| 2 | | | | | |

## Metrics (same protocol every time)
Baseline = main 8c37a31, measured in this run. Full table with methods: SPEC.md, "Baseline".

| Metric | Baseline (main 8c37a31) | Iter 1 | Iter 2 |
|---|---|---|---|
| Bundle index / vendor-three / vendor-react / css (kB raw) | 278.05 / 976.03 / 192.98 / 32.16 | | |
| First load: requests / bytes (+30 s, cache off) | 40 / 7 254 432 B | | |
| Frame time p50 / p95 (ms), overview, median of 3 | 66.7 / 83.4 | | |
| Frame time p50 / p95 (ms), selected Jupiter, median of 3 | 16.7 / 16.8 (bimodal) | | |
| React commits/s, running, Planet / Moon / Satellite (dev, sum of instances) | 205 / 411 / 326 (+ HoverGlowMesh 995, ProceduralMoonMesh 395, TexturedPlanetMesh 190, GLBModel 165, anonymous 1007) | | |
| React commits/s, paused | 0 | | |
| geometries @1min → @5min, overview | 273 → 273 | | |
| geometries @1min → @5min, selected Jupiter | 276 → 276 | | |
| Live WebGL buffers @1min → @5min, overview / selected | 847 → 847 / 856 → 856 | | |
| Orbital ω (rad/s) vs theory, Earth / Io / ISS, 1x | 0.094 / 0.298 / 1.275 (theory 0.100 / 0.350 / 1.500) | | |
| Orbital ω (rad/s) vs theory, Earth / Io / ISS, 5x | 0.472 / 1.493 / 6.397 (theory 0.500 / 1.750 / 7.500) | | |
| Orbital ω (rad/s) vs theory, Earth / Io / ISS, 10x | 0.952 / 3.198 / 13.705 (theory 1.000 / 3.500 / 15.000) | | |

## Findings
Status: OPEN → FIXED (Dev) → VERIFIED (QA) | DISPUTED | DEFERRED | NEEDS-MANUAL
Area: 3d | ui | data | build | perf | a11y | docs

Pre-run observations (orchestrator, baseline; not yet findings of an iteration):

| ID | Iter | Sev | Area | Location | Finding & repro/evidence | Status | Fix (file/commit) | Regression evidence |
|---|---|---|---|---|---|---|---|---|
| B-001 | 0 | Major | perf | Planet.tsx:288, 348–353 | `trailRef` is never attached to an element, so the trail block (per-frame `setFromPoints`) never runs on main. The P2 leak described in the doc does not occur. The trail is invisible on main. Doc P2 is inaccurate. Owner decision: option A (keep hidden). | DECIDED (A); doc P2 to be corrected in the docs step | — | Counters flat (buffers 847→847; created 1015→1015) |
| B-002 | 0 | Minor | perf | SPEC AC-3 / Planet.tsx:341–343, Moon.tsx:169–171, Satellite.tsx:202–204 | Baseline orbital ω is 5–15 % below theory at every speed (dev server). Suspected cause: `setAngle(angle + Δ)` uses a stale closure, so frames that run before a React commit lose increments. Not verified. QA to confirm after P1. | OPEN (verify in QA) | — | Baseline table (SPEC) |
| B-003 | 0 | Minor | perf | Planet.tsx:95, HoverGlowMesh | Per-frame `setPulsePhase` while hovered. Added to P1 scope by SPEC extension. | OPEN (in scope) | — | — |
| B-004 | 0 | Nit | ui | ControlPanel | `Switch` / `SwitchProvider` / `Presence` re-render ~33/s while running (outside Planet/Moon/Satellite; not in scope). | DEFERRED | — | — |
| B-005 | 0 | Minor | build | index.html | Sun, earth_day and earth_night are fetched twice (preload without `crossorigin`). 419 kB wasted. Pre-existing, outside this run's scope. | DEFERRED | — | — |

## NEEDS-MANUAL (real device / other browsers)
- [ ] iPhone or Android Safari and Chrome: select Jupiter and a moon, confirm smooth frame time and touch behaviour, no visible change.
- [ ] Safari and Firefox: planet orbits and moons move, no artefacts from dynamic buffers or `setDrawRange`.
- [ ] 120 Hz display: planet spin is not delta-scaled (P8, out of scope). Confirm it is unchanged by this run.

## Decisions & notes
- Owner decision (2026-10-11): AC-3 reference = theory ω (`orbitalSpeed × speed × 0.1`), not the baseline measurement (baseline is 5–15 % low).
- Owner decision (2026-10-11): P2 option A — keep the trail hidden, ring buffer only, identical visuals. Option B (visible trail) is a separate run.
- Owner approval (2026-10-11): SPEC approved, Workflow `loop-dev-qa` started (maxIterations 2). No push, PR, merge, tag or release.
- Scope extensions over the doc's text, recorded in SPEC: `HoverGlowMesh` `setPulsePhase` (P1), follow-mode `getObjectByName` in `SolarSystem.tsx` (P3).
- Measurement tooling: `measure.mjs` (Run 0) plus `probes.mjs` (this run: commits, angular, buffers, shots). Raw results: `qa/results/base/`.
- AC-2 added supplementary metric: live WebGL buffers. Reason: `renderer.info.memory.geometries` does not count replaced attributes.
- Working tree: this run's prep files (SPEC, LOG, qa/, workflow.js) are not yet committed.

## Merge notes
- Docs updated: none yet (ARCHITECTURE §4.3/§6.1/§6.3 planned in iteration 1).  ·  Counts changed: none  ·  Release/tag: not created (needs owner approval)
