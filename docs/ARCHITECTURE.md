# Architecture Documentation

## Overview

This document describes the architectural decisions, component hierarchy, data flow, and technical implementation details of the 3D Solar System Explorer.

## Architecture Principles

### Component-Based Architecture

- **Separation of Concerns**: 3D rendering components separate from UI controls
- **Reusability**: Generic components (Planet, Satellite, Moon) used for all instances
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures
- **Performance**: Optimized rendering with React Three Fiber and instanced meshes
- **User Experience**: Smooth animations, visual feedback, and intuitive interactions

### State Management

- **Local State**: React hooks (useState, useRef) for component-specific state
- **Prop Drilling**: Simple parent-to-child data flow (no external state management needed)
- **Event-Driven**: Callbacks for user interactions (planet selection, camera control)
- **Camera Interaction State**: Tracked in App.tsx and passed down to ControlPanel for visual feedback

## Component Hierarchy

```
App (Root)
├── Header
│   └── Title, branding
├── Canvas (R3F)
│   └── SolarSystem
│       ├── PerspectiveCamera (Three.js camera)
│       ├── OrbitControls (User camera control with onStart/onEnd callbacks)
│       ├── Lighting
│       │   ├── ambientLight (0.15 intensity)
│       │   └── pointLight (sun position, intensity 200)
│       ├── Starfield (5000 point particles)
│       ├── Sun
│       │   └── Sphere mesh with glow material
│       ├── Planet (x9 instances with textures and hover glow)
│       │   ├── Orbit visualization (Line)
│       │   ├── Planet mesh with emissive glow
│       │   └── Hover glow animation
│       ├── Satellite (x12 instances with hover glow)
│       │   ├── Parent planet tracking
│       │   └── Satellite mesh with glow
│       ├── Moon (x23 instances with hover glow)
│       │   ├── Parent planet tracking
│       │   └── Moon mesh with glow
│       ├── AsteroidBelt (InstancedMesh, frustumCulled: false)
│       └── KuiperBelt (InstancedMesh, frustumCulled: false)
├── Loader (R3F loading screen)
├── ControlPanel
│   ├── Speed slider (0.1x - 10x)
│   ├── Pause/Play toggle (shows active during camera interaction)
│   ├── Orbit visibility toggle
│   ├── Satellite visibility toggle
│   ├── Moon visibility toggle
│   ├── Camera mode selector
│   └── Reset button
├── ObjectList
│   ├── Search functionality
│   └── Filter by type (Planets, Satellites, Moons)
├── PlanetInfo (z-index: 100)
│   └── Sliding panel with planet details
├── SatelliteInfo (z-index: 100)
│   └── Sliding panel with satellite details
└── MoonInfo (z-index: 100)
    └── Sliding panel with moon details
```

## Data Flow

### State Flow (Top to Bottom)

```
App State
  ├── speedMultiplier (number) → SolarSystem → Planet/Satellite/Moon
  ├── isPaused (boolean) → SolarSystem → Planet/Satellite/Moon/Belts
  ├── isCameraInteracting (boolean) → ControlPanel (visual feedback)
  ├── showOrbits (boolean) → SolarSystem → Planet
  ├── showSatellites (boolean) → SolarSystem (conditional rendering)
  ├── showMoons (boolean) → SolarSystem (conditional rendering)
  ├── cameraMode ('free'|'follow') → SolarSystem
  ├── selectedPlanet (PlanetData|null) → PlanetInfo
  ├── selectedSatellite (SatelliteData|null) → SatelliteInfo
  └── selectedMoon (MoonData|null) → MoonInfo
```

### Event Flow (Bottom to Top)

```
User Interactions
  ├── Planet click → handlePlanetClick → onPlanetSelect → setSelectedPlanet
  ├── Satellite click → handleSatelliteClick → onSatelliteSelect → setSelectedSatellite
  ├── Moon click → handleMoonClick → onMoonSelect → setSelectedMoon
  ├── Control panel changes → setState callbacks → App state update
  ├── Camera interaction → onStart/onEnd → setIsCameraInteracting → ControlPanel
  └── Camera reset → resetCamera → GSAP animation + state reset
```

## Core Components

### App.tsx (Root Component)

**Responsibilities:**

- Application state management
- Coordinating interactions between 3D scene and UI
- Managing Canvas lifecycle
- Tracking camera interaction state

**Key State:**

```typescript
const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
const [isPaused, setIsPaused] = useState<boolean>(false);
const [isCameraInteracting, setIsCameraInteracting] = useState<boolean>(false);
const [showOrbits, setShowOrbits] = useState<boolean>(true);
const [showSatellites, setShowSatellites] = useState<boolean>(true);
const [showMoons, setShowMoons] = useState<boolean>(true);
const [cameraMode, setCameraMode] = useState<'free' | 'follow'>('free');
const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
const [selectedMoon, setSelectedMoon] = useState<MoonData | null>(null);
```

**Canvas Configuration:**

- Antialiasing enabled for smooth edges
- High-performance power preference
- Pixel ratio capped at 2x for performance
- Black background (#000000)

### SolarSystem.tsx (3D Scene Manager)

**Responsibilities:**

- Managing 3D scene objects
- Camera animations and transitions
- Planet/satellite/moon interaction handling
- Following selected objects
- Asteroid and Kuiper belt rendering
- Camera interaction pause logic

**Key Features:**

- GSAP-powered camera animations (1.5s duration, power2.inOut easing)
- Dynamic satellite positioning based on parent planet location
- Smooth camera following in 'follow' mode using lerp interpolation
- Transition state management to prevent animation conflicts
- Camera interaction detection via OrbitControls onStart/onEnd
- Automatic pause of all movement during camera interaction

**Animation Logic:**

```typescript
// Camera animation on planet selection
gsap.to(camera.position, {
  x: targetPosition.x,
  y: targetPosition.y,
  z: targetPosition.z,
  duration: 1.5,
  ease: 'power2.inOut',
  onComplete: () => setIsTransitioning(false),
});

// Camera interaction pause
<DreiOrbitControls
  onStart={() => setIsCameraInteracting(true)}
  onEnd={() => setIsCameraInteracting(false)}
/>
```

### Planet.tsx (Planet Rendering)

**Responsibilities:**

- Rendering individual planet meshes with textures
- Orbital motion calculation
- Rotation animation
- Orbit path visualization
- Click interaction handling
- Hover glow animation

**Animation Frame Update:**

```typescript
useFrame((state, delta) => {
  if (!isPaused && planetRef.current && orbitRef.current) {
    // Update orbital position
    angle.current += data.orbitalSpeed * speedMultiplier * delta * 0.1;
    const x = Math.cos(angle.current) * data.distance;
    const z = Math.sin(angle.current) * data.distance;
    orbitRef.current.position.set(x, 0, z);

    // Update rotation
    planetRef.current.rotation.y += data.rotationSpeed * delta;
  }

  // Hover glow animation
  if (isHovered) {
    const time = state.clock.getElapsedTime();
    const pulseSpeed = 3;
    const baseIntensity = data.emissiveIntensity || 0.2;
    const glowIntensity = baseIntensity + Math.sin(time * pulseSpeed) * 0.3;
    materialRef.current.emissiveIntensity = glowIntensity;
  }
});
```

**Orbit Visualization:**

- Uses THREE.EllipseCurve for circular orbits
- Line material with transparency
- Color matches planet's emissive color

**Texture Support:**

- Uses @react-three/drei useTexture hook
- Supports WebP format for better compression
- Falls back to color if texture not available

### Satellite.tsx (Satellite Rendering)

**Responsibilities:**

- Rendering satellite meshes with 3D models
- Orbiting parent planet
- Tracking parent planet position
- Click interaction handling
- Hover glow animation

**Key Logic:**

- Receives parent planet position from SolarSystem
- Calculates local orbit around parent
- Position = parent position + orbital offset
- Independent orbital speed control
- Different 3D models based on satellite type

### Moon.tsx (Natural Moon Rendering)

**Responsibilities:**

- Rendering natural moon meshes
- Orbiting parent planet with inclination
- Tracking parent planet position
- Click interaction handling
- Hover glow animation

**Key Features:**

- Supports orbital inclination
- Different pulse speed for hover glow
- Smaller scale than planets

### Sun.tsx (Central Star)

**Responsibilities:**

- Rendering the Sun with glow effect
- Point light source (intensity 200)
- Click interaction

**Visual Effects:**

- Base sphere (radius 6)
- Emissive material for self-illumination
- Additional point light at center
- Large glowing outer sphere for corona effect

### Starfield.tsx (Background Stars)

**Responsibilities:**

- Rendering background stars
- Creating depth and space atmosphere

**Implementation:**

- Uses THREE.Points for efficient rendering
- 5000 stars randomly distributed in 600-unit radius sphere
- Point material with transparency
- Static positions (no animation)

### ControlPanel.tsx (UI Controls)

**Responsibilities:**

- User controls for simulation
- Real-time parameter adjustment
- Visual feedback for pause state

**Controls:**

1. **Speed Slider**: 0.1x to 10x (0.1 increments)
2. **Pause/Play**: Toggle isPaused state (shows active during camera interaction)
3. **Show Orbits**: Toggle orbit line visibility
4. **Show Satellites**: Toggle satellite rendering
5. **Show Moons**: Toggle moon rendering
6. **Camera Mode**: Free vs Follow mode
7. **Reset**: Return to default view

### PlanetInfo.tsx, SatelliteInfo.tsx, MoonInfo.tsx (Information Panels)

**Responsibilities:**

- Display detailed information
- Slide-in/out animation
- Close functionality
- Stay above 3D labels (z-index: 100)

**Features:**

- Conditional rendering based on selection
- Smooth CSS transitions
- Scroll support for overflow content
- Radix UI Card components for structure
- High z-index to prevent layering issues

## Data Models

### PlanetData Interface

```typescript
interface PlanetData {
  id: string; // Unique identifier
  name: string; // Display name
  radius: number; // Relative size (Earth = 1)
  distance: number; // Distance from sun
  orbitalSpeed: number; // Orbit speed multiplier
  rotationSpeed: number; // Self-rotation speed
  color: string; // Base color (hex)
  emissive?: string; // Glow color (hex)
  emissiveIntensity?: number; // Glow strength
  texture?: string; // Texture URL (WebP)
  description: string; // Brief description
  facts: string[]; // Array of facts
  moons?: number; // Number of moons
  temperature?: string; // Temperature range
  dayLength?: string; // Length of day
  yearLength?: string; // Orbital period
}
```

### SatelliteData Interface

```typescript
interface SatelliteData {
  id: string; // Unique identifier
  name: string; // Display name
  radius: number; // Size
  parentPlanet: string; // Planet id to orbit
  orbitDistance: number; // Distance from parent
  orbitalSpeed: number; // Orbit speed
  color: string; // Base color
  emissive: string; // Glow color
  description: string; // Mission description
  launchDate: string; // Launch date
  operator: string; // Operating agency
  facts: string[]; // Mission facts
  type: 'space-station' | 'telescope' | 'satellite' | 'probe';
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
  orbitInclination?: number; // Orbital tilt
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

## Rendering Pipeline

### Frame Rendering (60 FPS)

```
1. useFrame hook triggers (React Three Fiber)
   ↓
2. Check if paused or camera interacting
   ↓
3. Update planet orbital positions (if not paused)
   - Calculate new angle based on orbitalSpeed * speedMultiplier * delta
   - Apply trigonometry for circular motion
   ↓
4. Update planet rotations
   - Increment rotation.y based on rotationSpeed * delta
   ↓
5. Update satellite positions
   - Track parent planet world position
   - Calculate local orbit
   - Apply to satellite mesh
   ↓
6. Update moon positions
   - Track parent planet world position
   - Calculate local orbit with inclination
   - Apply to moon mesh
   ↓
7. Update asteroid/Kuiper belt rotation (if not paused)
   ↓
8. Update hover glow animations
   - Calculate sine wave based on time
   - Apply to emissive intensity
   ↓
9. Update camera (if in follow mode)
   - Lerp camera target to selected object
   ↓
10. Render frame
    - Three.js renders all meshes
    - Apply lighting and materials
    - Output to WebGL canvas
```

### Camera Animation Flow

```
1. User clicks planet/satellite/moon
   ↓
2. Check if transition in progress (prevent conflicts)
   ↓
3. Set isTransitioning = true
   ↓
4. Calculate target camera position
   - Distance based on object size
   - Offset for viewing angle
   ↓
5. GSAP animation
   - Animate camera.position (1.5s)
   - Animate controls.target (1.5s)
   - Parallel animations for smooth movement
   ↓
6. onComplete callback
   - Set isTransitioning = false
   - Allow new interactions
```

### Camera Interaction Pause Flow

```
1. User starts panning/rotating/zooming
   ↓
2. OrbitControls onStart callback fires
   ↓
3. setIsCameraInteracting(true) in SolarSystem
   ↓
4. useEffect notifies App via onCameraInteractionChange
   ↓
5. App updates isCameraInteracting state
   ↓
6. ControlPanel receives isPaused || isCameraInteracting
   ↓
7. Pause button shows active state
   ↓
8. All moving objects receive isPaused || isCameraInteracting
   ↓
9. Objects stop moving while user interacts
   ↓
10. User stops interacting
    ↓
11. OrbitControls onEnd callback fires
    ↓
12. setIsCameraInteracting(false)
    ↓
13. Objects resume movement (if not manually paused)
```

## Performance Optimizations

### 1. Instanced Rendering

**Asteroid Belt**: Uses THREE.InstancedMesh for 200 asteroids

- Single geometry, single material
- 200 transformation matrices
- One draw call instead of 200
- `frustumCulled: false` to prevent disappearing when panning

**Kuiper Belt**: Uses THREE.InstancedMesh for 400 objects

- Same optimization as asteroid belt
- Different geometry (icosahedron vs dodecahedron)
- Slower rotation speed for realism

### 2. Conditional Rendering

```typescript
{showSatellites && satellites.map((satellite) => (
  // Only render when enabled
))}
```

### 3. Frame Rate Management

- useFrame delta for frame-rate independent animation
- Capped pixel ratio (max 2x) for high-DPI displays
- Stencil buffer disabled (not needed)

### 4. Lazy Computation

- Planet positions calculated only when needed
- Satellite positions depend on parent updates
- Camera follow uses lerp (smooth interpolation, not recalculation)

### 5. Efficient State Updates

- useCallback for event handlers (prevent re-creation)
- Minimal state updates (only what's necessary)
- Ref usage for values that don't need re-renders

### 6. Z-Index Management

- Info panels use `z-[100]` to stay above 3D labels
- Prevents UI layering issues
- Consistent across all info panel components

## Animation System

### GSAP Integration

**Why GSAP?**

- Professional animation library
- Better easing functions than CSS
- Precise control over timing
- Can animate Three.js objects directly

**Usage Patterns:**

```typescript
// Camera position animation
gsap.to(camera.position, {
  x: targetX,
  y: targetY,
  z: targetZ,
  duration: 1.5,
  ease: 'power2.inOut',
  onComplete: callback,
});

// Camera target animation (parallel)
gsap.to(controls.target, {
  x: targetX,
  y: targetY,
  z: targetZ,
  duration: 1.5,
  ease: 'power2.inOut',
});
```

### Hover Glow Animation

**Implementation:**

```typescript
// Sine wave for smooth pulsing
const glowIntensity = baseIntensity + Math.sin(time * pulseSpeed) * 0.3;

// Different pulse speeds for different object types
// Planets: 3
// Moons: 4
// Satellites: 5
```

### Orbital Animation

**Math Behind Orbits:**

```typescript
// Circular orbit calculation
angle += orbitalSpeed * speedMultiplier * delta * 0.1;
x = cos(angle) * distance;
z = sin(angle) * distance;
position.set(x, 0, z); // y = 0 for flat orbits

// With inclination (for moons)
y = sin(angle) * distance * sin(inclination);
```

## Lighting Strategy

### Ambient Light

- Intensity: 0.15 (increased from 0.1 for better visibility)
- Purpose: Base illumination so planets are visible
- Prevents completely black shadowed sides

### Point Light (Sun)

- Position: (0, 0, 0) at sun center
- Intensity: 200 (reduced from 300 for better texture visibility)
- Distance: 300 units
- Decay: 1
- Purpose: Main light source simulating sunlight

### Emissive Materials

- Planets, moons, and satellites have emissive colors
- Self-illumination for visibility
- Glow effect without additional lights
- Animated intensity on hover

## Coordinate System

### Space Units

- 1 unit ≈ arbitrary space distance (not to real scale)
- Sun at origin (0, 0, 0)
- Planets orbit in XZ plane (y = 0)
- Camera positioned at (0, 80, 180) initially (overview)

### Scale Factors

```typescript
export const scaleFactors = {
  distanceScale: 2, // Not used actively
  sizeScale: 0.3, // Not used actively
  orbitScale: 0.8, // Not used actively
};
```

_Note: These are defined but not currently applied. Actual scaling is done directly in planet data._

## Build Configuration

### Vite Configuration (vite.config.ts)

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // @ alias for imports
    },
  },
});
```

### TypeScript Configuration

- **tsconfig.json**: Base configuration
- **tsconfig.app.json**: App-specific settings (strict mode, JSX)
- **tsconfig.node.json**: Node environment (for config files)

### Tailwind Configuration

- Custom colors for space theme
- Animation utilities enabled
- JIT mode for optimal CSS size
- Radix UI color scheme integration

## Browser Considerations

### WebGL Requirements

- WebGL 1.0 minimum (Three.js r148+ requirement)
- Hardware acceleration recommended
- Fallback to software rendering possible (slow)

### Mobile Optimizations

- Touch controls supported via OrbitControls
- Responsive UI (mobile hook available)
- Reduced particle count consideration (not implemented)

### Performance Profiling

```javascript
// Enable Three.js stats
import Stats from 'three/examples/jsm/libs/stats.module.js';
const stats = new Stats();
document.body.appendChild(stats.dom);
```

## Future Architecture Improvements

### Potential Enhancements

1. **Texture System**: ✅ Implemented - Load planet textures dynamically
2. **LOD System**: Level of Detail for distant objects
3. **Worker Threads**: Offload calculations to Web Workers
4. **State Management**: Redux/Zustand for complex state
5. **Route System**: React Router for different views
6. **Physics Engine**: Realistic gravitational interactions
7. **Data Streaming**: Load satellite data on demand
8. **Shader Effects**: Custom GLSL shaders for visual effects

### Scalability Considerations

- Current architecture supports ~20 planets + 50 satellites + 50 moons
- Beyond that, consider object pooling
- Spatial partitioning for click detection
- Frustum culling for off-screen objects (Three.js handles this)

## Testing Strategy (Not Implemented)

### Recommended Tests

1. **Unit Tests**: Component logic, utilities
2. **Integration Tests**: Component interactions
3. **E2E Tests**: User flows (Playwright/Cypress)
4. **Visual Regression**: Screenshot comparisons
5. **Performance Tests**: Frame rate monitoring

### Test Tools

- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests
- @testing-library/react-three-fiber for 3D components

---

## Technical Debt & Known Issues

1. **Scale Factors**: Defined but not used
2. **Texture Support**: ✅ Implemented - WebP textures working
3. **Mobile Performance**: Could be optimized further
4. **Accessibility**: Limited keyboard navigation
5. **Error Boundaries**: No error handling for 3D loading failures
6. **Loading States**: Could show progressive loading

## References

- [Three.js Fundamentals](https://threejs.org/manual/)
- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber/)
- [GSAP Documentation](https://greensock.com/docs/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
