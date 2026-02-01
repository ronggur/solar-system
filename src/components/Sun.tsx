import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sunData } from '@/data/planets';

interface SunProps {
  onClick?: () => void;
}

export function Sun({ onClick }: SunProps) {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.002;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.001;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group name="planet-sun">
      {/* Main sun sphere */}
      <mesh
        ref={sunRef}
        onClick={onClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
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

      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[sunData.radius * 1.3, 32, 32]} />
        <meshBasicMaterial
          color={sunData.color}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[sunData.radius * 1.8, 32, 32]} />
        <meshBasicMaterial
          color={sunData.emissive}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Light source */}
      <pointLight
        position={[0, 0, 0]}
        intensity={3}
        distance={400}
        decay={1}
        color={sunData.color}
      />
      
      {/* Ambient light from sun */}
      <ambientLight intensity={0.3} color={sunData.color} />
    </group>
  );
}
