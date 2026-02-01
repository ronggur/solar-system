import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SatelliteData } from '@/types';
import { Html } from '@react-three/drei';
import { satelliteTypeColors } from '@/data/satellites';

interface SatelliteProps {
  data: SatelliteData;
  speedMultiplier: number;
  isPaused: boolean;
  onClick: (satellite: SatelliteData, position: THREE.Vector3) => void;
}

export function Satellite({ data, speedMultiplier, isPaused, onClick }: SatelliteProps) {
  const { scene } = useThree();
  const satelliteRef = useRef<THREE.Group>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const [angle, setAngle] = useState(() => Math.random() * Math.PI * 2);
  const [hovered, setHovered] = useState(false);

  const typeColors = satelliteTypeColors[data.type];

  // Orbit path geometry
  const orbitGeometry = useMemo(() => {
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(theta) * data.orbitDistance,
          0,
          Math.sin(theta) * data.orbitDistance
        )
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [data.orbitDistance]);

  useFrame((_, delta) => {
    // Get parent planet position from scene
    const planetGroup = scene.getObjectByName(`planet-${data.parentPlanet}`);

    if (planetGroup && satelliteRef.current && orbitGroupRef.current) {
      const parentPosition = new THREE.Vector3();
      planetGroup.getWorldPosition(parentPosition);

      // Update orbit visualization position
      orbitGroupRef.current.position.copy(parentPosition);

      // Update satellite orbital motion
      if (!isPaused) {
        const newAngle = angle + data.orbitalSpeed * speedMultiplier * delta * 0.1;
        setAngle(newAngle);
      }

      const x = Math.cos(angle) * data.orbitDistance;
      const z = Math.sin(angle) * data.orbitDistance;

      satelliteRef.current.position.set(
        parentPosition.x + x,
        parentPosition.y,
        parentPosition.z + z
      );
    } else {
      // Fallback: if planet not found yet, position at origin
      if (satelliteRef.current) {
        const x = Math.cos(angle) * data.orbitDistance;
        const z = Math.sin(angle) * data.orbitDistance;
        satelliteRef.current.position.set(x, 0, z);
      }
    }
  });

  const handleClick = () => {
    if (satelliteRef.current) {
      const worldPosition = new THREE.Vector3();
      satelliteRef.current.getWorldPosition(worldPosition);
      onClick(data, worldPosition);
    }
  };

  // Different satellite models based on type
  const renderSatelliteModel = () => {
    switch (data.type) {
      case 'space-station':
        return (
          <>
            {/* Main body */}
            <mesh>
              <boxGeometry args={[0.15, 0.08, 0.08]} />
              <meshStandardMaterial
                color={data.color}
                emissive={data.emissive}
                emissiveIntensity={0.5}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            {/* Solar panels */}
            <mesh position={[0, 0, 0.12]}>
              <boxGeometry args={[0.25, 0.02, 0.08]} />
              <meshStandardMaterial
                color="#1a237e"
                emissive="#0d1642"
                emissiveIntensity={0.3}
                metalness={0.5}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0, -0.12]}>
              <boxGeometry args={[0.25, 0.02, 0.08]} />
              <meshStandardMaterial
                color="#1a237e"
                emissive="#0d1642"
                emissiveIntensity={0.3}
                metalness={0.5}
                roughness={0.3}
              />
            </mesh>
          </>
        );
      case 'telescope':
        return (
          <>
            {/* Main mirror housing */}
            <mesh>
              <cylinderGeometry args={[0.06, 0.08, 0.15, 16]} />
              <meshStandardMaterial
                color={data.color}
                emissive={data.emissive}
                emissiveIntensity={0.4}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            {/* Sunshield (for JWST style) */}
            {data.id === 'jwst' && (
              <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI / 6]}>
                <boxGeometry args={[0.3, 0.02, 0.2]} />
                <meshStandardMaterial
                  color="#FFD700"
                  emissive="#FFA500"
                  emissiveIntensity={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </>
        );
      case 'probe':
        return (
          <>
            {/* Main body */}
            <mesh>
              <octahedronGeometry args={[0.06, 0]} />
              <meshStandardMaterial
                color={data.color}
                emissive={data.emissive}
                emissiveIntensity={0.4}
                metalness={0.6}
                roughness={0.4}
              />
            </mesh>
            {/* Antenna dish */}
            <mesh position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.04, 0.06, 16]} />
              <meshStandardMaterial
                color="#C0C0C0"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          </>
        );
      default: // satellite
        return (
          <>
            {/* Main body */}
            <mesh>
              <boxGeometry args={[0.08, 0.06, 0.06]} />
              <meshStandardMaterial
                color={data.color}
                emissive={data.emissive}
                emissiveIntensity={0.5}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            {/* Solar panels */}
            <mesh position={[0.1, 0, 0]}>
              <boxGeometry args={[0.12, 0.01, 0.06]} />
              <meshStandardMaterial
                color="#1a237e"
                emissive="#0d1642"
                emissiveIntensity={0.3}
                metalness={0.5}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[-0.1, 0, 0]}>
              <boxGeometry args={[0.12, 0.01, 0.06]} />
              <meshStandardMaterial
                color="#1a237e"
                emissive="#0d1642"
                emissiveIntensity={0.3}
                metalness={0.5}
                roughness={0.3}
              />
            </mesh>
          </>
        );
    }
  };

  return (
    <group>
      {/* Orbit path around parent planet */}
      <group ref={orbitGroupRef} position={[0, 0, 0]}>
        <primitive object={new THREE.Line(orbitGeometry, new THREE.LineBasicMaterial({
          color: typeColors.color,
          transparent: true,
          opacity: 0.2,
        }))} />
      </group>

      {/* Satellite group */}
      <group
        ref={satelliteRef}
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
        scale={hovered ? 1.5 : 1}
      >
        {renderSatelliteModel()}

        {/* Glow effect */}
        <mesh scale={2}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color={typeColors.glow}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Label */}
        <Html distanceFactor={5}>
          <div
            className={`text-white text-[10px] font-medium whitespace-nowrap transition-all duration-300 ${
              hovered ? 'opacity-100 scale-110' : 'opacity-50 scale-100'
            }`}
            style={{
              textShadow: `0 0 8px ${typeColors.color}`,
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
