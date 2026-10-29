import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Renders a `THREE.Line` built from memoized geometry and material (owned by the caller, which
 * disposes them). The Line object is created once per mount of this component, not per render.
 *
 * Why not `<primitive object={memoizedLine} />` directly: R3F applies every JSX prop to the
 * primitive's object, including the dev-only `code-path` prop from the inspect plugin. Applying it a
 * second time to the same object throws, which happens when a memoized line is re-attached after
 * being removed (for example the Orbits toggle). A fresh Line per mount avoids that.
 */
export function MemoLine({
  geometry,
  material,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);
  return <primitive object={line} />;
}
