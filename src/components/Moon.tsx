import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MoonData } from '@/types';
import { Html } from '@react-three/drei';

interface MoonProps {
  data: MoonData;
  speedMultiplier: number;
  isPaused: boolean;
  onClick: (moon: MoonData, position: THREE.Vector3) => void;
}

export function Moon({ data, speedMultiplier, isPaused, onClick }: MoonProps) {
  const { scene } = useThree();
  const moonRef = useRef<THREE.Group>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const [angle, setAngle] = useState(() => Math.random() * Math.PI * 2);
  const [hovered, setHovered] = useState(false);

  // Orbit inclination in radians
  const inclination = (data.orbitInclination || 0) * (Math.PI / 180);

  // Orbit path geometry
  const orbitGeometry = useMemo(() => {
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * data.orbitDistance;
      const z = Math.sin(theta) * data.orbitDistance;
      // Apply inclination
      const y = z * Math.sin(inclination);
      const zInclined = z * Math.cos(inclination);
      points.push(new THREE.Vector3(x, y, zInclined));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [data.orbitDistance, inclination]);

  useFrame((_, delta) => {
    // Get parent planet position from scene
    const planetGroup = scene.getObjectByName(`planet-${data.parentPlanet}`);

    if (planetGroup && moonRef.current && orbitGroupRef.current) {
      const parentPosition = new THREE.Vector3();
      planetGroup.getWorldPosition(parentPosition);

      // Update orbit visualization position
      orbitGroupRef.current.position.copy(parentPosition);

      // Update moon orbital motion
      if (!isPaused) {
        const newAngle = angle + data.orbitalSpeed * speedMultiplier * delta * 0.1;
        setAngle(newAngle);
      }

      const x = Math.cos(angle) * data.orbitDistance;
      const z = Math.sin(angle) * data.orbitDistance;
      // Apply inclination
      const y = z * Math.sin(inclination);
      const zInclined = z * Math.cos(inclination);

      moonRef.current.position.set(
        parentPosition.x + x,
        parentPosition.y + y,
        parentPosition.z + zInclined
      );
    }
  });

  const handleClick = () => {
    if (moonRef.current) {
      const worldPosition = new THREE.Vector3();
      moonRef.current.getWorldPosition(worldPosition);
      onClick(data, worldPosition);
    }
  };

  return (
    <group>
      {/* Orbit path around parent planet */}
      <group ref={orbitGroupRef} position={[0, 0, 0]}>
        <primitive object={new THREE.Line(orbitGeometry, new THREE.LineBasicMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.15,
        }))} />
      </group>

      {/* Moon group */}
      <group
        ref={moonRef}
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Moon sphere */}
        <mesh scale={hovered ? 1.3 : 1}>
          <sphereGeometry args={[data.radius, 24, 24]} />
          <meshStandardMaterial
            color={data.color}
            emissive={data.emissive}
            emissiveIntensity={data.emissiveIntensity || 0.1}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Subtle glow */}
        <mesh scale={1.2}>
          <sphereGeometry args={[data.radius, 16, 16]} />
          <meshBasicMaterial
            color={data.color}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Label */}
        <Html distanceFactor={8}>
          <div
            className={`text-white text-[9px] font-medium whitespace-nowrap transition-all duration-300 ${
              hovered ? 'opacity-100 scale-110' : 'opacity-40 scale-100'
            }`}
            style={{
              textShadow: `0 0 6px ${data.color}`,
              transform: 'translate(-50%, -150%)',
            }}
          >
            {data.name}
          </div>
        </Html>
      </group>
    </group>
  );
}
