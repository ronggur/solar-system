# API & Component Reference

## Table of Contents
1. [Data Interfaces](#data-interfaces)
2. [Component APIs](#component-apis)
3. [Utility Functions](#utility-functions)
4. [Constants & Configuration](#constants--configuration)

---

## Data Interfaces

### PlanetData

Represents a planet in the solar system.

```typescript
interface PlanetData {
  id: string;
  name: string;
  radius: number;
  distance: number;
  orbitalSpeed: number;
  rotationSpeed: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  texture?: string;
  description: string;
  facts: string[];
  moons?: number;
  temperature?: string;
  dayLength?: string;
  yearLength?: string;
}
```

#### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the planet (e.g., "earth", "mars") |
| `name` | `string` | Yes | Display name (e.g., "Earth", "Mars") |
| `radius` | `number` | Yes | Relative size (Earth = 1.0) |
| `distance` | `number` | Yes | Distance from the sun in arbitrary units |
| `orbitalSpeed` | `number` | Yes | Speed multiplier for orbit animation (Earth = 1.0) |
| `rotationSpeed` | `number` | Yes | Self-rotation speed. Negative for retrograde rotation |
| `color` | `string` | Yes | Base color as hex string (e.g., "#4A90D9") |
| `emissive` | `string` | No | Glow color as hex string |
| `emissiveIntensity` | `number` | No | Glow strength (0.0 to 1.0+) |
| `texture` | `string` | No | URL to texture image (not currently implemented) |
| `description` | `string` | Yes | Brief description of the planet |
| `facts` | `string[]` | Yes | Array of interesting facts |
| `moons` | `number` | No | Number of natural satellites |
| `temperature` | `string` | No | Temperature range (e.g., "-88°C to 58°C") |
| `dayLength` | `string` | No | Length of one day (e.g., "24 hours") |
| `yearLength` | `string` | No | Orbital period (e.g., "365.25 days") |

#### Example

```typescript
const earth: PlanetData = {
  id: 'earth',
  name: 'Earth',
  radius: 1,
  distance: 25,
  orbitalSpeed: 1,
  rotationSpeed: 0.02,
  color: '#4A90D9',
  emissive: '#1a4d80',
  emissiveIntensity: 0.2,
  description: 'Our home planet, the only known planet to support life.',
  facts: [
    'Earth is 71% water and 29% land',
    'The atmosphere is 78% nitrogen and 21% oxygen',
  ],
  moons: 1,
  temperature: '-88°C to 58°C',
  dayLength: '24 hours',
  yearLength: '365.25 days'
};
```

---

### SatelliteData

Represents a satellite, space station, telescope, or probe.

```typescript
interface SatelliteData {
  id: string;
  name: string;
  radius: number;
  parentPlanet: string;
  orbitDistance: number;
  orbitalSpeed: number;
  color: string;
  emissive: string;
  description: string;
  launchDate: string;
  operator: string;
  facts: string[];
  type: 'space-station' | 'telescope' | 'satellite' | 'probe';
}
```

#### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier (e.g., "iss", "hubble") |
| `name` | `string` | Yes | Display name (e.g., "ISS", "Hubble Space Telescope") |
| `radius` | `number` | Yes | Size of the satellite |
| `parentPlanet` | `string` | Yes | ID of the planet to orbit |
| `orbitDistance` | `number` | Yes | Distance from parent planet |
| `orbitalSpeed` | `number` | Yes | Orbit speed multiplier |
| `color` | `string` | Yes | Base color as hex string |
| `emissive` | `string` | Yes | Glow color as hex string |
| `description` | `string` | Yes | Mission description |
| `launchDate` | `string` | Yes | Launch date (formatted string) |
| `operator` | `string` | Yes | Operating agency/company |
| `facts` | `string[]` | Yes | Array of mission facts |
| `type` | `SatelliteType` | Yes | Type of satellite |

#### SatelliteType

```typescript
type SatelliteType = 'space-station' | 'telescope' | 'satellite' | 'probe';
```

- **space-station**: Crewed orbital facility (ISS, Tiangong)
- **telescope**: Space-based observatory (Hubble, JWST)
- **satellite**: Communication/navigation satellite (GPS, Starlink)
- **probe**: Deep space or planetary probe (Voyager, Cassini)

#### Example

```typescript
const iss: SatelliteData = {
  id: 'iss',
  name: 'ISS',
  radius: 0.08,
  parentPlanet: 'earth',
  orbitDistance: 1.8,
  orbitalSpeed: 15,
  color: '#E0E0E0',
  emissive: '#FFFFFF',
  description: 'The International Space Station is the largest modular space station in low Earth orbit.',
  launchDate: 'November 20, 1998',
  operator: 'NASA / Roscosmos / ESA / JAXA / CSA',
  facts: [
    'Orbits Earth every 90 minutes at 28,000 km/h',
    'Has been continuously occupied since November 2000',
  ],
  type: 'space-station'
};
```

---

### CameraState

Represents camera position and target.

```typescript
interface CameraState {
  position: Vector3;
  target: Vector3;
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `position` | `THREE.Vector3` | Camera position in 3D space |
| `target` | `THREE.Vector3` | Point the camera is looking at |

---

### OrbitTrail

Represents orbit trail visualization data (not currently used).

```typescript
interface OrbitTrail {
  points: Vector3[];
  maxPoints: number;
}
```

---

## Component APIs

### App

Root application component.

#### Props

None. App manages its own state.

#### State

```typescript
const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
const [isPaused, setIsPaused] = useState<boolean>(false);
const [showOrbits, setShowOrbits] = useState<boolean>(true);
const [showSatellites, setShowSatellites] = useState<boolean>(true);
const [cameraMode, setCameraMode] = useState<'free' | 'follow'>('free');
const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
```

---

### SolarSystem

Main 3D scene component managing planets, satellites, and camera.

#### Props

```typescript
interface SolarSystemProps {
  speedMultiplier: number;
  isPaused: boolean;
  showOrbits: boolean;
  selectedPlanet: PlanetData | null;
  onPlanetSelect: (planet: PlanetData | null) => void;
  selectedSatellite: SatelliteData | null;
  onSatelliteSelect: (satellite: SatelliteData | null) => void;
  cameraMode: 'free' | 'follow';
  showSatellites: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `speedMultiplier` | `number` | Animation speed multiplier (0.1 to 10) |
| `isPaused` | `boolean` | Whether animation is paused |
| `showOrbits` | `boolean` | Whether to show orbit paths |
| `selectedPlanet` | `PlanetData \| null` | Currently selected planet |
| `onPlanetSelect` | `(planet: PlanetData \| null) => void` | Callback when planet is selected |
| `selectedSatellite` | `SatelliteData \| null` | Currently selected satellite |
| `onSatelliteSelect` | `(satellite: SatelliteData \| null) => void` | Callback when satellite is selected |
| `cameraMode` | `'free' \| 'follow'` | Camera behavior mode |
| `showSatellites` | `boolean` | Whether to render satellites |

#### Methods

Exposed via `window` object:

```typescript
window.resetSolarSystemCamera: () => void;
```

Resets camera to default overview position.

---

### Planet

Renders a single planet with orbit and rotation.

#### Props

```typescript
interface PlanetProps {
  data: PlanetData;
  speedMultiplier: number;
  isPaused: boolean;
  onClick: (planet: PlanetData, position: Vector3) => void;
  showOrbits: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `data` | `PlanetData` | Planet data object |
| `speedMultiplier` | `number` | Global speed multiplier |
| `isPaused` | `boolean` | Whether animation is paused |
| `onClick` | `(planet: PlanetData, position: Vector3) => void` | Callback when planet is clicked |
| `showOrbits` | `boolean` | Whether to show orbit line |

#### Animation

Orbital position updates every frame:
```typescript
angle += orbitalSpeed * speedMultiplier * delta * 0.1;
x = cos(angle) * distance;
z = sin(angle) * distance;
```

---

### Satellite

Renders a satellite orbiting a planet.

#### Props

```typescript
interface SatelliteProps {
  data: SatelliteData;
  parentPosition: Vector3;
  speedMultiplier: number;
  isPaused: boolean;
  onClick: (satellite: SatelliteData, position: Vector3) => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `data` | `SatelliteData` | Satellite data object |
| `parentPosition` | `THREE.Vector3` | World position of parent planet |
| `speedMultiplier` | `number` | Global speed multiplier |
| `isPaused` | `boolean` | Whether animation is paused |
| `onClick` | `(satellite: SatelliteData, position: Vector3) => void` | Callback when satellite is clicked |

---

### Sun

Renders the Sun with glow effect.

#### Props

```typescript
interface SunProps {
  onClick: () => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `onClick` | `() => void` | Callback when Sun is clicked |

---

### Starfield

Renders background stars using point geometry.

#### Props

```typescript
interface StarfieldProps {
  count: number;
  radius: number;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `count` | `number` | Number of stars to render |
| `radius` | `number` | Radius of star distribution sphere |

#### Example Usage

```typescript
<Starfield count={5000} radius={600} />
```

---

### ControlPanel

UI controls for simulation parameters.

#### Props

```typescript
interface ControlPanelProps {
  speedMultiplier: number;
  setSpeedMultiplier: (value: number) => void;
  isPaused: boolean;
  setIsPaused: (value: boolean) => void;
  showOrbits: boolean;
  setShowOrbits: (value: boolean) => void;
  showSatellites: boolean;
  setShowSatellites: (value: boolean) => void;
  cameraMode: 'free' | 'follow';
  setCameraMode: (mode: 'free' | 'follow') => void;
  onReset: () => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `speedMultiplier` | `number` | Current speed value |
| `setSpeedMultiplier` | `(value: number) => void` | Update speed |
| `isPaused` | `boolean` | Current pause state |
| `setIsPaused` | `(value: boolean) => void` | Update pause state |
| `showOrbits` | `boolean` | Current orbit visibility |
| `setShowOrbits` | `(value: boolean) => void` | Update orbit visibility |
| `showSatellites` | `boolean` | Current satellite visibility |
| `setShowSatellites` | `(value: boolean) => void` | Update satellite visibility |
| `cameraMode` | `'free' \| 'follow'` | Current camera mode |
| `setCameraMode` | `(mode: 'free' \| 'follow') => void` | Update camera mode |
| `onReset` | `() => void` | Reset camera callback |

---

### PlanetInfo

Information panel for selected planet.

#### Props

```typescript
interface PlanetInfoProps {
  planet: PlanetData | null;
  onClose: () => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `planet` | `PlanetData \| null` | Planet to display, or null to hide |
| `onClose` | `() => void` | Callback when close button is clicked |

---

### SatelliteInfo

Information panel for selected satellite.

#### Props

```typescript
interface SatelliteInfoProps {
  satellite: SatelliteData | null;
  onClose: () => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `satellite` | `SatelliteData \| null` | Satellite to display, or null to hide |
| `onClose` | `() => void` | Callback when close button is clicked |

---

### Header

Application header with title.

#### Props

None. Static component.

---

## Utility Functions

### cn (Class Name Utility)

Combines class names with clsx and tailwind-merge.

```typescript
function cn(...inputs: ClassValue[]): string
```

#### Usage

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "base-class",
  condition && "conditional-class",
  { "dynamic-class": isActive }
)} />
```

---

## Constants & Configuration

### planets

Array of all planet data.

```typescript
export const planets: PlanetData[];
```

Location: `src/data/planets.ts`

Contains 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.

---

### sunData

Sun data object (similar to PlanetData but for the Sun).

```typescript
export const sunData = {
  name: 'Sun',
  radius: 6,
  color: '#FDB813',
  emissive: '#FF6B00',
  emissiveIntensity: 2,
  description: string;
  facts: string[];
  temperature: string;
  type: string;
};
```

Location: `src/data/planets.ts`

---

### satellites

Array of all satellite data.

```typescript
export const satellites: SatelliteData[];
```

Location: `src/data/satellites.ts`

Contains 12 satellites including ISS, Hubble, JWST, GPS, Starlink, Voyager 1 & 2, and various probes.

---

### satelliteTypeColors

Color scheme for satellite types.

```typescript
export const satelliteTypeColors: Record<string, {
  color: string;
  glow: string
}> = {
  'space-station': { color: '#FF6B6B', glow: '#FF4757' },
  'telescope': { color: '#FFD93D', glow: '#FFA502' },
  'satellite': { color: '#4ECDC4', glow: '#00D2D3' },
  'probe': { color: '#A8A8A8', glow: '#747D8C' }
};
```

Location: `src/data/satellites.ts`

---

### scaleFactors

Scaling configuration (not actively used).

```typescript
export const scaleFactors = {
  distanceScale: 2,
  sizeScale: 0.3,
  orbitScale: 0.8
};
```

Location: `src/data/planets.ts`

---

## Camera Configuration

### Default Camera Position

```typescript
position: [0, 80, 180]
fov: 60
near: 0.1
far: 1000
```

### OrbitControls Settings

```typescript
enablePan: true
enableZoom: true
enableRotate: true
zoomSpeed: 0.8
rotateSpeed: 0.6
panSpeed: 0.8
minDistance: 1
maxDistance: 400
maxPolarAngle: Math.PI / 1.5
```

---

## Animation Configuration

### GSAP Animation Defaults

```typescript
duration: 1.5  // seconds
ease: 'power2.inOut'
```

### Frame Update Multipliers

```typescript
orbitalSpeedMultiplier: 0.1  // Applied in useFrame
rotationSpeedMultiplier: 1.0  // Applied in useFrame
```

---

## Lighting Configuration

### Ambient Light

```typescript
intensity: 0.1
```

### Point Light (Sun)

```typescript
position: [0, 0, 0]
intensity: 2
distance: 300
decay: 1
```

---

## Performance Constants

### Asteroid Belt

```typescript
count: 200
innerRadius: 42
outerRadius: 48
```

### Starfield

```typescript
count: 5000
radius: 600
```

---

## Type Guards

### isPlanet

```typescript
function isPlanet(obj: any): obj is PlanetData {
  return obj && typeof obj.id === 'string' &&
         typeof obj.orbitalSpeed === 'number';
}
```

### isSatellite

```typescript
function isSatellite(obj: any): obj is SatelliteData {
  return obj && typeof obj.id === 'string' &&
         typeof obj.parentPlanet === 'string';
}
```

---

## Events

### Window Events

#### resetSolarSystemCamera

```typescript
window.resetSolarSystemCamera(): void
```

Exposed by SolarSystem component. Resets camera to overview position.

**Usage:**
```typescript
if (window.resetSolarSystemCamera) {
  window.resetSolarSystemCamera();
}
```

---

## CSS Classes

### Common Tailwind Classes Used

- `bg-black/50` - Semi-transparent black background
- `backdrop-blur-md` - Glass-morphism blur effect
- `border-white/10` - Subtle border
- `rounded-xl` - Rounded corners
- `z-40` - High z-index for panels

---

## Error Handling

Currently, the application does not implement comprehensive error handling. Consider adding:

1. **Error Boundaries**: Catch React rendering errors
2. **WebGL Fallback**: Detect WebGL support
3. **Loading Error Handling**: Handle failed resource loads
4. **Type Guards**: Validate data at runtime

---

## Best Practices

### Adding New Planets

1. Add data to `src/data/planets.ts`
2. Ensure unique `id`
3. Set appropriate `radius` and `distance` to avoid collisions
4. Test orbit path visibility
5. Add comprehensive `facts` array

### Adding New Satellites

1. Add data to `src/data/satellites.ts`
2. Reference valid `parentPlanet` id
3. Set `orbitDistance` to avoid collision with planet
4. Choose appropriate `type`
5. Include mission details in `facts`

### Performance Optimization

1. Use `useMemo` for expensive calculations
2. Use `useCallback` for event handlers
3. Minimize state updates
4. Use refs for values that don't need re-renders
5. Consider `React.lazy` for code splitting

---

## Future API Additions

Potential future APIs to consider:

1. **Texture Loading**: `loadTexture(url: string): Promise<Texture>`
2. **Collision Detection**: `detectCollision(obj1, obj2): boolean`
3. **Orbit Calculation**: `calculateOrbitPoint(distance, speed, time): Vector3`
4. **Camera Presets**: `setCameraPreset(preset: CameraPreset): void`
5. **Time Control**: `setSimulationTime(time: Date): void`

---

## Version History

- **v0.0.0** (Current): Initial implementation with 8 planets and 12 satellites

---

## Support

For issues, questions, or contributions, please refer to the main README.md file.
