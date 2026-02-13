# 3D Models for Satellites

Reference for finding 3D models for each satellite in the Solar System Explorer. Your app currently uses **procedural geometry** in `src/components/Satellite.tsx`; you can replace or augment with external GLB/GLTF models loaded via `@react-three/drei`'s `useGLTF`.

## Primary source: NASA 3D Resources

- **Portal:** https://nasa3d.arc.nasa.gov/models (or https://science.nasa.gov/3d-resources/)
- **GitHub (raw assets):** https://github.com/nasa/NASA-3D-Resources
- **Formats:** Often 3DS, OBJ, STL, Blender, Maya, sometimes GLB. For the web you may need to convert to GLB/GLTF (e.g. via Blender or online converters).
- **License:** Free, no copyright restrictions (see [NASA Media Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)).

## Secondary source: Sketchfab

- **NASA official:** https://sketchfab.com/NASA
- Many community models are free and downloadable as **GLB**; check license (often CC Attribution).

---

## Mapping: satellite id → 3D model sources

| Satellite id           | Name / mission              | NASA 3D Resources | Sketchfab / other |
|------------------------|-----------------------------|--------------------|-------------------|
| **iss**                | International Space Station | Search “International Space Station” on [NASA 3D](https://nasa3d.arc.nasa.gov/models) | [ISS models](https://sketchfab.com/search?q=international+space+station&type=models) (e.g. “International Space Station” by BlendRuN or Osvaldo Mendes; export as GLB) |
| **hubble**             | Hubble Space Telescope      | [Hubble](https://science.nasa.gov/3d-resources/) (search “Hubble”) / [data.gov HST](https://catalog.data.gov/dataset/nasa-3d-models-hubble-space-telescope) | [Hubble Space Telescope](https://sketchfab.com/3d-models/hubble-space-telescope-640764e1a20a4c7ea9718a83a05bcb7f) (NASA); export GLB |
| **jwst**               | James Webb Space Telescope  | Search “James Webb” on [NASA 3D](https://nasa3d.arc.nasa.gov/models) | [JWST](https://sketchfab.com/3d-models/jwst-james-webb-space-telescope-6c92c08a672640afb58ee44d248fd0fe) (Paul); GLB |
| **voyager1** / **voyager2** | Voyager                  | [Voyager](https://nasa3d.arc.nasa.gov/detail/voyager-2) (Voyager probe models) | [Voyager 1&2](https://sketchfab.com/3d-models/voyager-12-edac5c8bbbec4321b49bff0da2ca4fda) (Your Local Loser); NASA on Sketchfab |
| **cassini**            | Cassini                     | Cassini orbiter / Huygens on [NASA 3D](https://nasa3d.arc.nasa.gov/models) (search “Cassini”); formats: DXF, OBJ, etc. | Search “Cassini” on Sketchfab for GLB options |
| **juno**               | Juno                        | Search “Juno” on [NASA 3D](https://nasa3d.arc.nasa.gov/models) | Search “Juno spacecraft” on Sketchfab |
| **mars-reconnaissance**| MRO                         | Search “Mars Reconnaissance” or “MRO” on NASA 3D | Search “MRO” or “Mars Reconnaissance Orbiter” on Sketchfab |
| **new-horizons**       | New Horizons                | Search “New Horizons” on NASA 3D | Search “New Horizons” on Sketchfab |
| **parker-solar-probe** | Parker Solar Probe           | Search “Parker” on NASA 3D | Search “Parker Solar Probe” on Sketchfab |
| **osiris-apex**        | OSIRIS-APEX (ex OSIRIS-REx)  | Search “OSIRIS” or “OSIRIS-REx” on NASA 3D | Search “OSIRIS-REx” on Sketchfab |
| **chandra**            | Chandra X-ray Observatory    | Search “Chandra” on NASA 3D | Search “Chandra” on Sketchfab |
| **soho**               | SOHO                        | Search “SOHO” on NASA 3D | Search “SOHO” on Sketchfab |
| **lro**                | Lunar Reconnaissance Orbiter | Search “LRO” or “Lunar Reconnaissance” on NASA 3D | Search “LRO” on Sketchfab |
| **mars-odyssey**       | Mars Odyssey                | Search “Mars Odyssey” on NASA 3D | Search “Mars Odyssey” on Sketchfab |
| **maven**              | MAVEN                       | Search “MAVEN” on NASA 3D | Search “MAVEN” on Sketchfab |
| **gaia**               | Gaia (ESA)                  | ESA missions rarely on NASA 3D | Search “Gaia spacecraft” on Sketchfab |
| **bepicolombo**       | BepiColombo (ESA/JAXA)      | Unlikely on NASA 3D | Search “BepiColombo” on Sketchfab |
| **tianhe**             | Tianhe (CSS)                | Unlikely on NASA 3D | Search “Tianhe” or “Chinese space station” on Sketchfab |
| **europa-clipper**     | Europa Clipper              | Search “Europa Clipper” on NASA 3D (may appear as mission progresses) | Search “Europa Clipper” on Sketchfab |
| **lucy**               | Lucy                        | Search “Lucy” on NASA 3D | Search “Lucy spacecraft” on Sketchfab |
| **psyche**             | Psyche                      | Search “Psyche” on NASA 3D | Search “Psyche spacecraft” on Sketchfab |
| **gps**                | GPS satellites              | Search “GPS” on NASA 3D; generic sat models may suffice | Generic “GPS satellite” on Sketchfab |
| **starlink**           | Starlink                    | Not NASA; commercial | Search “Starlink” on Sketchfab (fan-made, check license) |

## Using a model in the app

1. Download as **GLB** (or convert to GLB).
2. Place under `public/models/satellites/` (e.g. `iss.glb`, `hubble.glb`).
3. In `Satellite.tsx`, for a given `data.id` load and render the model, e.g.:

```tsx
import { useGLTF } from '@react-three/drei';

function SatelliteModel({ id }: { id: string }) {
  const { scene } = useGLTF(`/models/satellites/${id}.glb`);
  return <primitive object={scene.clone()} scale={…} />;
}
```

4. Preload models where needed: `useGLTF.preload('/models/satellites/iss.glb')`.
5. Keep your existing `renderSatelliteModel()` as fallback when no GLB exists for an `id`.

## Converting NASA formats to GLB

- **Blender:** File → Import → 3DS/OBJ/etc. → File → Export → glTF 2.0 (.glb).
- **Online:** Use a converter that supports your source format (e.g. 3DS/OBJ → GLB).
