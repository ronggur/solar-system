import { Vector3 } from 'three';

export interface SunData {
  id: string;
  name: string;
  radius: number;
  distance: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  texture?: string;
  description: string;
  facts: string[];
  temperature?: string;
  /** Age in billions of years */
  age?: string;
  /** Physical diameter (e.g. "1.39 million km") */
  diameter?: string;
  /** Mass (e.g. "1.989 × 10³⁰ kg") */
  mass?: string;
  /** Link to NASA science page */
  url?: string;
}

export interface PlanetData {
  id: string;
  name: string;
  /** 'dwarf-planet' for Ceres, Pluto, etc. Omit for regular planets */
  type?: 'planet' | 'dwarf-planet';
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
  /** Mass in Earth masses */
  mass?: number;
  /** Surface gravity (e.g. "0.38g") */
  gravity?: string;
  /** Physical diameter (e.g. "12,742 km") */
  diameter?: string;
  /** Atmosphere composition */
  atmosphere?: string;
  /** Single striking stat for comparisons */
  interestingNumber?: string;
  /** Link to NASA science page */
  url?: string;
}

export interface MoonData {
  id: string;
  name: string;
  radius: number;
  parentPlanet: string;
  orbitDistance: number;
  orbitalSpeed: number;
  orbitInclination?: number;
  color: string;
  emissive: string;
  emissiveIntensity?: number;
  texture?: string;
  description: string;
  facts: string[];
  diameter?: string;
  discoveryYear?: string;
  discoveredBy?: string;
  /** Orbital period (e.g. "27.3 days") */
  orbitalPeriod?: string;
  /** Surface category */
  surfaceType?: 'icy' | 'volcanic' | 'rocky' | 'mixed';
  /** Past or planned mission highlights */
  missionHighlights?: string;
  /** Link to NASA science page */
  url?: string;
}

export interface SatelliteData {
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
  /** URL to a real photo or illustration of the satellite (e.g. NASA, ESA, Wikimedia Commons) */
  imageUrl?: string;
  /** Current mission status */
  missionStatus?: 'active' | 'ended' | 'extended';
  /** Orbital altitude (e.g. "400 km") */
  altitude?: string;
  /** Link to official mission page */
  url?: string;
}

export interface CameraState {
  position: Vector3;
  target: Vector3;
}

export interface OrbitTrail {
  points: Vector3[];
  maxPoints: number;
}
