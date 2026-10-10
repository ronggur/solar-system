# Architecture

How the 3D Solar System Explorer is put together: runtime tree, state flow, camera and selection
mechanics, how each kind of body is rendered, and how assets load. For day-to-day developer tasks
(scripts, adding data, CI) see [TECHNICAL.md](TECHNICAL.md). For known performance and visual
problems and the plan to fix them see
[PERFORMANCE_AND_VISUALIZATION.md](PERFORMANCE_AND_VISUALIZATION.md).

The TypeScript interfaces in [`src/types/index.ts`](../src/types/index.ts) are the single source of
truth for data shapes (`SunData`, `PlanetData`, `MoonData`, `SatelliteData`); they are not repeated
here.

## 1. Principles

- **No global store.** State lives in `App.tsx` and flows down as props; the 3D scene reports
  events back up through callbacks. There is no Redux/Zustand and no router.
- **Data-driven scene.** `src/data/{planets,moons,satellites}.ts` define everything; components are
  generic and render one instance per data entry.
- **Everything is selected by name.** Orbiting bodies register their group under its scene name in a
  parent registry (`src/lib/sceneRegistry.ts`); moons, satellites and follow mode read it each frame.
  Camera targeting from the Object List still uses `scene.getObjectByName(...)`, in effects that run on
  selection changes only (see [§4](#4-scene-model)).
- **Progressive loading.** A tiny set of textures blocks first paint; everything else streams in
  behind per-mesh `Suspense` boundaries or idle callbacks (see [§8](#8-loading-strategy)).

## 2. Runtime tree

```
main.tsx → <StrictMode><App/></StrictMode>

App
├── Header                        title, help <Dialog>, GitHub link, VITE_APP_VERSION
├── Canvas (R3F)                  antialias, alpha, stencil off, DPR capped at 2
│   └── Suspense
│       └── SolarSystem
│           ├── PerspectiveCamera (fov 60, near 0.1, far 1000) + drei OrbitControls
│           ├── ambientLight 0.02
│           ├── Starfield (5000 points, radius 600)
│           ├── Sun                       group "planet-sun": mesh + pointLight + ambientLight
│           ├── Planet × 13               8 planets + 5 dwarf planets
│           ├── Satellite × 24            if showSatellites
│           ├── Moon × 26                 if showMoons
│           ├── AsteroidBelt              own Suspense (Ceres texture)
│           └── KuiperBelt                own Suspense (Pluto texture)
├── Loader (drei)                 first load only
├── ObjectList                    search, 6 category filters, ↑/↓ navigation
├── ControlPanel                  pause, reset, speed, toggles, Space/←/→ keys
├── PlanetInfo / SatelliteInfo / MoonInfo   slide-in panels, z-[100]
└── "Tip" hint                    only when nothing is selected
```

## 3. State and data flow

### 3.1 App state

| State                                         | Purpose                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `speedMultiplier` (0.1-10, default 1)         | Scales orbital motion                                                   |
| `isPaused`                                    | User-requested pause                                                    |
| `isCameraInteracting`                         | Set by OrbitControls `onStart`/`onEnd`, reported up from `SolarSystem`  |
| `resumeWhileSelected`                         | Lets the user resume motion while an object stays selected              |
| `showOrbits`, `showSatellites`, `showMoons`   | Visibility toggles                                                      |
| `cameraMode` (`'free' \| 'follow'`)           | Follow mode lerps the orbit-controls target to the selected object      |
| `selectedPlanet` / `selectedSatellite` / `selectedMoon` | **Mutually exclusive** selection (the Sun is a `PlanetData` with id `sun`) |
| `initialLoadDone`                             | Hides the drei `Loader` after the first `useProgress().active` → false  |

### 3.2 Effective pause

```ts
effectivePaused = isPaused || isCameraInteracting || (isObjectSelected && !resumeWhileSelected);
```

- Selecting an object freezes motion so the camera can settle on it.
- The pause button inverts `effectivePaused`: if paused it sets `isPaused=false` and
  `resumeWhileSelected=true`; if running it sets `isPaused=true` and `resumeWhileSelected=false`.
- `resumeWhileSelected` resets to `false` when the selection clears.
- `SolarSystem` further passes `isPaused || isCameraInteracting || isTransitioning` to every body
  (its own `isCameraInteracting` and an `isTransitioning` flag for GSAP tweens).

### 3.3 Events (bottom to top)

```
Canvas click on a body  → Planet/Moon/Satellite/Sun onClick → SolarSystem handle*Click
                          → onPlanetSelect/onSatelliteSelect/onMoonSelect (others set to null)
ObjectList click / ↑↓   → same App setters; SolarSystem effects react to the new selection (§5.2)
Close button            → set selection null, then window.resetSolarSystemCamera()
Reset button            → window.resetSolarSystemCamera()   (declared in src/vite-env.d.ts)
OrbitControls start/end → setIsCameraInteracting → onCameraInteractionChange → App
```

`window.resetSolarSystemCamera` is the only global the app itself relies on; `SolarSystem` assigns
it in an effect. In `npm run dev` only, `Canvas` `onCreated` also installs the read-only inspection
hook `window.__SOLAR_DEBUG__` (`src/lib/debugHook.ts`; see
[TECHNICAL.md](TECHNICAL.md#performance-measurement)).

## 4. Scene model

### 4.1 Object naming

Parent tracking and camera targeting rely on these names:

| Object             | Name                                    | Set in         |
| ------------------ | --------------------------------------- | -------------- |
| Planet / dwarf     | `planet-<id>` (the orbiting group)      | `Planet.tsx`   |
| Sun                | `planet-sun`                            | `Sun.tsx`      |
| Moon               | `moon-<id>`                             | `Moon.tsx`     |
| Satellite          | `satellite-<id>`                        | `Satellite.tsx`|

- Moons look up `planet-<parentPlanet>` in the scene registry every frame and orbit its world position.
  `Sun`, `Planet`, `Moon` and `Satellite` register their group in a layout effect
  (`useRegisterObject`) and remove it on unmount, so the entry exists before the first frame.
- Satellites with `parentPlanet: 'sun'` orbit `planet-sun` (the origin); `'moon'` is hard-coded to
  `moon-moon`, so only Earth's Moon can be a satellite parent.
- `SolarSystem` wraps each planet in `<group name="planet-group-<id>">`, which is unused for lookups.

### 4.2 Coordinates and scale

- The Sun is at the origin; orbits lie in the XZ plane (`y = 0`) except Pluto (17° tilt) and moons
  with `orbitInclination`.
- Units are arbitrary and **not to scale**: planet distances are compressed (Earth 25, Neptune 140,
  Pluto 170, Eris 200), and sizes are compressed (Earth radius 1, Sun 6, Jupiter 4). Gas giants are
  drawn at roughly 35-65 % of true relative size. See [INACCURACIES.md](INACCURACIES.md).
- Initial camera: `(0, 80, 180)`, animated in over 2 s. Orbit controls: `minDistance 1`,
  `maxDistance 400`, `maxPolarAngle = π/1.5`, zoom 0.8 / rotate 0.6 / pan 0.8.

### 4.3 Motion model

All orbits are circular and constant-rate:

```
angle += orbitalSpeed * speedMultiplier * delta * 0.1
position = parent + (cos(angle), 0, sin(angle)) * distance
```

- Start angle is random per instance per page load.
- **Pluto** uses a conic form `r = a(1-e²)/(1+e cos θ)` with `e = 0.25` and a 17° inclination, but
  still advances θ at a constant rate (not Kepler's second law).
- **Moons** apply inclination by rotating the orbit about X: `y = z·sin(i)`, `z' = z·cos(i)`.
  Triton uses 157° (retrograde).
- **Escape-trajectory probes** (Voyager 1/2, New Horizons) do not orbit; they sit at a fixed angle
  derived from a hash of their id, offset from their parent, with a dashed line back to it.
- Planet spin increments `rotation.y` by `rotationSpeed` per frame (not `delta`-scaled) and ignores
  `speedMultiplier`; moon spin is `delta * 0.15 * speedMultiplier`. Each of `Planet`, `Moon` and
  `Satellite` keeps its running angle in a ref that `useFrame` advances. React state is read only once,
  at mount, for the random start angle, so the animation loop causes no React re-renders.

## 5. Camera and selection

### 5.1 Direct click

`SolarSystem` handlers (`handlePlanetClick`, `handleSatelliteClick`, `handleMoonClick`,
`handleSunClick`) all follow the same pattern:

1. Ignore the click if `isTransitioning`.
2. Set the matching selection and clear the other two.
3. GSAP-tween `camera.position` and `controls.target` for 1.5 s (`power2.inOut`); `onComplete`
   clears `isTransitioning`.

Camera offset is `(d, d/2, d)` from the target, where `d = radius × 8` for planets, `× 25` for
satellites, `× 10` for moons. The Sun is special-cased: camera to `(20, 15, 20)`, target to origin.

### 5.2 Selection from the Object List

Clicking a list row or pressing ↑/↓ only calls the App setters (no position is known). Three
effects in `SolarSystem` (planet, satellite, moon) watch the selected id, look the object up by name,
read its world position and call the same click handler. Each uses a "previous id" ref plus an
`isAnimating…FromListRef` flag cleared by a **1600 ms** `setTimeout`, so a selection that was
already animated (for example by a direct click) is not animated twice. The Sun path adds a 100 ms
delay first.

### 5.3 Reset and follow

- `resetCamera` clears all selections and tweens back to `(0, 80, 180)` / origin over 1.5 s.
- Follow mode (`cameraMode === 'follow'`) runs in `useFrame`: when not transitioning it lerps
  `controls.target` toward the selected object's world position at `0.05` per frame. The camera
  position is not moved, so distance and angle drift as the object moves.

## 6. Rendering each kind of body

### 6.1 Planets (`Planet.tsx`)

| Aspect       | Behaviour                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Mesh choice  | Earth → `EarthMesh`; any body with `texture` → `TexturedPlanetMesh`; otherwise `ColoredPlanetMesh`                 |
| Fallback     | Each textured mesh sits in its own `Suspense` with `ColoredPlanetMesh` as fallback                                 |
| Earth        | Day map plus night map as `emissiveMap` with white emissive 0.6; a 1.05× back-face sphere (`#4A90E2`, 15 %) as atmosphere |
| Saturn       | `RingGeometry` 1.2×-2.2× radius, tilted 0.466 rad, radial UVs; inner `Suspense` with a flat translucent ring fallback |
| Uranus       | Opaque ring 1.8×-2.0× radius, rotated 90°                                                                          |
| Orbit / trail| 128-segment orbit line (opacity 0.15), built once per planet. Trail: `TrailLine`, a ring of the last 100 per-frame positions (opacity 0.4) written in place and drawn oldest to newest. The trail is not attached to any element (`trailRef`), so its update block never runs and nothing is drawn |
| Hover        | Back-face additive sphere at 1.15× pulsing; cursor set to `pointer` through `document.body.style`                  |
| Label        | drei `<Html>` with `zIndexRange=[90, 0]` so labels sit under info panels                                           |

### 6.2 Sun (`Sun.tsx`)

Textured emissive sphere (radius 6, emissive intensity 1.5) with a coloured fallback. It owns the
scene's only real light: `pointLight` intensity 200, `distance 0`, `decay 1`, plus an
`ambientLight` 0.15. There is no glow or corona effect.

### 6.3 Moons (`Moon.tsx`)

- Only Earth's Moon has a file texture (`/textures/moon.webp`). Every other moon uses
  `ProceduralMoonMesh`, which builds a deterministic 512×512 canvas texture from the moon's id,
  `color` and `surfaceType` (`rocky`, `icy`, `volcanic`, `mixed`) via
  `getCachedMoonTexture` in `src/lib/textureGenerator.ts`. Iapetus is two-toned, Charon gets a red
  polar cap, Triton a pink overlay.
- Each moon has a subtle 1.2× back-face glow, an orbit line around the parent's current world
  position (built once per moon and disposed on unmount), and a small label. **Moon orbit lines
  ignore `showOrbits`.**

### 6.4 Satellites (`Satellite.tsx`)

Model selection, first match wins:

1. **GLB**: `modelPath` and `modelScale` both set. A glowing placeholder sphere renders until
   loading is allowed, then `useGLTF` inside `Suspense` (the scene is cloned per instance).
2. **Procedural by id**: hand-built primitive models for `iss`, `tianhe`, `hubble`, `jwst`,
   `gaia`, `voyager1/2`, `cassini`, `juno`, `mars-reconnaissance`, `soho`, `bepicolombo`,
   `europa-clipper`, `lucy`, `new-horizons`, `psyche`, `gps`, `starlink`. Blocks for ids that also
   have a GLB are unreachable.
3. **Type fallback**: generic `space-station`, `telescope`, `probe` or default shape.

Each satellite also has a faint base glow, a hover glow and a label. Colours per type come from
`satelliteTypeColors` in `src/data/satellites.ts`. Orbit lines are 64-segment circles (opacity
0.2) following the parent. See [SATELLITE_3D_MODELS.md](SATELLITE_3D_MODELS.md).

### 6.5 Starfield and belts

- **Starfield:** 5000 `Points` between 0.5R and R (R = 600) with four colour tints, additive
  blending, rotating about Y at 0.005 rad/s.
- **Asteroid belt:** 200 dodecahedra, radius 42-48, vertical spread ±1, scale 0.1-0.4, Ceres map.
- **Kuiper belt:** 400 icosahedra, radius 155-220, vertical spread ±4, scale 0.15-0.65, Pluto map.
- Both are `instancedMesh` with `frustumCulled={false}`, each in its own `Suspense`, rotating
  slowly (0.02 and 0.003 rad/s) only while unpaused. They ignore `speedMultiplier`.

## 7. UI layer

- **ControlPanel** (bottom-left): pause/resume, reset, speed slider, toggles for orbits,
  satellites, moons and "Follow Object". Global key handler: **Space** toggles pause, **← / →**
  change speed by 0.1 (clamped 0.1-10). Ignored when the event target is an `INPUT` or `TEXTAREA`.
- **ObjectList** (above the controls): search over name, description and parent id; six category
  filters with All / None; list sorted by name. While expanded, **↑ / ↓** cycle the filtered list
  and select the next entry (ignored for editable targets, wraps around).
- **Info panels** (top-right, `z-[100]`): `PlanetInfo`, `SatelliteInfo`, `MoonInfo`. Each slides in
  and out with GSAP on a class selector (`.planet-info-panel`, `.satellite-info-panel`,
  `.moon-info-panel`) and stays mounted until its exit tween completes. `SatelliteInfo` also loads
  the mission image lazily with loading and error states.
- **Header:** help dialog (Radix `Dialog`), GitHub link, version from `VITE_APP_VERSION`.
- Styling is Tailwind with shadcn-style primitives in `src/components/ui`
  (`button`, `dialog`, `input`, `slider`, `switch`) and HSL theme variables in `src/index.css`.

## 8. Loading strategy

1. **Blocking set.** `index.html` preloads `sun.webp`, `earth_day.webp` and `earth_night.webp`.
   Everything else is lazy.
2. **Per-mesh `Suspense`.** Planets, the Sun, textured moons, Saturn's rings and each belt suspend
   independently with a visible fallback, so the canvas never blanks.
3. **Loader.** The drei `Loader` is shown only until the first time `useProgress().active` becomes
   false; later GLB streaming does not bring it back.
4. **Satellite GLBs.** `requestIdleCallback` (timeout 5 s; `setTimeout` 3 s fallback for Safari),
   then a stagger of `index × 250 ms`. Selecting a satellite loads its GLB immediately.
5. **Chunks.** `vite.config.ts` splits `vendor-three` (three, three-stdlib, @react-three) and
   `vendor-react`; `kimi-plugin-inspect-react` is applied only for `vite serve`.
6. **Compression.** GLBs are meshopt-compressed (decoded by drei's bundled decoder, no network
   fetch); textures and panel images are WebP. See [TECHNICAL.md](TECHNICAL.md#4-asset-pipeline).

### Path conventions

The Vite `base` is `/solar-system/`. Components resolve public assets with
`${import.meta.env.BASE_URL}${path}` and collapse `//`. The data files are inconsistent about
leading slashes, and both forms work:

| Field                  | Example                              | Leading slash |
| ---------------------- | ------------------------------------ | ------------- |
| `texture` (planets, moons, Sun) | `/textures/earth_day.webp`  | yes           |
| `imageUrl` (satellites)         | `satellites/iss.webp`       | no            |
| `modelPath` (satellites)        | `3d-objects/satellites/iss.glb` | no        |

## 9. Lighting

| Light                     | Where          | Settings                                  |
| ------------------------- | -------------- | ----------------------------------------- |
| `ambientLight`            | `SolarSystem`  | intensity 0.02 (deep-space dark side)     |
| `pointLight`              | Sun group      | intensity 200, `distance 0`, `decay 1`    |
| `ambientLight`            | Sun group      | intensity 0.15 for readable day sides     |

No shadows. Bodies add a small emissive term so night sides stay faintly visible.

## 10. Build, CI and deploy

- `npm run build` runs `tsc -b` then `vite build` (output in `dist/`).
- **Pull requests to `main`** run `quality.yml`: lint, `npm audit --audit-level=moderate`, build.
  `npm test` (Vitest data-integrity tests) is not part of CI yet.
- **Publishing a GitHub Release** runs `deploy.yml`: lint, build with `VITE_APP_VERSION` taken from
  the tag, upload, then SSH deploy to a Vultr VPS (timestamped release directory, `current`
  symlink swap, last 5 releases and 3 backups kept) and a verification job.
- Details, secrets and release practice are in [TECHNICAL.md](TECHNICAL.md#7-cicd).

## 11. Known limitations

Tracked, with fixes and a roadmap, in
[PERFORMANCE_AND_VISUALIZATION.md](PERFORMANCE_AND_VISUALIZATION.md). The main ones:

- Trails are not drawn: the ring-buffer path is in place but not attached (`trailRef`). A visible trail
  is a separate visual change; its sampling is still one point per frame, so it is short for slow planets.
- 63 always-on DOM labels, and GPU texture memory around 150 MB.
- Unused code: `scaleFactors`, `getMoonsByPlanet`, the `OrbitTrail` type, most of
  `src/lib/textureGenerator.ts`, and unreachable procedural satellite models.
- No error boundaries or WebGL-support fallback.
- Automated tests are limited to data and documentation integrity (`npm test`, Vitest in Node);
  there are no component, interaction or rendering tests.
