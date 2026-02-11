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
}

export interface PlanetData {
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
}

export interface CameraState {
  position: Vector3;
  target: Vector3;
}

export interface OrbitTrail {
  points: Vector3[];
  maxPoints: number;
}
