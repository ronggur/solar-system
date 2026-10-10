# Developer Guide

Practical information for working on the project: setup, scripts, configuration, the asset pipeline,
how to add content, CI/CD and troubleshooting. For how the app works internally see
[ARCHITECTURE.md](ARCHITECTURE.md); for known performance issues see
[PERFORMANCE_AND_VISUALIZATION.md](PERFORMANCE_AND_VISUALIZATION.md).

## 1. Setup and commands

**Prerequisites:** Node.js **20.19+** (or 22.12+), required by Vite 7. CI and the deploy workflow use Node 24. npm is the
package manager (a `package-lock.json` is committed).

```bash
npm install
npm run dev      # http://localhost:5173/solar-system/
```

The dev server honours the `/solar-system/` base path, so open the URL Vite prints.

| Script                             | What it does                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`                      | Vite dev server with HMR (adds the `inspectAttr` plugin)                                             |
| `npm run build`                    | `tsc -b` then `vite build` into `dist/`                                                              |
| `npm run preview`                  | Serve `dist/` locally                                                                                |
| `npm run lint`                     | ESLint over the repo (`dist` ignored)                                                                |
| `npm test`                         | Vitest (`vitest run`, Node environment): data-integrity and documentation-count tests in `tests/`    |
| `npm run download-satellite-images`| Fetch the 11 reference images listed in the script from Wikimedia into `public/satellites/`          |
| `npm run optimize-satellite-images`| ImageMagick: resize to ≤ 960 px, strip metadata, WebP q85; **deletes the originals**                 |
| `npm run optimize-planet-textures` | ImageMagick: shrink only the six listed dwarf-planet/Moon/Mercury textures in place                  |
| `npm run compress-satellite-glbs`  | `gltf-transform optimize` (meshopt + WebP textures ≤ 1024) on every GLB in `public/3d-objects/satellites/` |

ImageMagick 7 (`magick` on `PATH`) is needed for the two image scripts: `brew install imagemagick`.

### One-off scripts (not in `package.json`)

| Script                                | Notes                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/download-earth-texture.mjs`  | Downloads 2k Earth day/night maps from solarsystemscope.com as **`.jpg`**. The app expects WebP, so convert manually (and resize) before use.                  |
| `scripts/prune-unused-textures.mjs`   | Deletes everything in `public/textures/` not in a **hardcoded keep-list**. Update `keepNames` whenever you add a texture, or the script will delete it.        |
| `scripts/simplify-glb-sloppy.mjs`     | Used once for `maven.glb` (4.2 M-vertex triangle soup). Imports `meshoptimizer` and `draco3dgltf`, which are only available transitively via `@gltf-transform/cli`. Usage is `node scripts/simplify-glb-sloppy.mjs <in.glb> <out.glb> [ratio]` (its header comment names the wrong file). |

## 2. Project structure

```
solar-system/
├── .github/workflows/        quality.yml (PR checks), deploy.yml (release → Vultr)
├── docs/                     this documentation
├── public/
│   ├── textures/             planet, Sun, Moon, belt textures (WebP) + saturn_ring_alpha.png
│   ├── satellites/           mission images for the info panel (WebP)
│   ├── 3d-objects/satellites/  GLB models (meshopt-compressed)
│   └── favicon/
├── scripts/                  asset pipeline (see §4) and `perf-sampler.js` (see §9)
├── tests/                    Vitest tests (data integrity, README/index.html counts); not bundled
├── src/
│   ├── components/           Planet, Moon, Satellite, Sun, Starfield, SolarSystem, panels, lists
│   │   └── ui/               shadcn-style primitives: button, dialog, input, slider, switch
│   ├── data/                 planets.ts, moons.ts, satellites.ts
│   ├── lib/                  utils.ts (cn), textureGenerator.ts (procedural moon textures),
│   │                         debugHook.ts (dev-only `window.__SOLAR_DEBUG__`)
│   ├── types/index.ts        data interfaces (source of truth)
│   ├── App.tsx / App.css     root component and app styles
│   ├── index.css             Tailwind layers, theme variables, glow utilities
│   ├── main.tsx
│   └── vite-env.d.ts         env + `window.resetSolarSystemCamera` / `__SOLAR_DEBUG__` typing
├── index.html                meta tags and texture preloads
├── vite.config.ts, vitest.config.ts, tailwind.config.js, postcss.config.js, eslint.config.js
├── tsconfig.json (+ tsconfig.app.json, tsconfig.node.json, tsconfig.test.json)
└── components.json           shadcn configuration
```

## 3. Stack and configuration

### Stack

Versions are ranges from `package.json`; the lockfile pins exact versions.

| Area      | Packages                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------- |
| App       | React 19.2, TypeScript ~5.9, Vite ^7.2                                                             |
| 3D        | three ^0.182, @react-three/fiber ^9.5, @react-three/drei ^10.7                                     |
| Animation | gsap ^3.14 (camera tweens and info-panel slides)                                                   |
| UI        | Radix (dialog, slider, switch, slot), Tailwind CSS ^3.4 + tailwindcss-animate, lucide-react, cva   |
| Tooling   | ESLint 9 + typescript-eslint 8 + react-hooks plugin, Vitest ^4.1, `@gltf-transform/cli`, `kimi-plugin-inspect-react` |

### Vite (`vite.config.ts`)

- `base: '/solar-system/'`; build the app under that path. Public assets must go through
  `import.meta.env.BASE_URL` (see [ARCHITECTURE.md](ARCHITECTURE.md#path-conventions)).
- `inspectAttr()` (kimi-plugin-inspect-react) is applied **only** for `vite serve`; it is excluded
  from production builds.
- `manualChunks` splits `vendor-three` and `vendor-react`; `chunkSizeWarningLimit` is 1200 kB.
- Alias `@` → `./src` (mirrored in `tsconfig.json`/`tsconfig.app.json`).

### TypeScript

Project references: `tsconfig.app.json` (the app, `strict`, `noUnusedLocals`/`noUnusedParameters`,
bundler resolution, `verbatimModuleSyntax`, `erasableSyntaxOnly`, target ES2022),
`tsconfig.node.json` (only `vite.config.ts`) and `tsconfig.test.json` (`tests/` and
`vitest.config.ts`, Node types, same `@` alias). `npm run build` type-checks all three with
`tsc -b`; tests live outside `src/` so they are never part of the app bundle.

### Vitest (`vitest.config.ts`)

A standalone config rather than a merge of `vite.config.ts`, so tests never load the dev-only
`inspectAttr` plugin or the production chunk rules. Environment is plain Node (no jsdom, no
browser), tests are `tests/**/*.test.ts`, and `@` resolves to `./src` like in the app. **Vitest is
pinned to `^4.1`:** Vitest 5 needs Node ≥ 22.12, and the pin was chosen while CI still ran Node 20. CI and the deploy workflow now use Node 24, so the pin can be revisited.

### ESLint (`eslint.config.js`)

`@eslint/js` + `typescript-eslint` recommended, plus the react-hooks recommended rules with
`exhaustive-deps` and `rules-of-hooks` as warnings, `react-hooks/set-state-in-effect` **off**, and
`react-refresh/only-export-components` off. Three selection effects in `SolarSystem.tsx` carry an
`eslint-disable` for `exhaustive-deps` on purpose.

### Styling

Tailwind 3 with shadcn "new-york" style. Theme colours are HSL CSS variables in `src/index.css`
(`--background`, `--primary`, …) mapped in `tailwind.config.js`. `App.css` holds a few app-level
rules (panel transitions, the `.planet-label` style). Prefer the existing `bg-black/60
backdrop-blur-xl border-white/10` panel look for new UI.

### Environment

`VITE_APP_VERSION` (optional) is shown in the header; the deploy workflow sets it from the release
tag. There are no other environment variables.

## 4. Asset pipeline

| Asset                  | Format / limit                                              | How to produce                                   |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Planet/Sun textures    | WebP, equirectangular, ≤ 1920×960                           | Convert manually                                 |
| Dwarf planets          | WebP 1024×512, q78                                          | `optimize-planet-textures`                       |
| Moon, Mercury          | WebP 1280×640, q80                                          | `optimize-planet-textures`                       |
| Saturn rings           | `saturn_ring_alpha.png` (1920×117, alpha strip)             | Manual                                           |
| Satellite images       | WebP ≤ 960 px, q85                                          | `download-satellite-images` + `optimize-satellite-images` |
| Satellite models       | GLB, meshopt, embedded textures WebP ≤ 1024 px              | `compress-satellite-glbs`                        |

Current weight: `public/` ≈ 8 MB (textures 1.9 MB, GLBs 4.3 MB, images 1.8 MB). The v1.6.0 work cut
the startup payload from ~25 MB to ~3.5 MB; keep it that way:

- Don't commit source-resolution assets. Resize first.
- Prefer meshopt over Draco: Draco's decoder is fetched from gstatic at runtime, while drei decodes
  meshopt with its bundled decoder.
- Remember that **GPU memory** is `width × height × 4 B × 1.33`, regardless of file size. A 1920×960
  texture costs ~10 MB on the GPU. See the performance doc.

Details for models are in [SATELLITE_3D_MODELS.md](SATELLITE_3D_MODELS.md).

## 5. Adding content

Everything is data-driven; bodies appear automatically once added to the arrays. The authoritative
field lists are in [`src/types/index.ts`](../src/types/index.ts).

### A planet or dwarf planet (`src/data/planets.ts`)

1. Add a `PlanetData` entry. Use `type: 'dwarf-planet'` for dwarf planets.
2. Put the texture at `public/textures/<id>.webp` and set `texture: '/textures/<id>.webp'`; add the
   file name to `keepNames` in `scripts/prune-unused-textures.mjs`.
3. Pick a `distance` that doesn't collide with an existing orbit or belt (asteroid belt 42-48,
   Kuiper belt 155-220).
4. Rings, Earth's night map and Pluto's elliptical orbit are hard-coded by `id` in `Planet.tsx`.
   `moons` is a display number only; actual moons come from `moons.ts`.

### A moon (`src/data/moons.ts`)

1. Add a `MoonData` with `parentPlanet` set to the planet's `id`.
2. `orbitDistance` must exceed the parent's `radius` plus the moon's `radius`, or the moon
   intersects the planet (see the Miranda comment in the file).
3. Without `texture`, a procedural texture is generated from `color` and `surfaceType`
   (`rocky`, `icy`, `volcanic`, `mixed`). Only set `texture` if you have a real map.
4. `orbitInclination` is in degrees; use > 90 for retrograde (Triton is 157).

### A satellite or probe (`src/data/satellites.ts`)

1. Add a `SatelliteData`. `parentPlanet` is a planet `id`, `'sun'` (L1/L2 telescopes and deep-space
   probes) or `'moon'` (only Earth's Moon is supported as a satellite parent).
2. `type` drives the Object List category and colours: `space-station`, `telescope`, `probe` or
   `satellite` (shown as "Navigation").
3. `escapeTrajectory: true` makes the probe static with a dashed line instead of orbiting.
4. `imageUrl` is `satellites/<name>.webp` (no leading slash), `modelPath` is
   `3d-objects/satellites/<name>.glb`.
5. **Model precedence:** GLB (`modelPath` + `modelScale`) → id-specific procedural model in
   `renderSatelliteModel()` → type fallback. Tune `modelScale` by eye; units differ per model.

## 6. Keep in sync

When you add or remove bodies, update:

- [ ] Counts in `README.md` (moons, spacecraft, planets) and `docs/ARCHITECTURE.md`
- [ ] `index.html` meta description and `twitter:` description (currently 26 moons, 24 spacecraft)
- [ ] `keepNames` in `scripts/prune-unused-textures.mjs` for new textures
- [ ] The status table in `docs/SATELLITE_3D_MODELS.md` for new GLBs
- [ ] `RELEASE_NOTES.md`

## 7. CI/CD

### `quality.yml`: pull requests to `main`

Node 24. Jobs: **lint**, **audit** (`npm audit --omit=dev --audit-level=moderate`), then **build** (needs both). The audit covers production dependencies only; dev-tooling advisories are tracked in the loop log.
The workflow does **not** run `npm test` yet; run it locally before opening a PR (see
[§9](#9-debugging-tips)). Adding it as a job is a pending owner decision.

### `deploy.yml`: GitHub Release published

1. **lint**, then **build** with `VITE_APP_VERSION` set from the tag (leading `v` stripped).
2. **deploy** (environment `production`): `scp` the archive to the Vultr VPS, extract to
   `…/releases/<timestamp>`, back up the current release with hard links, atomically repoint the
   `current` symlink, keep the last 5 releases and 3 backups.
3. **verify**: checks the symlink and, if the `DEPLOY_URL` repository variable is set, requests it
   (a non-200/301/302 only warns).

Required secrets: `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`; optional `SSH_PORT`.

> **Publishing a release deploys to production.** Do not create a release casually. Tags `v0.0.1`
> to `v1.6.0` exist; the next release should follow semver and have notes in `RELEASE_NOTES.md`.

## 8. Troubleshooting

| Symptom                                           | Likely cause / fix                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Textures/GLBs 404 in preview or production        | The app is built for `/solar-system/`; serve it at that path. Never hard-code `/textures/...` in new components; go through `BASE_URL`. |
| Request URL contains `//`                         | A path was joined without collapsing the double slash. Use the `.replace(/\/\//g, '/')` pattern used elsewhere.          |
| A satellite stays a glowing sphere                | The GLB is deferred until idle (plus a stagger). Select it for an immediate load, or check the `modelPath` file name and that both `modelPath` and `modelScale` are set. |
| Satellite GLBs never load in Safari               | Safari has no `requestIdleCallback`; the fallback waits 3 s, then staggers. Look for a 404, not a missing API.          |
| Model is huge, tiny or off-centre                 | Adjust `modelScale`; large bounding spheres (LRO needed 0.0015) also affect click targets and camera framing.           |
| Texture "disappears" after adding one             | `prune-unused-textures.mjs` deleted it because it is not in `keepNames`.                                                |
| Belts vanish when panning                         | `frustumCulled={false}` was removed from the `instancedMesh`.                                                           |
| Labels cover the info panel                       | Info panels are `z-[100]`; drei `<Html>` labels use `zIndexRange={[90, 0]}`. Keep that ordering.                        |
| Pause button doesn't reflect camera drags         | `onCameraInteractionChange` must be wired from `SolarSystem` to `App`; pause state is `effectivePaused` in `App.tsx`.   |
| Typecheck passes in dev but `npm run build` fails | `npm run build` uses `tsc -b` with `noUnusedLocals`; unused imports/vars fail the build.                                |

## 9. Debugging tips

- **Renderer counters:** in dev, read `window.__SOLAR_DEBUG__.info` (see
  [Performance measurement](#performance-measurement)) to watch `memory.geometries`,
  `memory.textures`, `render.calls` and `render.triangles`. Steadily growing `geometries` means a
  resource is not being disposed (orbit lines and trails are allocated once per body).
- **React re-renders:** React DevTools Profiler with "Highlight updates"; planets, moons and
  satellites should not re-render during the animation loop. A steady flicker on every planet means
  a regression to per-frame state.
- **GPU memory:** Chrome Task Manager (GPU process) after the initial load.
- **Element lookup:** every scene object is addressable with `scene.getObjectByName('planet-earth')`,
  `moon-io`, `satellite-iss`; useful from the console via the R3F devtools.

### Performance measurement

Three small tools support measuring and regression-proofing. None of them changes runtime behaviour.

**Debug hook: `window.__SOLAR_DEBUG__` (dev only).** Installed from the R3F `Canvas` `onCreated`
callback by `installDebugHook()` in `src/lib/debugHook.ts`, and typed in `src/vite-env.d.ts`. It
exists only under `npm run dev` (`import.meta.env.DEV`); production builds and `vite preview`
contain no trace of it (`grep -r __SOLAR_DEBUG__ dist/` is empty).

| Property | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| `info`   | the live `WebGLRenderer.info` (`memory`, `render`, `programs`)         |
| `gl`     | the `WebGLRenderer`                                                    |
| `scene`  | the R3F scene (objects are named `planet-<id>`, `moon-<id>`, …)        |
| `camera` | the active `PerspectiveCamera`                                         |

```js
const { info } = window.__SOLAR_DEBUG__;
({ geometries: info.memory.geometries, textures: info.memory.textures,
   calls: info.render.calls, triangles: info.render.triangles });
```

`info.render` is reset every frame, so read it from the console between frames. The dev server runs
React `StrictMode` and the `inspectAttr` plugin: use it for **growth** of the counters over time,
never for absolute frame time.

**Frame-time sampler: `scripts/perf-sampler.js`.** A dependency-free snippet to paste into the
browser console (or evaluate through Playwright / a browser automation tool). It samples
`requestAnimationFrame` intervals and `longtask` entries for a configurable time, then cleans up
after itself and resolves with a JSON-serialisable object:

```js
window.__PERF_SAMPLER_MS__ = 30000;   // optional, default 30000
// paste scripts/perf-sampler.js; it evaluates to a Promise
```

| Field | Meaning |
| ----- | ------- |
| `frames`, `durationMs`, `fpsAvg` | measured frame intervals, time they span, average fps |
| `p50Ms`, `p95Ms`, `maxMs` | frame-interval percentiles and maximum |
| `over33ms` | `{ count, pct }` intervals longer than 33 ms (dropped 60 Hz frames) |
| `longTasks` | `{ supported, count, totalMs, maxMs }` main-thread tasks over 50 ms |
| `visibility`, `visibilityAtStart`, `hiddenDuringRun` | a hidden tab throttles rAF; discard such runs |

Measure the **production build** (`npm run build && npx vite preview --port 4174`, then open
`http://localhost:4174/solar-system/`) with a fixed viewport and device pixel ratio, one tab, and
the same machine and browser for every comparison. Run each scenario several times and report the
median.

**Tests: `npm test`.** Runs Vitest once in Node. The suites in `tests/` check that:

- ids are unique in planets (including the Sun), moons and satellites;
- every moon's `parentPlanet` is a planet id and every satellite's is a planet id, `'sun'` or
  `'moon'`;
- every `texture`, `imageUrl` and `modelPath` resolves to a file under `public/`, `modelPath` and
  `modelScale` come in pairs, and texture paths hard-coded in components and `index.html` exist;
- `orbitDistance` exceeds parent radius plus body radius (escape-trajectory probes are exempt);
- the moon and spacecraft counts quoted in `README.md` and `index.html` equal `moons.length` and
  `satellites.length`.

Failure messages name the offending id or file. When you add or remove a body, a red count test is
the reminder to update the docs (see [§6](#6-keep-in-sync)).
