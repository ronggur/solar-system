# Release Notes

Changelog per release tag, newest first. Releases are tagged `vX.Y.Z` on GitHub; publishing a
release also deploys it (see [docs/TECHNICAL.md](docs/TECHNICAL.md#7-cicd)). `package.json` stays at
`0.1.0`; the displayed app version comes from the release tag at build time (`VITE_APP_VERSION`).

For what is planned next, see
[docs/PERFORMANCE_AND_VISUALIZATION.md](docs/PERFORMANCE_AND_VISUALIZATION.md).

---

## Unreleased

### Documentation

- Added [docs/PERFORMANCE_AND_VISUALIZATION.md](docs/PERFORMANCE_AND_VISUALIZATION.md): measured
  baseline, performance and visual findings, and a phased roadmap (no code changes yet).
- Rewrote [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/TECHNICAL.md](docs/TECHNICAL.md) to
  match the code, and removed the duplicated interface/props listings.
- Rewrote [docs/SATELLITE_3D_MODELS.md](docs/SATELLITE_3D_MODELS.md) with the current GLB status.
- Corrected facts across the docs: **26** natural moons (not 27), Node.js 20.19+ requirement,
  gas-giant scale wording, Object List colours, and the Sun's description (no glow effect).
- Added [docs/LOOP-DEV-QA.md](docs/LOOP-DEV-QA.md), a Dev ↔ QA agent-loop playbook.
- Removed `docs/API.md` (duplicated `src/types` and documented props and guards that do not exist)
  and `GITHUB_DESCRIPTION.md` (an unfilled template with stale counts).

### Tooling

- Added a dev-only `window.__SOLAR_DEBUG__` hook (`src/lib/debugHook.ts`) exposing `gl.info`, the scene
  and the camera. It is removed from production builds; no runtime behaviour changes.
- Added Vitest 4 and `npm test`: data-integrity tests (unique ids, valid parents, referenced assets
  exist, orbit distances clear their parent, moon/spacecraft counts in `README.md` and `index.html`
  match the data). `npm test` is not yet part of `quality.yml`.
- Added `scripts/perf-sampler.js`, a paste-in-console frame-time and long-task sampler, and recorded the
  runtime baseline of `main` in [docs/loop/baseline-main.md](docs/loop/baseline-main.md).

### Known data issues

See "Known candidates to verify" in [docs/INACCURACIES.md](docs/INACCURACIES.md). The `index.html`
meta descriptions were corrected to 26 moons and 24 spacecraft, and `npm test` now fails if they drift.
Also known and not yet fixed: the `index.html` texture preloads lack `crossorigin`, so three textures
are downloaded twice (~0.4 MB), and `npm audit` reports 18 pre-existing advisories, mostly in dev
tooling.

---

## v1.6.0: Loading performance and spacecraft models (2026-07-13)

### Startup payload: ~25 MB → ~3.5 MB

- Converted every satellite GLB from Draco to **meshopt** (18.9 MB → 4.5 MB). This removes the
  runtime Draco decoder fetch from gstatic.com; drei decodes meshopt with its bundled decoder.
- Pre-simplified `maven.glb` (a 4.2 M-vertex disconnected triangle soup) with the new
  `scripts/simplify-glb-sloppy.mjs`: 10.5 MB → ~40 KB.
- Downsized dwarf-planet, Moon and Mercury textures with the new
  `scripts/optimize-planet-textures.mjs` (4 MB → 1.8 MB).
- The drei `Loader` is now one-shot, so idle-streamed GLBs no longer bring the overlay back.
- Vite: `inspectAttr` is excluded from production builds, `vendor-three` and `vendor-react` chunks
  are split, and the Sun and Earth textures are preloaded in `index.html`.
- Removed 48 unused shadcn components and 35 unused dependencies (CSS 87 KB → 32 KB).

### Spacecraft

- Satellite GLBs are **deferred to browser idle time** (`requestIdleCallback`, `setTimeout`
  fallback for Safari) and staggered; selecting a satellite still loads it immediately.
- New or rebuilt procedural models: Tiangong (real T shape with twin solar wings), Gaia, SOHO,
  BepiColombo, Europa Clipper, Lucy, New Horizons, Psyche, GPS III and Starlink.
- LRO model scale reduced (0.004 → 0.0015).

---

## v1.5.0: Asset optimization and object-list UX (2026-04-05)

- Asteroid and Kuiper belts use Ceres- and Pluto-like surface textures (each behind `Suspense`).
- Satellite images moved to a WebP workflow (`optimize-satellite-images`); unused texture files
  removed with the new `prune-unused-textures` helper.
- **Object List:** ↑ / ↓ cycle through the filtered list; All / None toggles for categories; the
  control panel documents the keys.
- Satellite GLBs load on a stagger with Vite-`base`-aware URLs and a placeholder;
  `compress-satellite-glbs` script added.
- Saturn's ring texture loads in an inner `Suspense` with a solid fallback ring.
- Miranda and LRO data tweaks.

## v1.4.0: Procedural moon textures and CI (2026-03-08)

- Moons without a texture file get a deterministic, procedurally generated surface based on real
  appearance (`src/lib/textureGenerator.ts`); Mimas orbit updated.
- Control layout fit improvements.
- New `quality.yml` workflow on pull requests; `npm audit` added to CI.

## v1.3.0: Spacecraft 3D models (2026-02-18)

- GLB models for 14 spacecraft under `public/3d-objects/satellites/`, wired through `modelPath` /
  `modelScale` data fields.
- Deploy workflow updates.

## v1.2.0: Spacecraft, escape trajectories and filters (2026-02-13)

- **23 spacecraft** at the time (24 today; grown from an early 12), including Parker Solar Probe, New Horizons, Europa
  Clipper, SOHO, BepiColombo, OSIRIS-APEX, Lucy, Psyche, Chandra, LRO, Mars Odyssey, MAVEN and
  Tiangong.
- **Escape trajectories:** Voyager 1/2 and New Horizons use `escapeTrajectory: true` (dashed trail,
  no closed orbit).
- **Orbital correctness:** JWST and Gaia orbit the Sun (L2); LRO orbits the Moon
  (`parentPlanet: 'moon'`).
- **Six filter categories** in the Object List: Planets, Moons, Space Stations, Telescopes, Probes,
  Navigation, with icons and colours per type.
- Data fixes (for example Saturn 274 moons, Venus 465 °C, Mercury sidereal day 58.6 Earth days).
- Lint fixes.

## v1.1.0: Moon textures and richer data (2026-02-12)

- Moon texture for Earth's Moon.
- Keyboard shortcuts: **Space** pause, **← / →** speed.
- Richer data and updated information panels.
- Labels no longer render above the info panel (z-index fix).

## v1.0.0: Planet textures and interaction polish (2026-02-11)

First feature-complete release.

- **Textures:** WebP surface maps for the planets and dwarf planets; Earth uses separate day and
  night maps. Coloured spheres are used as a fallback while textures load.
- **Hover feedback:** pulsing additive glow on planets, moons and satellites.
- **Camera interaction pause:** all motion pauses while the user pans, rotates or zooms, and the
  pause button reflects it. A manual pause is preserved.
- **Speed range** extended to 0.1×-10× in 0.1 steps.
- **Belts:** asteroid and Kuiper belts as instanced meshes with `frustumCulled={false}` so they
  don't disappear when panning.
- **Moons:** natural moons with discovery, diameter and inclination data, each clickable with its
  own info panel; includes dwarf-planet moons.
- **Layering:** info panels use `z-[100]`, with 3D labels below them.
- **Lighting:** very low scene ambient; the Sun group supplies a point light and fill.

## v0.0.1 - v0.0.3: Initial deployment (2026-02-01)

- Project setup, deployment workflow, base-path and favicon fixes, control improvements.

---

## Links

- **Releases:** <https://github.com/ronggur/solar-system/releases>
- **Demo:** <https://www.ronggur.com/solar-system/>
- **License:** MIT, see [LICENSE](LICENSE)
