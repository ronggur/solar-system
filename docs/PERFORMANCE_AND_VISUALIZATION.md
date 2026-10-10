# Performance & Visualization Review

> **Status:** analysis and plan, no code changes applied yet.
> **Baseline:** commit `141a4ab` (v1.6.0), measured 2026-10-10.
> **Method:** full read of every source file plus asset and production-build measurements. Runtime
> behaviour (frame time, GPU memory, buffer leaks) was reasoned from the code and **has not been
> profiled in a browser yet**. Items marked _verify_ should be confirmed with the checks in
> [Measuring](#measuring) before and after any fix.

## TL;DR

- Download size is already good (≈ 8 MB of assets). **The bottleneck is per-frame CPU/DOM work and
  GPU memory, not bandwidth**, so further asset compression has diminishing returns.
- The single biggest win is to **stop re-rendering ~63 React components 60 times a second** and to
  stop allocating `THREE.Line` objects and buffers every frame.
- The best visual upgrades per unit of effort are a **Sun glow**, an **Earth day/night terminator
  with atmosphere**, and **click targets for tiny bodies**.

## Baseline

| Area               | Measured                                                                                  | Verdict                                              |
| ------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `public/` total    | 8.1 MB: textures 1.9 MB, GLBs 4.3 MB, satellite images 1.8 MB                             | Fine. The asset pipeline did its job.                |
| Largest GLBs       | osiris 1.08 MB, jwst 0.86 MB, lro 0.72 MB (14 GLBs total, all meshopt)                    | Fine, and idle-deferred.                             |
| JS (production)    | `index` 278 kB (87 gz), `vendor-react` 193 kB (61 gz), `vendor-three` 976 kB (267 gz)     | Acceptable. ≈ 414 kB gzip total.                     |
| CSS                | 32 kB (6.7 gz)                                                                            | Fine.                                                |
| File textures      | 10 × 1920×960, 2 × 1280×640, 4 × 1024×512 WebP, plus the Saturn ring PNG                  | ≈ 118 MB of GPU memory once decoded with mipmaps     |
| Procedural moons   | 25 × 512×512 canvas textures                                                              | ≈ 35 MB more GPU memory, generated on the main thread |
| Scene              | 13 planets, 26 moons, 24 satellites, 63 DOM labels, 63+ orbit lines, 2 instanced belts    | Draw calls OK; CPU/DOM side is the problem           |

GPU memory is estimated as `width × height × 4 B × 1.33` (mipmaps). A decoded texture costs the same
regardless of how small the WebP file is, so this is the number that matters on mobile.

## Performance findings

Ordered by expected impact. File and line references are to the baseline commit.

### P1. Per-frame React re-renders and allocations (highest impact)

- `Planet`, `Moon` and `Satellite` call `setAngle(...)` inside `useFrame`
  (`Planet.tsx:342-343`, `Moon.tsx:170-171`, `Satellite.tsx:203-204`). That re-renders ~63
  components per frame, roughly 3,800 renders per second.
- Each re-render of `Planet` and `Moon` builds a new `THREE.Line` and `LineBasicMaterial` inline in
  JSX (`Planet.tsx:434-463`, `Moon.tsx:205-216`). They are never disposed.
- `getOrbitalPosition` and the moon/satellite `useFrame` bodies allocate `new Vector3()` every
  frame.

**Fix:** keep the angle in a `useRef` and mutate `position` directly; build orbit and trail lines
once with `useMemo` and dispose on unmount; reuse module-level scratch vectors. Components should
re-render only on prop changes. **Effort:** small (three files).

### P2. Trail geometry likely leaks GPU buffers and is nearly invisible

- `trailGeometry.setFromPoints()` runs every frame (`Planet.tsx:353`) and allocates a new position
  attribute each time. Replaced attributes are not disposed, so GL buffers likely accumulate
  (_verify_ with `gl.info.memory.geometries` and Chrome's GPU memory over a few minutes).
- The trail holds 100 _frames_ (≈ 1.7 s at 60 fps). For Neptune that is a ~0.001 rad arc, so the
  trail is invisible, and its length depends on frame rate.

**Fix:** a preallocated `BufferAttribute` used as a ring buffer with `setDrawRange`, sampled by arc
distance rather than frame count. Alternatively drop trails and draw a fading arc behind the planet
using vertex alpha.

### P3. `scene.getObjectByName` runs ~50 times per frame

Every moon and satellite does a full scene-graph DFS each frame to find its parent
(`Moon.tsx:159`, `Satellite.tsx:183-185`), with a fresh `Vector3` each time.

**Fix:** a small registry (`Map<id, Object3D>` in a ref or context, filled on mount), or pass the
parent group ref down. Reuse scratch vectors.

### P4. 63 always-on DOM labels

Every body renders a drei `<Html>` label (`Planet.tsx:513`, `Moon.tsx:259`,
`Satellite.tsx:910`). Each updates a CSS transform per frame, which causes style/layout work, and
all 63 are visible at 40-60 % opacity, so the overview is cluttered.

**Fix:** always show planet labels; show moon and satellite labels only when the camera is within N
units of the parent, or when the parent or the object is selected. Toggle visibility through a ref
from one manager `useFrame`, not React state. This reduces both DOM cost and clutter.

### P5. Render only when something changes

When paused with no interaction nothing needs to render, but the Sun (`Sun.tsx:81-85`) and
starfield (`Starfield.tsx:58-62`) rotate regardless of pause, so the canvas renders at 60 fps
forever. The pixel ratio is capped at 2 with MSAA (`App.tsx:105-108`), i.e. up to 4× fragments on
retina.

**Fix:** `frameloop="demand"` while paused and idle (drei `OrbitControls` already invalidates on
change; GSAP tweens need `onUpdate: invalidate`). Add `<PerformanceMonitor>` with an adaptive DPR
(for example 1 to 1.5 on weak GPUs).

### P6. Procedural moon textures block the main thread at startup

`generateMoonTexture` runs a 512×512 per-pixel `sin`/`cos` loop per moon inside `useMemo` during
render (`textureGenerator.ts:361-485`, `Moon.tsx:100-110`). 25 moons ≈ 6.5 M pixel iterations
before first interaction. Most moons are well under 50 px on screen.

**Fix:** generate 128-256 px textures, or share one texture per `surfaceType` and tint with
`material.color`, or generate lazily when the camera is near. This also cuts ~25-30 MB of GPU
memory.

### P7. GPU memory

- Uranus, Neptune, Venus and Pluto are low-detail and can drop to 1024×512 (≈ 40 MB saved).
- KTX2/Basis would cut GPU memory 4-6× (download size is already fine). `gltf-transform` is already
  in the toolchain.
- `texture.clone()` plus `needsUpdate = true` on every loaded texture is unnecessary; set
  `colorSpace` once on the loaded texture.

### P8. Frame-rate-dependent motion and small items

- Planet and Sun spin are **not** scaled by `delta` (`Planet.tsx:358`, `Sun.tsx:83`), so they spin
  twice as fast on a 120 Hz display. Orbital motion and moon spin already use `delta`.
- Planet spin ignores `speedMultiplier`; the belts also ignore it.
- Starfield writes a per-star `size` attribute that `PointsMaterial` ignores
  (`Starfield.tsx:43-49`), and stars at radius ≤ 600 can clip at `far = 1000` when the camera is at
  its 400-unit max distance.
- `gsap` is used only for camera tweens and panel slides; drei `CameraControls` has built-in smooth
  transitions and would also remove the `isTransitioning` guard logic.

## Visualization findings

Ordered by impact per effort.

| #   | Finding                                                                                                                                                                                                                                                                  | Suggested change                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | **The Sun is a plain emissive sphere** with no glow or corona (`Sun.tsx`).                                                                                                                                                                                               | Additive billboard sprite with a radial gradient (one draw call). Optional Bloom on high-tier GPUs only (`useDetectGPU`).                   |
| V2  | **Earth night lights show on the sunlit side**: `emissiveMap` with white emissive (`Planet.tsx:65-72`) adds city lights regardless of lighting. The atmosphere is a flat 15 % blue back-face sphere (`Planet.tsx:478-488`).                                              | Blend day/night by `dot(normal, sunDir)` via `onBeforeCompile`; replace the atmosphere with a Fresnel shader; reuse it for Venus and Titan. |
| V3  | **Tiny bodies are effectively unclickable.** Ceres has radius 0.07, smaller than the belt rocks (0.1-0.4, `SolarSystem.tsx:522`) that represent its own belt; `mk2` is 0.012. `minDistance=1` also prevents close-up of tiny moons (`moon.radius * 10` can be below 1). | Invisible hit sphere with a minimum screen-space size; shrink belt rocks or enlarge Ceres; make `minDistance` relative to the selected body. |
| V4  | **"Show Orbits" only affects planets** (`Planet.tsx:434`); moon and satellite orbit lines are always drawn.                                                                                                                                                              | Gate moon and satellite orbit lines on `showOrbits`, or add separate toggles.                                                              |
| V5  | **Follow mode drifts**: only `controls.target` is lerped (`SolarSystem.tsx:396`), so camera distance and angle change as the object moves.                                                                                                                               | Add the same delta to `camera.position` to preserve the offset.                                                                            |
| V6  | **Axial tilt is missing.** Uranus's rings are rotated 90° (`Planet.tsx:499`) but the planet is not, so its poles are wrong.                                                                                                                                              | Apply tilt on a parent group and put rings inside it. Ring/planet shadowing is a later step.                                               |
| V7  | **No selection feedback** beyond the camera move and panel.                                                                                                                                                                                                              | A thin reticle ring or outline on the selected body.                                                                                       |
| V8  | **Mobile layout**: Control Panel (w-64), Object List (w-64) and Info Panel (w-80) overlap on narrow screens; `App.css` styles a `.control-panel` class that no component uses.                                                                                           | Collapse panels by default under 768 px; stack the info panel as a bottom sheet.                                                           |

## Roadmap

Do A and B first (low-risk refactors with no visual change), measure, then add visual effects so
they have frame-time headroom.

| Phase | Work                                                                                       | Effort      | Payoff                                       |
| ----- | ------------------------------------------------------------------------------------------ | ----------- | -------------------------------------------- |
| **A** | P1, P2, P3: refs, memoized lines, trail ring buffer, parent registry, scratch vectors      | ~½ day      | Biggest frame-time and memory win            |
| **B** | P4 label LOD, P5 demand rendering + adaptive DPR, P6 smaller/shared moon textures          | ~½ day      | Lower CPU and battery use, cleaner view      |
| **C** | V1 Sun glow, V2 Earth shader + atmosphere, V3 hit targets, V4 orbit toggle, V5 follow fix  | ~1 day      | Visibly better without extra GPU cost        |
| **D** | P7 KTX2/texture downsizing, V6 axial tilt, V7 reticle, V8 mobile layout, P8 small items    | optional    | Mobile polish and correctness                |

Progress:

- [ ] A. P1, P2, P3
- [ ] B. P4, P5, P6
- [ ] C. V1, V2, V3, V4, V5
- [ ] D. P7, P8, V6, V7, V8

## Measuring

Capture a baseline before Phase A and re-measure after each phase.

1. **Frame time:** Chrome DevTools Performance for 30 s at the default overview, then again with
   an object selected and `showMoons`/`showSatellites` on. Note scripting vs. rendering time.
2. **Three.js counters:** log `renderer.info` (`memory.geometries`, `memory.textures`,
   `render.calls`, `render.triangles`) at start and after 5 minutes. Growth in `geometries` confirms
   P2.
3. **React:** React DevTools Profiler, "highlight updates". A steady flicker on every planet confirms
   P1.
4. **GPU memory:** Chrome Task Manager (GPU process) at idle after load. Use it to validate P6/P7.
5. **Bundle:** `npx vite build` and compare chunk sizes against the table above.
6. **Optional:** add `r3f-perf` behind a dev-only flag for an in-scene overlay.

## Out of scope

- Real Keplerian orbits or ephemeris data (see [INACCURACIES.md](INACCURACIES.md) for the scaling
  trade-offs).
- Replacing the DOM UI panels; they are not a performance concern.
