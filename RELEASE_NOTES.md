# Release Notes

## Latest – Docs sync (see README / docs for full detail)

### Counts & UX (current)

- **24 spacecraft**, **27 natural moons**, **13** entries in `planets` (8 planets + 5 dwarf planets) plus **Sun** via `sunData`.
- **Object list**: **All** / **None** for category filters; **↑** / **↓** to cycle the filtered list (control panel hints: Space, ←→, ↑↓).
- **Belts**: Asteroid and Kuiper instanced meshes use **Ceres**-like and **Pluto**-like textures; **Saturn** ring texture loads inside inner `Suspense` with solid fallback.
- **Satellite GLBs**: Loaded with Vite `base`-aware URLs; **staggered** fetch with immediate load when a satellite is selected; `npm run compress-satellite-glbs` for batch optimize.

---

## Previous – Data, spacecraft & filter categories

### Spacecraft & data

- **24 spacecraft** (grown from early 12): Includes Parker Solar Probe, New Horizons, Europa Clipper, SOHO, BepiColombo, OSIRIS-APEX, Lucy, Psyche, Chandra, LRO, Mars Odyssey, MAVEN, Tiangong, etc.
- **Escape trajectory**: Voyager 1/2 and New Horizons use `escapeTrajectory: true` (dashed trail, no closed orbit).
- **Orbital correctness**: JWST and Gaia at Sun–Earth L2 orbit the Sun (not Earth). LRO orbits the Moon (`parentPlanet: 'moon'`).
- **Planet data**: Saturn 274 moons; Venus 465°C; Mercury sidereal day 58.6 Earth days; Europa Clipper launched Oct 2024; Deimos mission highlights (Viking orbiters 1976–1980).

### Object list & categories

- **Six filter categories**: Planets, Moons, **Space Stations**, **Telescopes**, **Probes**, **Navigation** (replacing a single “Satellites” toggle).
- **Icons & colors** per spacecraft type (Stations, Telescopes, Probes, Navigation) in the object list.

### Documentation

- **README.md**: Updated features, celestial bodies list, Object List, Configuration.
- **docs/TECHNICAL.md**: SatelliteData (escapeTrajectory, parentPlanet sun/moon), “Adding a New Satellite”.
- **docs/ARCHITECTURE.md**: Satellite count, filter categories, SatelliteData.
- **docs/API.md**: SatelliteData interface and properties.

---

## Version 1.0.0 - Enhanced 3D Solar System Explorer

### Overview

This release brings significant visual and interactive improvements to the 3D Solar System Explorer, including realistic planet textures, animated hover effects, improved lighting, and enhanced user experience with camera interaction feedback.

---

## 🎨 Visual Enhancements

### Realistic Planet Textures

- **WebP Format**: All planets now use high-quality WebP textures for better compression and faster loading
- **Texture Sources**: Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto feature realistic surface textures from NASA and scientific sources
- **Fallback Support**: Graceful fallback to procedural colors if textures fail to load

### Animated Hover Glow Effects

- **Planets**: Smooth pulsing glow effect when hovered (sine wave animation, 3x pulse speed)
- **Moons**: Subtle glow animation for natural moons (4x pulse speed)
- **Satellites**: Energetic glow effect for artificial satellites (5x pulse speed)
- **Visual Feedback**: Clear indication of interactive objects without jittering

### Improved Lighting

- **Scene ambient**: Very low (`SolarSystem`) for deep-space look; **Sun** group adds fill ambient + point light (intensity 200, linear decay)
- **Earlier note**: Global ambient was raised to 0.15 before fill moved onto the Sun group
- **Texture Visibility**: Mercury and Venus now clearly show surface details

---

## 🚀 Interactive Features

### Camera Interaction Pause

- **Automatic Pause**: All object movement pauses when user pans, rotates, or zooms camera
- **Visual Feedback**: Control panel pause button shows active state during camera interaction
- **Smooth Resume**: Objects resume movement immediately when interaction ends
- **Manual Override**: Manual pause state is preserved and combined with camera interaction state

### Extended Speed Control

- **New Range**: Speed slider now supports 0.1x to 10x (previously 0.1x to 5x)
- **Time-lapse Viewing**: Watch orbital mechanics at accelerated speeds
- **Fine Control**: 0.1x increments for precise speed adjustment

### Z-Index Layering Fix

- **Info Panels**: All information panels (Planet, Moon, Satellite) now use `z-[100]`
- **3D Labels**: HTML labels in 3D scene stay below info panels
- **No Overlap**: Information panels always appear above 3D scene elements

---

## 🌌 Celestial Body Improvements

### Asteroid & Kuiper Belt Visibility

- **Frustum Culling Disabled**: Belts no longer disappear when panning camera
- **Always Visible**: 200+ asteroids and 400+ Kuiper belt objects remain visible
- **Performance**: Maintained through instanced mesh rendering

### Moon Data Expansion

- **27 Natural Moons**: Includes dwarf-planet satellites (e.g. Haumea, Makemake, Eris) in addition to classical planet moons
- **Detailed Information**: Discovery year, discoverer, diameter, and orbital inclination for each moon
- **Interactive**: All moons clickable with detailed information panels

---

## 🛠️ Technical Improvements

### Performance Optimizations

- **Instanced Rendering**: Efficient rendering for 600+ belt objects
- **Texture Compression**: WebP format reduces file sizes by ~30% compared to JPEG
- **Animation Efficiency**: Sine-wave based glow animations with no performance impact
- **Memory Management**: Proper cleanup and ref usage for Three.js objects

### Code Architecture

- **Component Structure**: Added Moon component with consistent API to Planet and Satellite
- **State Management**: Camera interaction state tracked in App and passed to ControlPanel
- **Type Safety**: Full TypeScript coverage with updated interfaces
- **Documentation**: Complete API documentation for all components

### Bug Fixes

- **Belt Visibility**: Fixed asteroid and Kuiper belt disappearing when panning camera
- **Z-Index Issues**: Fixed info panels appearing behind 3D labels
- **Lighting Balance**: Adjusted light intensities for better texture visibility
- **Pause State**: Fixed pause button not reflecting camera interaction state

---

## 📚 Documentation Updates

### Updated Files

- **README.md**: Added new features and updated feature descriptions
- **docs/TECHNICAL.md**: Complete rewrite with new architecture details
- **docs/ARCHITECTURE.md**: Updated component hierarchy and data flow
- **docs/API.md**: Full API reference with MoonData and new props

### New Sections

- Camera interaction pause flow documentation
- Hover glow animation implementation details
- Texture loading and WebP format guide
- Troubleshooting section for common issues

---

## 🎯 User Experience

### Control Panel

- **Visual Feedback**: Pause button shows active during camera interaction
- **Extended Range**: Speed slider goes up to 10x for time-lapse viewing
- **Responsive**: All controls work smoothly with 60fps animation

### Object Interaction

- **Hover Effects**: Clear visual feedback on all interactive objects
- **Click to Explore**: Smooth camera transitions to selected objects
- **Information Panels**: Detailed facts and data for all celestial bodies

### Navigation

- **Free Camera**: Orbit, pan, and zoom with automatic pause
- **Follow Mode**: Camera smoothly follows selected objects
- **Reset View**: One-click return to overview position

---

## 📦 Assets

### Textures (see `public/textures/`)

- **Earth**: `earth_day.webp`, `earth_night.webp` (separate day/night in scene)
- **Other planets / dwarfs**: WebP maps (e.g. Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Ceres, etc.)
- **Saturn rings**: `saturn_ring_alpha.png`

### Scripts

- `scripts/download-earth-texture.mjs` - Download Earth day/night sources (convert/optimize separately as needed)
- `scripts/optimize-satellite-images.mjs`, `scripts/compress-satellite-glbs.mjs` - Optional asset pipelines (see README)

---

## 🔧 Dependencies

No new dependencies added. All improvements use existing:

- React 19.2.0
- Three.js 0.182.0
- @react-three/fiber 9.5.0
- @react-three/drei 10.7.7
- GSAP 3.14.2

---

## 🐛 Known Issues

1. **Mobile Performance**: Could be optimized further for low-end devices
2. **Accessibility**: Limited keyboard navigation support
3. **Error Boundaries**: No error handling for 3D loading failures
4. **Loading States**: Could show progressive loading for textures

---

## 🗺️ Roadmap

### Completed

- [x] Planet surface textures
- [x] Animated hover effects
- [x] Camera interaction pause
- [x] Extended speed range
- [x] Moon information panels
- [x] Z-index layering fix
- [x] Belt visibility fix

### Planned for Future

- [ ] Day/night cycle with proper lighting
- [ ] Comet and asteroid tracking
- [ ] Audio narration and sound effects
- [ ] Mobile VR/AR support
- [ ] Solar system events calendar
- [ ] Real-time position data integration

---

## 🙏 Contributors

This release includes improvements and bug fixes. Thank you to all contributors who helped make this release possible!

---

## 📄 License

This project remains open-source under the MIT License.

---

**Full Changelog**: Compare with previous version to see all changes.

**Download**: [GitHub Releases](https://github.com/ronggur/solar-system/releases)

**Demo**: [Live Application](https://www.ronggur.com/solar-system/)

---

_Released: 2024_

_Built with curiosity and code. Explore the cosmos! 🚀✨_
