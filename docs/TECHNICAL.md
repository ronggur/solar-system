# Technical Documentation

This document contains detailed technical information about the 3D Solar System Explorer project.

## 📁 Project Structure

```
solar-system/
├── src/
│   ├── components/          # React components
│   │   ├── ui/           # Radix UI components
│   │   ├── Moon.tsx       # Natural moon 3D component with hover glow
│   │   ├── MoonInfo.tsx   # Moon details panel (z-index: 100)
│   │   ├── ObjectList.tsx  # Searchable object list
│   │   ├── Planet.tsx     # Planet 3D component with textures and hover glow
│   │   ├── PlanetInfo.tsx # Planet details panel (z-index: 100)
│   │   ├── Satellite.tsx  # Satellite 3D component with hover glow
│   │   ├── SatelliteInfo.tsx # Satellite details panel (z-index: 100)
│   │   ├── SolarSystem.tsx # Main 3D scene with camera interaction pause
│   │   ├── Starfield.tsx  # Background stars
│   │   ├── Sun.tsx        # Sun 3D component with lighting
│   │   ├── ControlPanel.tsx # UI controls (speed 0.1x-10x)
│   │   └── Header.tsx     # App header
│   ├── data/               # Celestial body data
│   │   ├── moons.ts       # Natural moon data
│   │   ├── planets.ts     # Planet data with texture support
│   │   └── satellites.ts  # Satellite data
│   ├── types/             # TypeScript definitions
│   │   └── index.ts
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── App.tsx            # Main application with camera interaction state
│   ├── App.css            # App-specific styles
│   ├── index.css          # Global styles
│   └── main.tsx           # Entry point
├── public/               # Static assets
│   ├── textures/         # Planet / belt textures (WebP; Saturn ring PNG)
│   ├── satellites/       # Spacecraft panel images (WebP)
│   └── 3d-objects/
│       └── satellites/   # GLB models (optional per satellite `modelPath`)
├── dist/                 # Production build
├── index.html            # HTML entry
├── package.json         # Dependencies
├── vite.config.ts       # Vite config
├── tailwind.config.js   # Tailwind config
├── tsconfig.json        # TypeScript config
└── README.md            # Main documentation
```

## 🔧 Technology Stack

### Core Technologies

- **React 19.2.0**
  - Hooks for state management
  - Concurrent features for performance
  - JSX for UI rendering

- **TypeScript 5.9.3**
  - Type safety across codebase
  - Interface definitions for data structures
  - Compile-time error checking

- **Vite 7.2.4**
  - Fast development server with HMR
  - Optimized production builds
  - ES module support

### 3D Graphics

- **Three.js 0.182.0**
  - WebGL abstraction layer
  - Scene graph management
  - Material and geometry handling

- **@react-three/fiber 9.5.0**
  - React renderer for Three.js
  - useFrame hook for animations
  - declarative component syntax

- **@react-three/drei 10.7.7**
  - OrbitControls for camera
  - PerspectiveCamera component
  - Html for 3D labels
  - Loader for 3D assets
  - `TextureLoader` via `useLoader` for planet/sun/moon/belt textures; `useGLTF` for satellite GLBs

- **GSAP 3.14.2**
  - Camera animation transitions
  - Smooth easing functions
  - Timeline-based animations

### UI Components

- **Radix UI**
  - Accessible component primitives
  - Dialog, Slider, Switch, Button
  - Unstyled with Tailwind styling

- **Tailwind CSS 3.4.19**
  - Utility-first CSS framework
  - Responsive design
  - Dark mode support

- **Lucide React**
  - Icon library
  - Consistent icon style
  - Tree-shakeable

## 🏗️ Architecture

### Component Hierarchy

```
App
├── Header
├── Canvas (React Three Fiber)
│   ├── PerspectiveCamera
│   ├── OrbitControls (with onStart/onEnd callbacks)
│   ├── SolarSystem
│   │   ├── Starfield
│   │   ├── Sun (with point light)
│   │   ├── Planet × 13 (8 planets + 5 dwarf planets; textures and hover glow)
│   │   │   ├── Orbit Path
│   │   │   ├── Planet Mesh (with emissive glow)
│   │   │   ├── Atmosphere Glow
│   │   │   ├── Saturn Rings
│   │   │   ├── Uranus Rings
│   │   │   └── HTML Label
│   │   ├── Satellite × 24 (GLB or procedural; staggered GLB load; escape trajectory for Voyager/New Horizons)
│   │   │   ├── Orbit Path
│   │   │   └── Satellite Model
│   │   └── Moon × 27 (with hover glow)
│   │       ├── Orbit Path
│   │       └── Moon Mesh
│   ├── AsteroidBelt (InstancedMesh + texture; frustumCulled: false)
│   └── KuiperBelt (InstancedMesh + texture; frustumCulled: false)
├── ControlPanel (shows pause state during camera interaction)
├── ObjectList
├── PlanetInfo (z-index: 100)
├── SatelliteInfo (z-index: 100)
└── MoonInfo (z-index: 100)
```

### State Management

- **Local State**: Component-level useState hooks
- **Prop Drilling**: State passed down from App
- **No Redux/Zustand**: Simple app doesn't need global state
- **Ref Pattern**: useRef for Three.js objects
- **Camera Interaction State**: Tracked in App.tsx and passed to ControlPanel

### Animation System

```typescript
// Per-frame animation using useFrame
useFrame((_, delta) => {
  // Update orbit position
  if (!isPaused) {
    const newAngle = angle + orbitalSpeed * speedMultiplier * delta * 0.1;
    setAngle(newAngle);
  }

  // Update object position
  const position = getOrbitalPosition(newAngle);
  object.position.set(position.x, position.y, position.z);

  // Rotate on axis
  object.rotation.y += rotationSpeed;
});

// Hover glow animation (sine wave)
const glowIntensity = baseIntensity + Math.sin(time * pulseSpeed) * 0.3;
```

### Camera Animation (GSAP)

```typescript
// Smooth transition to selected object
gsap.to(camera.position, {
  x: targetPosition.x,
  y: targetPosition.y,
  z: targetPosition.z,
  duration: 1.5,
  ease: 'power2.inOut',
});

gsap.to(controlsRef.current.target, {
  x: targetPosition.x,
  y: targetPosition.y,
  z: targetPosition.z,
  duration: 1.5,
  ease: 'power2.inOut',
});
```

### Camera Interaction Pause

```typescript
// In SolarSystem.tsx
<DreiOrbitControls
  onStart={() => setIsCameraInteracting(true)}
  onEnd={() => setIsCameraInteracting(false)}
/>

// Pass to all moving objects
isPaused={isPaused || isCameraInteracting}

// Notify parent component
useEffect(() => {
  onCameraInteractionChange?.(isCameraInteracting);
}, [isCameraInteracting, onCameraInteractionChange]);
```

## 🎨 Styling System

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0a0a0a',
          800: '#1a1a1a',
          700: '#2a2a2a',
        },
      },
      animation: {
        glow: 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### Custom Classes

```css
/* App.css */
.glow-box {
  box-shadow: 0 0 20px rgba(74, 144, 217, 0.1);
  backdrop-filter: blur(20px);
}

.planet-label {
  text-shadow: 0 0 10px currentColor;
  pointer-events: none;
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}
```

## 📊 Data Structures

### PlanetData Interface

```typescript
interface PlanetData {
  id: string; // Unique identifier
  name: string; // Display name
  radius: number; // Relative size
  distance: number; // Distance from sun
  orbitalSpeed: number; // Orbit speed multiplier
  rotationSpeed: number; // Rotation speed
  color: string; // Base hex color
  emissive?: string; // Glow color
  emissiveIntensity?: number; // Glow strength
  texture?: string; // Texture URL (WebP format)
  description: string;
  facts: string[];
  moons?: number;
  temperature?: string;
  dayLength?: string;
  yearLength?: string;
}
```

### MoonData Interface

```typescript
interface MoonData {
  id: string;
  name: string;
  radius: number;
  parentPlanet: string;
  orbitDistance: number;
  orbitalSpeed: number;
  orbitInclination?: number; // Orbital tilt in degrees
  color: string;
  emissive: string;
  emissiveIntensity?: number;
  description: string;
  facts: string[];
  diameter?: string;
  discoveryYear?: string;
  discoveredBy?: string;
}
```

### SatelliteData Interface

```typescript
interface SatelliteData {
  id: string;
  name: string;
  radius: number;
  parentPlanet: string;  // Planet id, 'sun', or 'moon' (for LRO)
  orbitDistance: number;
  orbitalSpeed: number;
  color: string;
  emissive: string;
  description: string;
  launchDate: string;
  operator: string;
  facts: string[];
  type: 'space-station' | 'telescope' | 'satellite' | 'probe';
  imageUrl?: string;
  missionStatus?: 'active' | 'ended' | 'extended';
  altitude?: string;
  url?: string;
  escapeTrajectory?: boolean;  // If true, no closed orbit; dashed trail (Voyager, New Horizons)
}
```

- **parentPlanet**: Use `'sun'` for L2 telescopes (JWST, Gaia), deep-space probes (Voyager, Parker, Europa Clipper), or `'moon'` for LRO. Use planet id (e.g. `'earth'`, `'mars'`) for orbiters.
- **escapeTrajectory**: When true, the probe is shown with a dashed line (escape path) and no orbital motion.

## 🚀 Performance Optimizations

### Rendering Optimizations

1. **Instanced Rendering**
   - Asteroid / Kuiper belts: instanced meshes with shared textures (Ceres / Pluto); 200 + 400 instances
   - Satellite GLBs: staggered requests; selected satellite loads immediately
   - Kuiper belt: 400+ objects in single draw call
   - Both use `frustumCulled: false` to prevent disappearing when panning

2. **Point Rendering**
   - Starfield: 5000+ stars using point geometry
   - No per-star draw overhead

3. **Efficient Geometry**
   - Low-poly spheres (32 segments)
   - Shared geometries where possible
   - Minimal material variants

4. **Pixel Ratio Capping**

   ```typescript
   gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
   ```

5. **Z-Index Optimization**
   - Info panels use `z-[100]` to stay above 3D labels
   - Prevents UI layering issues

### Animation Optimizations

1. **useFrame Hook**
   - Single animation loop for all objects
   - Delta-time based for frame-rate independence

2. **GSAP for Camera**
   - Hardware-accelerated transitions
   - Efficient tweening

3. **Conditional Updates**

   ```typescript
   if (!isPaused && !isCameraInteracting) {
     // Only update when not paused and not interacting
   }
   ```

4. **Hover Glow Animation**
   - Uses sine wave for smooth pulsing
   - Different pulse speeds for different object types
   - No performance impact

### Memory Management

1. **useMemo for Computed Values**
   - Orbit geometries
   - Filtered object lists
   - Color calculations

2. **Cleanup on Unmount**

   ```typescript
   useEffect(() => {
     // Setup
     return () => {
       // Cleanup
     };
   }, []);
   ```

3. **Ref Pattern**
   ```typescript
   const objectRef = useRef<THREE.Mesh>(null);
   // Prevents recreation on each render
   ```

## 🔧 Configuration

### Environment Variables

No environment variables required. The application runs standalone.

### Build Configuration

```typescript
// vite.config.ts (simplified; see repo for imports)
export default defineConfig({
  base: '/solar-system/',
  plugins: [inspectAttr(), react()], // inspectAttr from kimi-plugin-inspect-react (dev)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Use `import.meta.env.BASE_URL` when building paths to files under `public/` (textures, GLBs, satellite images).

### NPM scripts (assets)

| Script | Purpose |
|--------|---------|
| `download-satellite-images` | Fetch Wikimedia images into `public/satellites/` |
| `optimize-satellite-images` | WebP resize/compress for panel thumbnails (ImageMagick) |
| `compress-satellite-glbs` | `gltf-transform optimize` on `public/3d-objects/satellites/*.glb` |

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  }
}
```

## 🧪 Adding New Features

### Adding a New Planet

1. Add to `src/data/planets.ts`:

```typescript
{
  id: 'new-planet',
  name: 'New Planet',
  radius: 1,
  distance: 100,
  orbitalSpeed: 0.01,
  rotationSpeed: 0.02,
  color: '#FFFFFF',
  emissive: '#CCCCCC',
  texture: '/textures/new-planet.webp',  // Optional
  description: '...',
  facts: ['...'],
  moons: 0,
  temperature: '-200°C',
  dayLength: '24 hours',
  yearLength: '100 Earth years'
}
```

2. Planet automatically renders in `SolarSystem.tsx`

### Adding a New Moon

1. Add to `src/data/moons.ts`:

```typescript
{
  id: 'new-moon',
  name: 'New Moon',
  radius: 0.1,
  parentPlanet: 'earth',
  orbitDistance: 2,
  orbitalSpeed: 2,
  orbitInclination: 5,
  color: '#CCCCCC',
  emissive: '#888888',
  description: '...',
  facts: ['...'],
  diameter: '100 km',
  discoveryYear: '2024',
  discoveredBy: 'Astronomer'
}
```

2. Moon automatically renders in `SolarSystem.tsx`

### Adding a New Satellite

1. Add to `src/data/satellites.ts`:

```typescript
{
  id: 'new-satellite',
  name: 'New Satellite',
  radius: 0.05,
  parentPlanet: 'earth',  // or 'sun', 'moon', 'mars', etc.
  orbitDistance: 2,
  orbitalSpeed: 5,
  color: '#FFFFFF',
  emissive: '#FFFFFF',
  description: '...',
  launchDate: '2024-01-01',
  operator: 'Space Agency',
  facts: ['...'],
  type: 'space-station' | 'telescope' | 'satellite' | 'probe',
  missionStatus: 'active',
  altitude: '400 km',
  escapeTrajectory: false,  // set true for escape-trajectory probes (e.g. Voyager)
  url: 'https://...'
}
```

- Use **parentPlanet: 'sun'** for L2 telescopes (JWST, Gaia) or deep-space probes; **parentPlanet: 'moon'** for lunar orbiters (LRO).
- Set **escapeTrajectory: true** for probes on escape trajectories (Voyager 1/2, New Horizons).

2. Prefer **`modelPath`** + **`modelScale`** in `satellites.ts` pointing to `public/3d-objects/satellites/your.glb` (URLs resolve with Vite `base`). Optionally extend `renderSatelliteModel()` for procedural-only craft. Run `npm run compress-satellite-glbs` after adding GLBs to shrink files.

### Custom 3D Models

Replace geometric primitives with imported models:

```typescript
import { useGLTF } from '@react-three/drei';

function CustomModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}
```

## 🐛 Troubleshooting

### Common Issues

**Issue: Objects not rendering**

- Check browser WebGL support
- Verify Three.js version compatibility
- Check console for errors

**Issue: Performance problems**

- Reduce star count in `Starfield.tsx`
- Lower pixel ratio in `App.tsx`
- Disable antialiasing in Canvas

**Issue: Camera animations not smooth**

- Check GSAP version
- Verify transition duration
- Check for conflicts with OrbitControls

**Issue: TypeScript errors**

- Run `npm install` to ensure dependencies
- Clear `node_modules` and reinstall
- Check tsconfig.json paths

**Issue: Asteroid/Kuiper belt disappears when panning**

- Ensure `frustumCulled={false}` is set on InstancedMesh
- Check if belts are properly positioned in scene

**Issue: Info panels appear behind 3D labels**

- Verify z-index is set to `z-[100]` in info panel components
- Check CSS stacking context

**Issue: Pause button doesn't show camera interaction**

- Verify `onCameraInteractionChange` callback is passed from App to SolarSystem
- Check that `isPaused || isCameraInteracting` is used in ControlPanel

## 📚 References

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)
- [GSAP Documentation](https://greensock.com/docs/)

---

For user-facing documentation, see [README.md](README.md)
