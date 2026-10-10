import type { RootState } from '@react-three/fiber';

/**
 * Dev-only inspection hook: exposes the live renderer counters, scene and camera on
 * `window.__SOLAR_DEBUG__` so browser QA can read `info.memory` / `info.render` from the console.
 *
 * It is a no-op outside `npm run dev` (`import.meta.env.DEV` is statically `false` in production
 * builds, so this code is removed from `dist/`) and never writes to app state.
 */
export function installDebugHook(state: Pick<RootState, 'gl' | 'scene' | 'camera'>): void {
  if (!import.meta.env.DEV) return;
  window.__SOLAR_DEBUG__ = {
    info: state.gl.info,
    gl: state.gl,
    scene: state.scene,
    camera: state.camera,
  };
}
