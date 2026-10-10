# Loop Log — 20261010-qa-infra
Scope: Run 0, QA infrastructure (debug hook, Vitest + data tests, perf sampler, baseline)  ·  Branch: chore/qa-infra  ·  Started: 2026-10-10  ·  Machine: _(QA fills in baseline-main.md)_

## Status: IN_PROGRESS   (current iteration: 1/2)

## Iteration summary
| Iter | Dev completed | Gates (lint/build/audit/test) | QA verdict | New findings | Verified |
|---|---|---|---|---|---|
| 1 | 2026-10-10: hook, Vitest + 18 tests, sampler, docs (AC-1..5, AC-7..11); Playwright smoke OK | lint OK / build OK / audit 18 (5 mod, 13 high), `--omit=dev` 1 = baseline, no new advisory / test OK (2 files, 18 tests) | pending (AC-6, AC-12 are QA) | none | D-002 FIXED, awaiting QA |
| 2 | | | | | |

## Metrics (same protocol every time)
| Metric | Baseline (BASE ab11176) | Iter 1 | Iter 2 |
|---|---|---|---|
| Bundle index / vendor-three / vendor-react / css (kB) | 278.04 / 976.03 / 192.98 / 32.16 | 278.05 / 976.03 / 192.98 / 32.16 (gzip 86.91 / 266.99 / 60.55 / 6.69) | |
| `npm audit` total / `--omit=dev` | 18 (5 moderate, 13 high) / 1 moderate | 18 (5 moderate, 13 high) / 1 moderate | |
| `__SOLAR_DEBUG__` matches in dist/ | 0 | 0 | |
| First load: requests / bytes | see baseline-main.md | | |
| Frame time p50 / p95 (ms), overview | see baseline-main.md | | |
| geometries @1min → @5min | see baseline-main.md | | |

## Findings
Status: OPEN → FIXED (Dev) → VERIFIED (QA) | DISPUTED | DEFERRED | NEEDS-MANUAL
Area: 3d | ui | data | build | perf | a11y | docs

| ID | Iter | Sev | Area | Location | Finding & repro/evidence | Status | Fix (file/commit) | Regression evidence |
|---|---|---|---|---|---|---|---|---|
| D-001 | 0 | Minor | build | `npm audit` | 18 pre-existing advisories (13 high, dev tooling) — `quality.yml` audit job would fail on `main` today | DEFERRED | — | Owner decision; needs own run (SPEC D-2) |
| D-002 | 0 | Minor | docs | ARCHITECTURE.md §11, TECHNICAL.md §6, INACCURACIES.md | Claim `index.html` says "23 moons / 12 satellites" but it already says 26 / 24 | FIXED | `71e7670`, `a79e76c`, `e339fcc` | `tests/docs-counts.test.ts` now fails if README/index.html counts drift |
| D-003 | 1 | Minor | build | `eslint.config.js` | `npm run lint` was red on the branch: the committed `docs/loop/20261010-qa-infra/workflow.js` has a top-level `return` (Workflow-tool script, not a module) and ESLint parsed it as a module | FIXED | `916eafa` (ignore `docs/loop/*/workflow.js`) | `npm run lint` green |

## NEEDS-MANUAL (real device / other browsers)
- [ ] Mobile device (iOS Safari / Android Chrome): record first-load time and frame time for scenario (a); compare to `baseline-main.md` caveats.
- [ ] 120 Hz display: confirm planet/Sun spin speed is ~2× at 120 Hz (known, PERFORMANCE_AND_VISUALIZATION P8).

## Decisions & notes
- Vitest pinned to `^4.1` (Vitest 5 requires Node ≥ 22.12; CI is Node 20).
- Baseline runtime numbers are taken from a `git worktree` of BASE `ab11176` (code-identical to `main`).
- Browser tooling: Chrome extension not connectable → Playwright 1.64.0 + system Chrome 154 (headless, ANGLE Metal / Apple M1), owner-approved 2026-10-10.
- `npm test` in `quality.yml`: DEFERRED to owner (SPEC D-1).
- Iter 1 (Dev), lockfile: `npm i -D vitest@^4.1` resolved `vitest@4.1.11`; the lockfile gained 26 packages (vitest + its tree, incl. `vitest/node_modules/picomatch@4.0.7`), no existing entry changed or was removed. `npm ci --dry-run` clean. Not run on Node 20 (only Node 24.20 here); Vitest 4.1 supports `^20 || ^22 || >=24`.
- Iter 1 (Dev), hook: `src/lib/debugHook.ts` called from `Canvas onCreated` in `src/App.tsx`; guarded by `import.meta.env.DEV` inside the helper, so the whole function is removed from `dist/` (0 matches). Exposes `info`, `gl`, `scene`, `camera`.
- Iter 1 (Dev), tests: `vitest.config.ts` is standalone (does not load `vite.config.ts`, so no `inspectAttr`); tests live in `tests/` (outside `src/`), type-checked by `tsc -b` through the new `tsconfig.test.json`; `dist/` has no test code. Hard-coded texture paths are found by scanning `src/components/*.tsx` and `index.html` (guarded by an explicit list of the five known paths), not by a hand-kept list. Count claims are matched as "N [major|natural] moons|spacecraft|satellites" and "moons|spacecraft|satellites (N)"; zero matches per file and kind fails.
- Iter 1 (Dev), self-check of negative proof (not the AC-6 evidence, QA does that): a missing `texture` and a wrong README count each turned `npm test` red with a message naming the id/file and line; both files restored with `git checkout`.
- Iter 1 (Dev), Playwright smoke (Chrome 154, headless, ANGLE Metal Apple M1, 1440x900, DPR 1): dev server 5174 `window.__SOLAR_DEBUG__` keys `info, gl, scene, camera`, `info === gl.info`, `memory.geometries` 260 / `textures` 47 / `render.calls` 247 / `triangles` 214282 after 8 s, 0 console errors; preview build 4174 `window.__SOLAR_DEBUG__ === undefined`, 0 console errors. Sampler (4 s, both pages open at once so NOT a baseline): returns all fields, `window` key count identical before/after (no leftovers), `endedBy: complete`. Preview run showed ~14 fps / p50 66.6 ms in this smoke; QA must measure it properly (one page, one server) before reading anything into it.
- Iter 1 (Dev), process note: servers on 5174 and 4174 were stopped; `git status --porcelain` empty at the end.

## Merge notes
- Docs updated: TECHNICAL.md (scripts table, structure, stack, TypeScript/Vitest, §6, §7, §9 + new "Performance measurement"), ARCHITECTURE.md (§3.3 globals, §10, §11), CONTRIBUTING.md (Testing, checklist), PERFORMANCE_AND_VISUALIZATION.md (Measuring), LOOP-DEV-QA.md (header, §0b, §2 gates, §8), INACCURACIES.md, README.md (scripts, structure)  ·  Counts changed: none  ·  Release/tag: not created (needs owner approval)
