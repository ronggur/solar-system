# SPEC — 20261011-perf-render-loop

## Goal

Phase A of [PERFORMANCE_AND_VISUALIZATION.md](../../PERFORMANCE_AND_VISUALIZATION.md) (P1–P3): stop
per-frame React state updates in `Planet`, `Moon` and `Satellite`, stop per-frame orbit/trail
allocations, and stop per-frame scene-graph lookups. **No visual change.** Behaviour, data and assets
stay identical.

## Out of scope

- UI components, data files, assets, shaders (Sun, Earth), new dependencies, `.github/**`, `vite.config.ts`.
- P4–P8 and V1–V8 (labels, demand rendering, DPR, moon texture generation, KTX2, Sun glow, Earth
  shader, hit targets, orbit toggle, follow fix, tilt, reticle, mobile layout, delta-scaled spin).
  In particular, planet spin stays `rotation.y += rotationSpeed` per frame (P8) so the motion is unchanged.
- **Trail sampling stays per frame (100 points).** The doc's "sample by arc distance" would change the
  trail's look, so it is not part of this run.
- Sun and starfield per-frame rotation (P5), since it affects idle rendering only.

## Implementation scope

- **P1 — no per-frame setState, no per-frame allocation in Planet / Moon / Satellite.**
  - Orbit angle lives in a `useRef`. Position is mutated directly. The React state is read only once, at mount.
  - **Extension beyond the doc's P1 text:** `HoverGlowMesh` (in `Planet.tsx`) calls `setPulsePhase` inside
    `useFrame` while hovered. It is a per-frame setState and falls under the same rule. Move it to a ref.
    This makes the hover pulse read the phase one frame earlier than before, which is not visible in
    the no-hover screenshots of AC-5. Record the change in LOG.
  - Orbit lines are created once with `useMemo` and disposed on unmount. No `THREE.Line` or
    `LineBasicMaterial` is created inline in JSX.
  - Module-level scratch `Vector3` objects replace per-frame `new THREE.Vector3()` in `useFrame`
    (`Planet.tsx`, `Moon.tsx`, `Satellite.tsx`, and the follow-mode `useFrame` in `SolarSystem.tsx`).
- **P2 — trail as a preallocated ring buffer.** One `BufferAttribute` (100 × 3 floats) is allocated
  once per planet. Each frame writes one point and calls `setDrawRange`. No geometry or attribute is
  created per frame. The geometry is disposed on unmount. Draw the buffer in chronological order, so
  the wrap-around point produces no seam (a segment from newest to oldest). This must be checked.
  **Decided by owner (2026-10-11): option A.** On main the trail never runs (`trailRef` is not attached).
  Keep the trail hidden, so visuals stay identical. Implement the ring buffer on the same code path
  (do not attach `trailRef` to make it visible). Option B (visible trail, visual change) is a separate run.
- **P3 — parent registry replaces `scene.getObjectByName` per frame.** A `Map<id, Object3D>` (created in
  `SolarSystem`, passed down through context or a ref, filled on mount, removed on unmount). Moons and
  satellites look up their parent there. The follow-mode lookup in `SolarSystem.tsx` (`useFrame`,
  currently `getObjectByName` each frame) uses the same registry. Parent `moon-moon` (satellites with
  `parentPlanet: 'moon'`) must still resolve.

## Implementation constraints (must hold)

- **Random start angles stay identical in call count and order.** The start angle is still read from
  `useState(() => Math.random() * 2π)` (or an equivalent lazy initializer), and then copied into the
  ref. Do not call `Math.random()` inside `useRef(...)` on every render. Seeded runs (AC-3, AC-5) rely on
  this.
- Speed formula unchanged: `angle += orbitalSpeed × speedMultiplier × delta × 0.1` (frame-rate
  independent; no change to `delta` handling).
- `StrictMode` (dev) mounts effects twice. Registry entries and disposals must be correct under a double mount.
- No `setState` inside `useFrame`, no `new Vector3/Line/Material/BufferAttribute` inside `useFrame`, no
  `scene.getObjectByName` inside `useFrame` (new or existing code touched by this run).
- Docs: update only statements made false by this change (`ARCHITECTURE.md` §4.3 "angle in React
  state", §6.1 trail and orbit line, §6.3 orbit lines). The progress checkbox in
  `PERFORMANCE_AND_VISUALIZATION.md` is updated by the orchestrator after PASS, not by Dev.

## Baseline (measured on main, SHA 8c37a31, this run)

Measured by the orchestrator at the start of the run, not taken from `baseline-main.md`
(which is from ab11176). Machine and tools are in LOG.md.

Machine: Apple M1 (8-core CPU, 8-core GPU), 8 GB, macOS 26.6.2, Node v24.20.0. Chrome 154.0.8037.98 via
Playwright 1.64.0 (`channel: 'chrome'`, headless). ANGLE Metal renderer, WebGL 2.0, viewport 1440×900, DPR 1.
**Caveat:** the machine was not idle during the baseline (load average 4–6 on 8 cores). Frame-time numbers
are therefore noisier than an idle run, as in Run 0.

| Metric | Baseline (main 8c37a31) |
|---|---|
| lint / build / test | green / green / 18 passed (no pre-existing failures) |
| audit | full: 9 vulnerabilities (dev tooling, pre-existing). `--omit=dev`: 0 (the CI gate) |
| Bundle kB raw (gzip): index / vendor-three / vendor-react / css | 278.05 (86.91) / 976.03 (266.99) / 192.98 (60.55) / 32.16 (6.69) |
| `__SOLAR_DEBUG__` in `dist/` | 0 |
| First load, cache off: requests / bytes at +5 s; at +30 s | 26 / 2 759 196 B; 40 / 7 254 432 B. No 4xx. Sun, Earth day and night fetched twice (pre-existing, 419 kB) |
| Frame time overview (3 runs, median): p50 / p95 / max (ms) | 66.7 / 83.4 / 266.7 (fps 14.7; 99.75 % of frames > 33 ms; ~350 long tasks, ~22 s total) |
| Frame time selected Jupiter, moons + satellites ON (3 runs, median) | p50 16.7 / p95 16.8 / max 50.1. Bimodal: run 2 ran at ~15 fps with 336 long tasks (as in Run 0) |
| Frame time paused (3 runs, median) | p50 16.7 / p95 16.7 / 60 fps, 0 long tasks |
| React commits/s, running overview, dev, 10 s (fiber renders summed over instances) | Planet 205 · Moon 411 · Satellite 326 · HoverGlowMesh 995 · ProceduralMoonMesh 395 · TexturedPlanetMesh 190 · GLBModel 165 · anonymous 1007 · EarthMesh 16 · TexturedMoonMesh 16 · SaturnRings 16 · KuiperBelt 16 |
| React commits/s, paused, dev, 10 s | 0 |
| `renderer.info.memory.geometries`, dev, overview, 5 min | 273 at min 1 → 273 at min 5 (flat) |
| `renderer.info.memory.geometries`, dev, selected Jupiter + orbits/moons/satellites, 5 min | 276 → 276 (flat) |
| Live WebGL buffers (created − deleted), overview / selected | 847 → 847 / 856 → 856 (flat). Created: 1015 → 1015 / 1024 → 1024 |
| Orbital ω, rad/s, dev, measured (theory in brackets), 1x / 5x / 10x | Earth 0.094 (0.100) / 0.472 (0.500) / 0.952 (1.000) · Io 0.298 (0.350) / 1.493 (1.750) / 3.198 (3.500) · ISS 1.275 (1.500) / 6.397 (7.500) / 13.705 (15.000). The baseline is **5–15 % below theory** at every speed, in a consistent pattern per body |
| Shots (seeded, paused, prod preview) | `shots/base/`: overview-1/2, selected-jupiter-1/2 (gitignored). Overview 230 kB, selected 315 kB per PNG |

**Finding (P2 does not run on main).** `trailRef` is declared in `Planet.tsx:288` but never attached to any
element. `trailRef.current` is always `null`, so the trail block (`setFromPoints` per frame) never runs. The
baseline counters above show no per-frame GPU buffer growth, which matches this. On main there is no
visible trail and no P2 leak. The doc's P2 description does not match the current code.

**Decision (owner, 2026-10-11): option A.** Attaching the ref would make the trail visible, which is a visual
change, so the trail stays hidden in this run. AC-2's P2 part therefore cannot show a before/after difference.
The evidence is the code path plus the flat buffer counters.

### Acceptance-criteria reference values

- AC-3 reference: theory `orbitalSpeed × speed × 0.1`, not the baseline measurement (owner decision, 2026-10-11; see AC-3 below).

## Acceptance criteria (testable)

- **AC-1 (no per-frame React commits).** `probes.mjs commits` (dev 5174, 10 s, running, overview).
  The components below must show **0 commits/s** after the change:
  `Planet`, `Moon`, `Satellite`, `HoverGlowMesh`, `TexturedPlanetMesh`, `EarthMesh`, `ProceduralMoonMesh`,
  `TexturedMoonMesh`, `GLBModel`, `anonymous`. These are children that re-render only because their
  parent re-renders each frame, so they must reach zero too. Baseline: see table.
  *Note:* on `main`, the **paused** state already shows 0 commits, so "idle" is only discriminating when
  the scene is running. The running case is the pass/fail condition.
- **AC-2 (flat GPU resources in the selected scene).** `probes.mjs buffers` (dev 5174, 5 min, selected
  Jupiter with Orbits, Satellites, Moons ON and motion resumed; and overview). Compare minute 1 and minute 5:
  - `renderer.info.memory.geometries`: flat (±0). **This is the criterion as written in the brief.**
  - **Supplementary, added in this SPEC:** live WebGL buffers = `createBuffer − deleteBuffer`, flat (±0).
    Reason: the P2 leak is replaced `BufferAttribute`s, which `geometries` does not count (the same
    `BufferGeometry` object is reused). A flat `geometries` count alone cannot show P2 is fixed.
  - Baseline overview geometries 270 → 270 (Run 0, ab11176). The selected-scene values are in the table.
- **AC-3 (orbital speed unchanged, ±1 %).** `probes.mjs angular` at 1x, 5x and 10x (dev 5174, same seeded
  `Math.random`). Reference value per body: **theoretical ω = orbitalSpeed × speed × 0.1 rad/s**
  (Earth 1, Io 3.5, ISS 15 from `src/data`). **Pass: within ±1 % of theory at 1x, 5x and 10x.** The brief's "±1 % vs
  baseline" would require keeping the baseline's 5–15 % shortfall. If P1 removes that shortfall, ω moves
  toward theory. That is recorded as a result, not a regression. Angles are accumulated in 50 ms steps, so
  fast bodies do not alias.
- **AC-4 (frame time, no regression > 10 %).** `ab-overview.sh` ROUNDS=3 interleaved, BASE worktree at 8c37a31
  vs branch, `measure.mjs` overview (3 runs each in the script). Report median p50/p95 and frames > 33 ms.
  Claim improvement only if it is outside the A/B noise measured on BASE. The `measure.mjs perf selected`
  scenario on the branch is informational.
- **AC-5 (no visual change).** `probes.mjs shots` (production preview 4174, seeded `Math.random`, paused):
  overview and selected Jupiter, two frames each. Compare branch against BASE. The pixel difference must be
  at the noise level, measured as BASE overview-1 vs overview-2 and BASE selected-jupiter-1 vs -2.
  The hover pulse is not in these shots (no pointer), so the P1 pulse change is not measured here.
- **AC-6 (gates).** `npm run lint`, `npm run build`, `npm test`, `npm audit --omit=dev --audit-level=moderate`
  green. Chunk sizes within ±2 % of the baseline table. `package.json` and `package-lock.json` unchanged
  (no new dependencies). `__SOLAR_DEBUG__` absent from `dist/`. Full `npm audit` (dev tooling) has no more
  vulnerabilities than the baseline 9.
- **AC-7 (functional parity).** `measure.mjs smoke` and `verify-selected` on dev 5174 pass. Manual pass on
  the production preview: Object List selection (Jupiter, an Earth moon, a satellite), Follow Object,
  Reset View, Orbits / Satellites / Moons toggles, pause/resume, info panels (close, "Continue Exploring"),
  help dialog. No new console errors or warnings compared with BASE.

## Data / scene changes

None. No counts change, so README and `index.html` are not touched.

## Design

Not applicable (no UI change). No `design-*.md` is produced.

## Performance budget

- Draw calls: unchanged (same meshes). Triangles: unchanged.
- Geometries and buffers at steady state: flat (AC-2).
- Chunk sizes: within ±2 % (AC-6).

## Needs real device / other browser (NEEDS-MANUAL)

- iPhone / Android Safari and Chrome: frame time and touch behaviour.
- Safari and Firefox: WebGL behaviour of `setDrawRange` and dynamic buffers.
- 120 Hz display: planet spin is still not delta-scaled (P8, out of scope), so motion speed there is unchanged.

## Decisions made after iteration 1 (delegated to the orchestrator, 2026-10-11)

- **Orbital speed (Q1-04): keep the documented formula** `angle += orbitalSpeed × speed × delta × 0.1`
  (ARCHITECTURE §4.3). Main measured 5–15 % below it in the dev server under load, which is most likely
  lost increments from the stale `setAngle` closure. The change is a visible behaviour change of up to
  +18 % on dev for fast bodies. It must be stated as a behaviour fix in the PR, not hidden. Production speed
  on main at 60 fps was not measured, so the size of the change there is unknown.
- **Resume path:** a new Workflow run starts at iteration 2 (`startIteration: 2`). This is still within the
  two-iteration cap. Open items: Q1-01 (AC-5 pixel diff; use `qa/controlled-shots.mjs` for a frozen clock and
  separate speed-caused differences from timing noise), Q1-03 (document hover pulse change), Q1-02 and Q1-06
  (measurements), B-003.
