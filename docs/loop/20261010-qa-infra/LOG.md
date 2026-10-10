# Loop Log — 20261010-qa-infra
Scope: Run 0, QA infrastructure (debug hook, Vitest + data tests, perf sampler, baseline)  ·  Branch: chore/qa-infra  ·  Started: 2026-10-10  ·  Machine: _(QA fills in baseline-main.md)_

## Status: IN_PROGRESS   (current iteration: 0/2)

## Iteration summary
| Iter | Dev completed | Gates (lint/build/audit/test) | QA verdict | New findings | Verified |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |

## Metrics (same protocol every time)
| Metric | Baseline (BASE ab11176) | Iter 1 | Iter 2 |
|---|---|---|---|
| Bundle index / vendor-three / vendor-react / css (kB) | 278.04 / 976.03 / 192.98 / 32.16 | | |
| `npm audit` total / `--omit=dev` | 18 (5 moderate, 13 high) / 1 moderate | | |
| `__SOLAR_DEBUG__` matches in dist/ | 0 | | |
| First load: requests / bytes | see baseline-main.md | | |
| Frame time p50 / p95 (ms), overview | see baseline-main.md | | |
| geometries @1min → @5min | see baseline-main.md | | |

## Findings
Status: OPEN → FIXED (Dev) → VERIFIED (QA) | DISPUTED | DEFERRED | NEEDS-MANUAL
Area: 3d | ui | data | build | perf | a11y | docs

| ID | Iter | Sev | Area | Location | Finding & repro/evidence | Status | Fix (file/commit) | Regression evidence |
|---|---|---|---|---|---|---|---|---|
| D-001 | 0 | Minor | build | `npm audit` | 18 pre-existing advisories (13 high, dev tooling) — `quality.yml` audit job would fail on `main` today | DEFERRED | — | Owner decision; needs own run (SPEC D-2) |
| D-002 | 0 | Minor | docs | ARCHITECTURE.md §11, TECHNICAL.md §6 | Claim `index.html` says "23 moons / 12 satellites" but it already says 26 / 24 | OPEN | — | Fixed under SPEC AC-11 |

## NEEDS-MANUAL (real device / other browsers)
- [ ] Mobile device (iOS Safari / Android Chrome): record first-load time and frame time for scenario (a); compare to `baseline-main.md` caveats.
- [ ] 120 Hz display: confirm planet/Sun spin speed is ~2× at 120 Hz (known, PERFORMANCE_AND_VISUALIZATION P8).

## Decisions & notes
- Vitest pinned to `^4.1` (Vitest 5 requires Node ≥ 22.12; CI is Node 20).
- Baseline runtime numbers are taken from a `git worktree` of BASE `ab11176` (code-identical to `main`).
- Browser tooling: Chrome extension not connectable → Playwright 1.64.0 + system Chrome 154 (headless, ANGLE Metal / Apple M1), owner-approved 2026-10-10.
- `npm test` in `quality.yml`: DEFERRED to owner (SPEC D-1).

## Merge notes
- Docs updated: _(Dev fills)_  ·  Counts changed: none  ·  Release/tag: not created (needs owner approval)
