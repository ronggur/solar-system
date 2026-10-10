/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}

interface Window {
  resetSolarSystemCamera?: () => void;
  /**
   * Dev-only (`npm run dev`) inspection hook, installed by `src/lib/debugHook.ts` when the
   * canvas is created. Always `undefined` in production builds.
   */
  __SOLAR_DEBUG__?: {
    /** The live `WebGLRenderer.info` (`memory.geometries`, `render.calls`, ...) */
    info: import('three').WebGLRenderer['info'];
    gl: import('three').WebGLRenderer;
    scene: import('three').Scene;
    camera: import('three').Camera;
  };
}
