import { createContext, useContext, useLayoutEffect, type RefObject } from 'react';
import type * as THREE from 'three';

/**
 * Name-keyed lookup of the scene's orbiting groups (`planet-<id>`, `planet-sun`, `moon-<id>`,
 * `satellite-<id>`). Filled on mount and cleared on unmount, so per-frame code can find a parent
 * with a `Map.get` instead of a `scene.getObjectByName` depth-first search.
 */
export type SceneRegistry = Map<string, THREE.Object3D>;

const SceneRegistryContext = createContext<SceneRegistry | null>(null);

/** Provided once by `SolarSystem`; the map identity is stable for the life of the scene. */
export const SceneRegistryProvider = SceneRegistryContext.Provider;

export function createSceneRegistry(): SceneRegistry {
  return new Map();
}

export function useSceneRegistry(): SceneRegistry {
  const registry = useContext(SceneRegistryContext);
  if (!registry) {
    throw new Error('useSceneRegistry must be used inside <SolarSystem>');
  }
  return registry;
}

/**
 * Registers the object behind `ref` under `name` while the calling component is mounted.
 * Uses a layout effect so the entry exists before the first animation frame, as the scene
 * lookup did. The cleanup removes only an entry that still points at this object, which keeps
 * a StrictMode double mount (or a remount under the same name) correct.
 */
export function useRegisterObject(name: string, ref: RefObject<THREE.Object3D | null>): void {
  const registry = useSceneRegistry();
  useLayoutEffect(() => {
    const object = ref.current;
    if (!object) return;
    registry.set(name, object);
    return () => {
      if (registry.get(name) === object) registry.delete(name);
    };
  }, [registry, name, ref]);
}
