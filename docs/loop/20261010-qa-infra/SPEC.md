# SPEC — 20261010-qa-infra

Run 0 of the Dev ↔ QA loop ([LOOP-DEV-QA.md](../../LOOP-DEV-QA.md)). Branch: `chore/qa-infra`, base:
`docs/consolidate-docs-and-loop-playbook` @ `ab11176`.

## Goal

Give later runs objective evidence tooling, **without changing production runtime behaviour**:

1. A dev-only debug hook, `window.__SOLAR_DEBUG__`, exposing renderer counters to the browser QA.
2. Vitest + `npm test` with data-integrity tests, so data regressions fail automatically.
3. `scripts/perf-sampler.js`, a paste-into-console frame-time/long-task sampler.
4. A recorded performance baseline of the current code: `docs/loop/baseline-main.md`.

## Out of scope

- Any change to 3D or UI components, scene behaviour, styling, or data values.
- Changes to `.github/workflows/**`. Adding `npm test` to `quality.yml` is **DEFERRED** (owner decision,
  see Deferred below).
- Fixing the pre-existing `npm audit` advisories (see Baseline).
- Pushing, opening a PR, merging, tagging, or creating a release.
- Adding Playwright (or any browser-automation package) to `package.json`; it is installed in a
  scratch directory outside the repo (see Measurement tooling).

## Baseline (measured on BASE @ `ab11176`; machine: macOS Darwin 25.6.0, Node v24.20.0, npm 11.19.0)

`ab11176` differs from `main` only in docs, `README.md`, `RELEASE_NOTES.md`, `index.html` meta text and
the removal of `GITHUB_DESCRIPTION.md`. `src/`, `public/`, `package*.json`, `vite.config.ts` are
byte-identical to `main`, so build output and runtime are those of `main`.

| Metric | Value |
|---|---|
| `npm run lint` | green (0 issues) |
| `npm run build` | green (`tsc -b` + `vite build`, 2355 modules) |
| Bundle: index / vendor-three / vendor-react / css (kB) | 278.04 / 976.03 / 192.98 / 32.16 |
| Bundle gzip: index / vendor-three / vendor-react / css (kB) | 86.91 / 266.99 / 60.55 / 6.69 |
| `__SOLAR_DEBUG__` in `dist/` | 0 matches |
| `npm audit --audit-level=moderate` | **NOT clean, pre-existing**: 18 advisories (5 moderate, 13 high), all but one in dev tooling (`@gltf-transform/cli`, `tailwindcss` 3, `postcss`, `brace-expansion`, …) |
| `npm audit --omit=dev` | 1 moderate (`fflate` via `three-stdlib`) |
| Data | 13 planets (+ `sunData`), 26 moons, 24 satellites; no duplicate ids; all parents valid; 52 asset references, none missing |
| Runtime perf (frame time, renderer.info, first-load bytes) | **to be recorded by QA** in `docs/loop/baseline-main.md` |

Facts discovered while preparing (they shape the criteria below):

- `index.html` meta descriptions already say 26 moons / 24 spacecraft (fixed in `64d2b1d`). The
  "stale: 23 moons, 12 satellites" statements in `docs/ARCHITECTURE.md` §11 and `docs/TECHNICAL.md` §6
  are therefore wrong and must be corrected.
- Satellites with `parentPlanet: 'sun'` have no radius to compare against in `planets.ts`; the Sun
  radius is `sunData.radius` (6). Escape-trajectory probes (`voyager1`, `voyager2`, `new-horizons`) do
  not orbit, so the `orbitDistance` rule excludes `escapeTrajectory: true`.
- Besides `texture`/`imageUrl`/`modelPath` in data, five asset paths are hard-coded in components
  (`earth_day`, `earth_night`, `saturn_ring_alpha.png`, `ceres`, `pluto`).
- Vitest 5 requires Node ≥ 22.12; CI (`quality.yml`) and the documented minimum use Node 20.
  **Vitest 4.x** (`^20 || ^22 || >=24`, peer `vite ^7`) is required.

## Measurement tooling (decided by the owner on 2026-10-10)

The Claude-in-Chrome extension was not connectable, so browser QA uses **Playwright 1.64.0 driving the
system Google Chrome** (`chromium.launch({ channel: 'chrome' })`), installed in a scratch directory
(`PW_DIR`, passed to the agents), never in the repo. Verified before the run: Chrome 154.0.8037.98,
headless, WebGL2 renderer `ANGLE (Apple, ANGLE Metal Renderer: Apple M1)` (real GPU, not SwiftShader).
Rules:

- Fixed context for every measurement: viewport 1440×900, `deviceScaleFactor: 1`, one page, no other
  tabs, headless Chrome, cache disabled for first-load runs.
- The measurement script is committed under `docs/loop/20261010-qa-infra/qa/` (it resolves Playwright
  via `createRequire(process.env.PW_DIR + '/')`) so the numbers are reproducible.
- Numbers are only comparable with numbers from this same tool and machine.
  `baseline-main.md` states the tool, versions and the fixed context.

## Acceptance criteria (testable)

### Debug hook

- **AC-1** In `npm run dev`, `window.__SOLAR_DEBUG__` exists after the canvas is created and exposes at
  least `info` (the live `gl.info`), `scene` and `camera`. Typed in `src/vite-env.d.ts`.
- **AC-2** `grep -r __SOLAR_DEBUG__ dist/` returns nothing after `npm run build`, and the preview build
  has `window.__SOLAR_DEBUG__ === undefined` in the browser.
- **AC-3** The hook is installed behind `import.meta.env.DEV`, is read-only with respect to app state
  (no behaviour change), and the production diff is limited to a few lines in `src/App.tsx` plus a
  new helper (if any) and the type declaration.

### Tests

- **AC-4** `npm test` (`vitest run`) is green on current data and runs in a Node environment (no jsdom
  or browser needed). Tests are not bundled into `dist/` and `npm run build` stays green.
- **AC-5** The data tests assert, with a failure message that names the offending id/file:
  1. `id` unique within each collection (planets incl. Sun, moons, satellites).
  2. Moon `parentPlanet` ∈ planet ids; satellite `parentPlanet` ∈ planet ids ∪ {`'sun'`, `'moon'`}
     (`'moon'` only valid because the Moon exists in `moons.ts`).
  3. Every `texture`, `imageUrl`, `modelPath` in data resolves to an existing file under `public/`
     (leading slash optional, as per ARCHITECTURE.md path conventions); a `modelPath` implies a
     `modelScale` and vice versa. Hard-coded component texture paths also resolve.
  4. `orbitDistance > parentRadius + radius` for every moon and for non-escape satellites (parent
     radius: planet radius, `sunData.radius`, or the Moon's radius for `'moon'`).
  5. Counts quoted next to the words *moons* / *spacecraft* / *satellites* in `README.md` and
     `index.html` equal `moons.length` / `satellites.length`; the test fails if it finds **zero**
     matches in a file (guards against a regex that silently matches nothing).
- **AC-6** (QA, mandatory) **Negative proof.** QA deliberately corrupts data in three separate
  experiments, runs `npm test`, shows each one goes red with a clear message, then restores the file:
  (a) duplicate moon id, (b) a `texture` pointing to a missing file, (c) a wrong count in `README.md`.
  After the experiments `git status --porcelain` shows no change to those files and `npm test` is
  green again.

### Sampler

- **AC-7** `scripts/perf-sampler.js` runs when pasted into the browser console / `javascript_tool`
  (no imports, no dependencies, no leftover timers/observers after it finishes). For a configurable
  duration it returns JSON with: `frames`, `durationMs`, `fpsAvg`, frame interval `p50`/`p95`/`max` (ms),
  `over33ms` (count and %), `longTasks` (`count`, `totalMs`, `maxMs`), and `visibility` (a hidden tab
  throttles rAF, so the result must record `document.visibilityState`).
- **AC-8** Usage is documented in `docs/TECHNICAL.md` (new "Performance measurement" subsection that
  also documents the debug hook and `npm test`).

### Gates and docs

- **AC-9** `npm run lint` and `npm run build` green; chunk sizes within **±1 %** of the baseline above
  (index / vendor-three / vendor-react / css).
- **AC-10** Dependency change limited to Vitest (`vitest@^4.1`, devDependency) and its transitive
  tree. `npm audit` reports **no new advisory** versus the baseline (18 total; 1 with `--omit=dev`).
  `npm ci` works from the updated lockfile on Node 20.19+ and the lockfile diff contains no unrelated
  version bumps.
- **AC-11** Docs that become false are corrected: "no automated tests" in `CONTRIBUTING.md`,
  `TECHNICAL.md` (§7 CI/CD, scripts table, §9 debugging tips), `ARCHITECTURE.md` §11; the stale
  "23 moons / 12 satellites" claims in `ARCHITECTURE.md` §11 and `TECHNICAL.md` §6;
  `PERFORMANCE_AND_VISUALIZATION.md` "Measuring" gains a pointer to the sampler and hook;
  `LOOP-DEV-QA.md` §8 ("Tidak ada test runner") is updated. `.gitignore` ignores
  `docs/loop/*/shots/`.

### Baseline

- **AC-12** `docs/loop/baseline-main.md` exists and is complete (QA, following LOOP-DEV-QA §4 step 5):
  - Machine: CPU/GPU, macOS version, Chrome version, Playwright version, viewport (1440×900), DPR
    (1), headless; the WebGL renderer string (must be the real GPU, not SwiftShader/llvmpipe).
  - Frame time p50 / p95 / frames > 33 ms / long tasks for three scenarios — (a) overview 1x,
    (b) a planet selected with moons + satellites ON, (c) paused — each **3 runs, median reported**,
    30 s warm-up + 30 s sampling, on the `vite preview` build of BASE (port 4174).
  - `renderer.info.memory.geometries` / `textures` and `render.calls` / `triangles` at minute 1 and
    minute 5 (scenario a). Read through the hook on the dev server (port 5174); the hook is
    read-only, so this describes `main`'s runtime. Dev-server numbers are used for **growth**, not
    absolute values.
  - First load (cold cache, preview build): request count and transferred bytes, with the list of
    the largest requests.
  - Chunk sizes (from the build output above).
  - A short "caveats" paragraph (automation noise, no mobile device, no other browsers).

## Data / scene changes

None. No data values change; no scene objects change.

## Design

Not applicable (no UI change).

## Performance budget

Production bundle: **±1 %** per chunk. No new runtime dependencies. No new network requests.

## Needs real device / other browser (NEEDS-MANUAL)

- Baseline on a physical mobile device and on Safari/Firefox (not reachable by the agents).
- A 120 Hz display (planet/Sun spin is not `delta`-scaled; see PERFORMANCE_AND_VISUALIZATION P8).

## Deferred (owner decisions, not done in this run)

- **D-1** Add `npm test` as a job in `.github/workflows/quality.yml` (needs Node ≥ 20.19, which the
  workflow already provides).
- **D-2** The pre-existing 18 `npm audit` advisories: `quality.yml`'s audit job would already fail on
  a PR to `main`. Fixing requires bumping `@gltf-transform/cli` and `tailwindcss` (4.x is a breaking
  change). Needs its own run.

## Constraints that bind both agents

- No `git push`, tag, release, or `.github/` changes. Conventional Commits, English, one purpose per
  commit, no squash.
- Browser QA uses the Playwright harness above (not the Chrome extension), dev server on 5174,
  preview on 4174 (kill both afterwards). Playwright browsers/profiles are never pointed at the
  user's own Chrome profile.
- Throwaway data experiments (AC-6) must be restored with `git checkout -- <file>`; QA records the
  evidence in `LOG.md`.
