import { useRef, useMemo, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { sunData } from '@/data/planets';

interface SunProps {
  onClick?: () => void;
}

// Textured Sun mesh
function TexturedSunMesh({
  sunRef,
  onClick,
}: {
  sunRef: React.RefObject<THREE.Mesh | null>;
  onClick?: () => void;
}) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const texturePath = `${baseUrl}${sunData.texture}`.replace(/\/\//g, '/');

  const rawTexture = useLoader(TextureLoader, texturePath);

  const processedTexture = useMemo(() => {
    const t = rawTexture.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [rawTexture]);

  return (
    <mesh
      ref={sunRef}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <sphereGeometry args={[sunData.radius, 64, 64]} />
      <meshStandardMaterial
        map={processedTexture}
        emissiveMap={processedTexture}
        emissive="#ffffff"
        emissiveIntensity={1.5}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

// Fallback colored Sun mesh (no texture)
function ColoredSunMesh({
  sunRef,
  onClick,
}: {
  sunRef: React.RefObject<THREE.Mesh | null>;
  onClick?: () => void;
}) {
  return (
    <mesh
      ref={sunRef}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <sphereGeometry args={[sunData.radius, 64, 64]} />
      <meshStandardMaterial
        color={sunData.color}
        emissive={sunData.emissive}
        emissiveIntensity={sunData.emissiveIntensity}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

export function Sun({ onClick }: SunProps) {
  const sunRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group name="planet-sun">
      {/* Main sun sphere - textured or colored */}
      {sunData.texture ? (
        <Suspense fallback={<ColoredSunMesh sunRef={sunRef} onClick={onClick} />}>
          <TexturedSunMesh sunRef={sunRef} onClick={onClick} />
        </Suspense>
      ) : (
        <ColoredSunMesh sunRef={sunRef} onClick={onClick} />
      )}

      {/* Key light: neutral white with moderate distance falloff */}
      {/* decay=1 = linear falloff (less extreme than inverse square) */}
      <pointLight position={[0, 0, 0]} intensity={200} distance={0} decay={1} color="#ffffff" />
      {/* Fill: balanced for visibility on all planets */}
      <ambientLight intensity={0.15} color="#ffffff" />
    </group>
  );
}
