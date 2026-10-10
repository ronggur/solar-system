# Satellite 3D Models

Reference for the GLB models used by satellites and probes, how to add or replace one, and where to
find models for the spacecraft that still use hand-built procedural shapes. For how satellites are
rendered see [ARCHITECTURE.md](ARCHITECTURE.md#64-satellites-satellitetsx).

## Current status

24 spacecraft: **14 use a GLB**, **10 are procedural only**. Source of truth is
[`src/data/satellites.ts`](../src/data/satellites.ts).

### With a GLB (`public/3d-objects/satellites/`)

| Satellite id          | File                       | `modelScale` | Size   | Credit URL |
| --------------------- | -------------------------- | ------------ | ------ | ---------- |
| `iss`                 | `iss.glb`                  | 0.01         | 34 KB  |            |
| `hubble`              | `hubble.glb`               | 0.00025      | 184 KB |            |
| `jwst`                | `jwst.glb`                 | 0.01         | 855 KB |            |
| `voyager1`            | `voyager1.glb`             | 0.9          | 295 KB |            |
| `voyager2`            | `voyager2.glb`             | 0.9          | 295 KB |            |
| `cassini`             | `cassini.glb`              | 0.03         | 261 KB |            |
| `juno`                | `juno.glb`                 | 0.01         | 260 KB |            |
| `mars-reconnaissance` | `mars-reconnaissance.glb`  | 0.025        | 12 KB  |            |
| `parker-solar-probe`  | `parker-solar-probe.glb`   | 0.04         | 229 KB |            |
| `osiris-apex`         | `osiris.glb`               | 0.008        | 1.08 MB|            |
| `chandra`             | `chandra.glb`              | 0.01         | 189 KB |            |
| `lro`                 | `lro.glb`                  | 0.0015       | 717 KB |            |
| `mars-odyssey`        | `mars-odyssey.glb`         | 0.002        | 44 KB  | [Sketchfab](https://sketchfab.com/3d-models/mars-odyssey-fb7d690bf8df423cbec696caa662f30b) |
| `maven`               | `maven.glb`                | 0.01         | 40 KB  |            |

Note the file names that differ from the id (`osiris.glb` for `osiris-apex`). Sizes are as of
v1.6.0 (about 4.3 MB total, all meshopt-compressed).

> **Credits:** only `mars-odyssey` records a `modelCreditUrl`, which `SatelliteInfo` shows as "3D
> model source". When a model's licence requires attribution (for example CC BY on Sketchfab), set
> `modelCreditUrl` for it.

### Procedural only

`gps`, `starlink`, `tianhe`, `gaia`, `new-horizons`, `europa-clipper`, `soho`, `bepicolombo`,
`lucy`, `psyche`. These are built from primitives in `renderSatelliteModel()` in
`src/components/Satellite.tsx`. They are a deliberate fallback and look recognisable at the scene's
scale, so a GLB is an upgrade, not a fix.

Where to look for a replacement:

| Id                                  | Hint                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `new-horizons`, `europa-clipper`, `lucy`, `psyche`, `soho` | Search the name in NASA 3D Resources; Europa Clipper, Lucy and Psyche may be newer additions. |
| `gps`                               | Generic GPS III models on NASA 3D Resources or Sketchfab are acceptable.                            |
| `gaia`, `bepicolombo`               | ESA missions are rarely in NASA 3D Resources; try Sketchfab and check the licence.                   |
| `tianhe`                            | Not NASA; search Sketchfab for "Tiangong" / "Chinese Space Station".                                |
| `starlink`                          | Commercial; fan-made models on Sketchfab only (check licence).                                      |

## Sources

- **NASA 3D Resources:** <https://science.nasa.gov/3d-resources/> (catalogue) and
  <https://github.com/nasa/NASA-3D-Resources> (raw assets). Free to use; see the
  [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). Formats are
  often 3DS/OBJ/STL/Blender, so conversion is usually required.
- **Sketchfab:** <https://sketchfab.com/NASA> and community models. Many are downloadable as GLB;
  check each licence (often CC BY, which needs attribution).

## Adding or replacing a model

1. **Get a GLB.** Convert with Blender (File → Import → 3DS/OBJ/…; File → Export → glTF 2.0
   `.glb`) or any converter that supports the source format. Remove cameras, lights and unused
   scenes first.
2. **Place it** in `public/3d-objects/satellites/<name>.glb`.
3. **Wire it up** in `src/data/satellites.ts`:

   ```ts
   modelPath: '3d-objects/satellites/<name>.glb', // no leading slash, no base
   modelScale: 0.01,                              // tune by eye
   modelCreditUrl: 'https://…',                   // if attribution is required
   ```

   `Satellite.tsx` resolves the URL with the Vite `base`; both `modelPath` and `modelScale` must be
   set or the procedural model is used instead.
4. **Compress:** `npm run compress-satellite-glbs`. Files are only replaced when the output is
   smaller (always for Draco sources).
5. **Check it in the app:** select the satellite from the Object List (this loads the GLB
   immediately instead of waiting for idle time), confirm orientation, scale, and that it doesn't
   dominate the scene.

### Budgets and tips

- Aim for **≤ 1 MB per GLB**. The largest today is `osiris.glb` at about 1.08 MB.
- `modelScale` is per model because source units differ wildly (0.00025 for Hubble, 0.9 for
  Voyager). A model's **bounding sphere** also affects hover/click size: LRO's scale was reduced
  from 0.004 to 0.0015 in v1.6.0 because of its bounding-sphere reach.
- Keep `radius` (used for camera distance, `radius × 25`) in step with the model's apparent size.
- Textures inside GLBs are re-encoded to WebP at ≤ 1024 px by the compress script.

## Why meshopt, not Draco

The GLBs were originally Draco-compressed. Draco needs its decoder downloaded at runtime (from
gstatic.com by default), which adds a request and a third-party dependency. drei's `useGLTF` already
wires the meshopt decoder from `three-stdlib` into `GLTFLoader`, so meshopt needs no extra setup
and no network fetch. Converting all GLBs took them from 18.9 MB to 4.5 MB (v1.6.0).

### The `maven.glb` case

The source MAVEN model was a 4.2 M-vertex disconnected triangle soup (10.5 MB as first committed)
that the standard meshopt simplifier could not reduce. It was pre-simplified once with
`scripts/simplify-glb-sloppy.mjs` (`simplifySloppy`, default target ratio 5 %) and then compressed,
ending at ~40 KB. If you add another model like this, use the same script, then run the
compress script.

## Fallback behaviour

If there is no GLB, `renderSatelliteModel()` falls back to an id-specific procedural model, then to
a generic shape by `type`. Procedural blocks for ids that also have a GLB (ISS, Hubble, JWST,
Voyager, Cassini, Juno, MRO) are unreachable and can be removed if desired.
