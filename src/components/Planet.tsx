import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetData } from '@/types';
import { Html } from '@react-three/drei';

interface PlanetProps {
  data: PlanetData;
  speedMultiplier: number;
  isPaused: boolean;
  onClick: (planet: PlanetData, position: THREE.Vector3) => void;
  showOrbits: boolean;
}

export function Planet({ data, speedMultiplier, isPaused, onClick, showOrbits }: PlanetProps) {
  const planetRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Line>(null);
  const [hovered, setHovered] = useState(false);
  const [angle, setAngle] = useState(() => Math.random() * Math.PI * 2);

  const trailPoints = useRef<THREE.Vector3[]>([]);
  const maxTrailPoints = 100;

  // Pluto's special orbital parameters
  const isPluto = data.id === 'pluto';
  const eccentricity = isPluto ? 0.25 : 0; // Pluto has high eccentricity
  const inclination = isPluto ? 17 * (Math.PI / 180) : 0; // 17 degrees inclination
  const semiMajorAxis = data.distance;

  // Calculate position on elliptical orbit
  const getOrbitalPosition = useCallback((theta: number) => {
    if (isPluto) {
      // Elliptical orbit calculation
      const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) /
                (1 + eccentricity * Math.cos(theta));
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      // Apply inclination
      const y = z * Math.sin(inclination);
      const zInclined = z * Math.cos(inclination);
      return new THREE.Vector3(x, y, zInclined);
    } else {
      // Circular orbit
      return new THREE.Vector3(
        Math.cos(theta) * data.distance,
        0,
        Math.sin(theta) * data.distance
      );
    }
  }, [isPluto, semiMajorAxis, eccentricity, inclination, data.distance]);

  // Orbit path geometry
  const orbitGeometry = useMemo(() => {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(getOrbitalPosition(theta));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [getOrbitalPosition]);

  // Trail geometry
  const trailGeometry = useMemo(() => {
    return new THREE.BufferGeometry();
  }, []);

  useFrame((_, delta) => {
    if (!isPaused && orbitRef.current) {
      // Update orbital angle
      const newAngle = angle + data.orbitalSpeed * speedMultiplier * delta * 0.1;
      setAngle(newAngle);
      
      // Update position using orbital calculation
      const pos = getOrbitalPosition(newAngle);
      orbitRef.current.position.set(pos.x, pos.y, pos.z);

      // Update trail
      if (trailRef.current) {
        trailPoints.current.push(pos.clone());
        if (trailPoints.current.length > maxTrailPoints) {
          trailPoints.current.shift();
        }
        trailGeometry.setFromPoints(trailPoints.current);
      }
    }

    // Rotate planet on its axis
    if (planetRef.current) {
      planetRef.current.rotation.y += data.rotationSpeed * (isPaused ? 0 : 1);
    }
  });

  // Calculate current position for click handler
  const handleClick = () => {
    if (orbitRef.current) {
      const worldPosition = new THREE.Vector3();
      orbitRef.current.getWorldPosition(worldPosition);
      onClick(data, worldPosition);
    }
  };

  return (
    <group>
      {/* Orbit path */}
      {showOrbits && (
        <primitive object={new THREE.Line(orbitGeometry, new THREE.LineBasicMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.15,
        }))} />
      )}

      {/* Trail */}
      {showOrbits && (
        <primitive object={new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.4,
        }))} />
      )}

      {/* Planet group */}
      <group
        ref={orbitRef}
        name={`planet-${data.id}`}
        position={(() => {
          const pos = getOrbitalPosition(angle);
          return [pos.x, pos.y, pos.z];
        })()}
      >
        {/* Planet sphere */}
        <mesh
          ref={planetRef}
          onClick={handleClick}
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
          scale={hovered ? 1.2 : 1}
        >
          <sphereGeometry args={[data.radius, 32, 32]} />
          <meshStandardMaterial
            color={data.color}
            emissive={data.emissive}
            emissiveIntensity={data.emissiveIntensity}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>

        {/* Saturn's rings */}
        {data.id === 'saturn' && (
          <group rotation={[Math.PI / 3, 0, 0]}>
            <mesh>
              <ringGeometry args={[data.radius * 1.4, data.radius * 2.2, 64]} />
              <meshBasicMaterial
                color="#C4A35A"
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[data.radius * 1.3, data.radius * 1.4, 64]} />
              <meshBasicMaterial
                color="#8B7355"
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[data.radius * 2.2, data.radius * 2.4, 64]} />
              <meshBasicMaterial
                color="#A08050"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )}

        {/* Uranus rings (faint) */}
        {data.id === 'uranus' && (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[data.radius * 1.8, data.radius * 2.0, 64]} />
              <meshBasicMaterial
                color="#5DADE2"
                transparent
                opacity={0.2}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )}

        {/* Atmosphere glow */}
        <mesh scale={1.1}>
          <sphereGeometry args={[data.radius, 32, 32]} />
          <meshBasicMaterial
            color={data.color}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Label */}
        <Html distanceFactor={10}>
          <div
            className={`planet-label text-white text-xs font-medium whitespace-nowrap transition-all duration-300 ${
              hovered ? 'opacity-100 scale-110' : 'opacity-60 scale-100'
            }`}
            style={{
              textShadow: `0 0 10px ${data.color}, 0 0 20px ${data.color}`,
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
