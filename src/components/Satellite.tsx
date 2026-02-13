import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SatelliteData } from '@/types';
import { Html } from '@react-three/drei';
import { satelliteTypeColors } from '@/data/satellites';

// Animated glow mesh component for satellites
function HoverGlowMesh({
  hovered,
  color,
  baseScale,
}: {
  hovered: boolean;
  color: string;
  baseScale: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  useFrame((_, delta) => {
    if (hovered) {
      setPulsePhase((prev) => prev + delta * 4);
      if (meshRef.current) {
        const scale = baseScale + Math.sin(pulsePhase) * 0.3;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  if (!hovered) return null;

  return (
    <mesh ref={meshRef} scale={baseScale}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.4 + Math.sin(pulsePhase) * 0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

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
  const isEscape = data.escapeTrajectory === true;

  // Stable escape angle derived from id (pure, no Math.random in render)
  const escapeAngle = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < data.id.length; i++) {
      hash = (hash << 5) - hash + data.id.charCodeAt(i);
    }
    return (Math.abs(hash) % 360) * (Math.PI / 180);
  }, [data.id]);

  // Orbit path: closed circle, or escape trail (dashed line from parent to probe)
  const orbitLine = useMemo(() => {
    if (isEscape) {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          Math.cos(escapeAngle) * data.orbitDistance,
          0,
          Math.sin(escapeAngle) * data.orbitDistance
        ),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: typeColors.color,
        transparent: true,
        opacity: 0.35,
        dashSize: 3,
        gapSize: 2,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      return line;
    }
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
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: typeColors.color,
      transparent: true,
      opacity: 0.2,
    });
    return new THREE.Line(geometry, material);
  }, [data.orbitDistance, isEscape, typeColors.color, escapeAngle]);

  useFrame((_, delta) => {
    const planetGroup = scene.getObjectByName(
      data.parentPlanet === 'moon' ? 'moon-moon' : `planet-${data.parentPlanet}`
    );

    if (planetGroup && satelliteRef.current && orbitGroupRef.current) {
      const parentPosition = new THREE.Vector3();
      planetGroup.getWorldPosition(parentPosition);

      orbitGroupRef.current.position.copy(parentPosition);

      if (isEscape) {
        const x = Math.cos(escapeAngle) * data.orbitDistance;
        const z = Math.sin(escapeAngle) * data.orbitDistance;
        satelliteRef.current.position.set(
          parentPosition.x + x,
          parentPosition.y,
          parentPosition.z + z
        );
      } else {
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
      }
    } else {
      if (satelliteRef.current) {
        const a = isEscape ? escapeAngle : angle;
        const x = Math.cos(a) * data.orbitDistance;
        const z = Math.sin(a) * data.orbitDistance;
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

  const mat = (color: string, emissive?: string, metal = 0.6, rough = 0.35) => (
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? color}
      emissiveIntensity={0.25}
      metalness={metal}
      roughness={rough}
    />
  );
  const panelMat = () => mat('#1a237e', '#0d1642', 0.5, 0.3);

  // Shape models closer to real spacecraft (simplified silhouettes)
  const renderSatelliteModel = () => {
    const { id, type, color } = data;

    // ---- Space stations ----
    if (id === 'iss') {
      return (
        <group>
          {/* Central truss */}
          <mesh>
            <boxGeometry args={[0.22, 0.04, 0.04]} />
            {mat('#8B8B8B', '#555')}
          </mesh>
          {/* Node modules */}
          <mesh position={[-0.06, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.06, 12]} />
            {mat(color)}
          </mesh>
          <mesh position={[0.06, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.05, 12]} />
            {mat(color)}
          </mesh>
          {/* Solar panel wings (port/starboard) */}
          <mesh position={[0.12, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.18, 0.015, 0.06]} />
            {panelMat()}
          </mesh>
          <mesh position={[0.12, -0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.18, 0.015, 0.06]} />
            {panelMat()}
          </mesh>
          <mesh position={[-0.12, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.18, 0.015, 0.06]} />
            {panelMat()}
          </mesh>
          <mesh position={[-0.12, -0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.18, 0.015, 0.06]} />
            {panelMat()}
          </mesh>
        </group>
      );
    }
    if (id === 'tianhe') {
      return (
        <group>
          {/* Core module (cylinder) */}
          <mesh>
            <cylinderGeometry args={[0.05, 0.055, 0.14, 12]} />
            {mat(color)}
          </mesh>
          {/* Lab modules (smaller cylinders) */}
          <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
            {mat(color)}
          </mesh>
          <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
            {mat(color)}
          </mesh>
          {/* Solar panels */}
          <mesh position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.2, 0.012, 0.06]} />
            {panelMat()}
          </mesh>
          <mesh position={[0, -0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.2, 0.012, 0.06]} />
            {panelMat()}
          </mesh>
        </group>
      );
    }

    // ---- Telescopes ----
    if (id === 'hubble') {
      return (
        <group>
          {/* Main tube (aperture forward) */}
          <mesh>
            <cylinderGeometry args={[0.055, 0.065, 0.14, 16]} />
            {mat('#C0C0C0', '#888')}
          </mesh>
          {/* Solar panel wings */}
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.14, 0.012, 0.05]} />
            {panelMat()}
          </mesh>
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.14, 0.012, 0.05]} />
            {panelMat()}
          </mesh>
        </group>
      );
    }
    if (id === 'jwst') {
      return (
        <group>
          {/* Hexagonal primary mirror (simplified as flat hex) */}
          <mesh rotation={[0, 0, Math.PI / 6]}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, 6]} />
            {mat('#B8B8B8', '#888', 0.85, 0.2)}
          </mesh>
          {/* Sunshield (kite / multi-layer look: one main panel) */}
          <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
            <boxGeometry args={[0.22, 0.28, 0.01]} />
            <meshStandardMaterial
              color="#FFE4B5"
              emissive="#FFD700"
              emissiveIntensity={0.2}
              side={THREE.DoubleSide}
              metalness={0.3}
              roughness={0.6}
            />
          </mesh>
        </group>
      );
    }
    if (id === 'gaia') {
      return (
        <group>
          {/* Disc / sunshield */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.015, 8]} />
            {mat(color)}
          </mesh>
          {/* Central payload */}
          <mesh>
            <cylinderGeometry args={[0.03, 0.035, 0.08, 8]} />
            {mat(color)}
          </mesh>
        </group>
      );
    }

    // ---- Probes ----
    if (id === 'voyager1' || id === 'voyager2') {
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.06, 0.05, 0.08]} />
            {mat(color)}
          </mesh>
          <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.01, 24]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      );
    }
    if (id === 'cassini') {
      return (
        <group>
          {/* Huygens (small box) */}
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[0.04, 0.04, 0.03]} />
            {mat('#8B4513', '#5D2E0C')}
          </mesh>
          {/* Main bus */}
          <mesh>
            <cylinderGeometry args={[0.04, 0.045, 0.08, 12]} />
            {mat(color)}
          </mesh>
          {/* High-gain antenna */}
          <mesh position={[0, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.012, 24]} />
            <meshStandardMaterial color="#DAA520" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      );
    }
    if (id === 'juno') {
      return (
        <group>
          {/* Central hex body */}
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 6]} />
            {mat(color)}
          </mesh>
          {/* Three solar panel arms at 120° */}
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0]}
              rotation={[0, 0, -angle]}
            >
              <boxGeometry args={[0.22, 0.02, 0.04]} />
              {panelMat()}
            </mesh>
          ))}
        </group>
      );
    }
    if (id === 'mars-reconnaissance') {
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.06, 0.04, 0.08]} />
            {mat(color)}
          </mesh>
          <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.12, 0.01, 0.05]} />
            {panelMat()}
          </mesh>
          <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.12, 0.01, 0.05]} />
            {panelMat()}
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.01, 16]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      );
    }

    // ---- Satellites (navigation / comms) ----
    if (id === 'gps') {
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.05, 0.05, 0.06]} />
            {mat(color)}
          </mesh>
          <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.1, 0.008, 0.05]} />
            {panelMat()}
          </mesh>
          <mesh position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.1, 0.008, 0.05]} />
            {panelMat()}
          </mesh>
        </group>
      );
    }
    if (id === 'starlink') {
      return (
        <group>
          {/* Flat body (flat-sat style) */}
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.08, 0.08, 0.02]} />
            {mat(color)}
          </mesh>
          {/* Single solar array */}
          <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.12, 0.01, 0.06]} />
            {panelMat()}
          </mesh>
        </group>
      );
    }

    // ---- Type fallbacks ----
    switch (type) {
      case 'space-station':
        return (
          <group>
            <mesh>
              <boxGeometry args={[0.12, 0.06, 0.06]} />
              {mat(color)}
            </mesh>
            <mesh position={[0, 0, 0.08]}>
              <boxGeometry args={[0.2, 0.02, 0.06]} />
              {panelMat()}
            </mesh>
            <mesh position={[0, 0, -0.08]}>
              <boxGeometry args={[0.2, 0.02, 0.06]} />
              {panelMat()}
            </mesh>
          </group>
        );
      case 'telescope':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[0.05, 0.06, 0.12, 16]} />
              {mat(color)}
            </mesh>
            <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.1, 0.01, 0.05]} />
              {panelMat()}
            </mesh>
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.1, 0.01, 0.05]} />
              {panelMat()}
            </mesh>
          </group>
        );
      case 'probe':
        return (
          <group>
            <mesh>
              <octahedronGeometry args={[0.05, 0]} />
              {mat(color)}
            </mesh>
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.01, 20]} />
              <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        );
      default:
        return (
          <group>
            <mesh>
              <boxGeometry args={[0.06, 0.05, 0.05]} />
              {mat(color)}
            </mesh>
            <mesh position={[0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.1, 0.01, 0.05]} />
              {panelMat()}
            </mesh>
            <mesh position={[-0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.1, 0.01, 0.05]} />
              {panelMat()}
            </mesh>
          </group>
        );
    }
  };

  return (
    <group>
      {/* Orbit path (closed circle) or escape trajectory (dashed line) */}
      <group ref={orbitGroupRef} position={[0, 0, 0]}>
        <primitive object={orbitLine} />
      </group>

      {/* Satellite group */}
      <group
        ref={satelliteRef}
        name={`satellite-${data.id}`}
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
        {renderSatelliteModel()}

        {/* Base glow effect */}
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

        {/* Animated hover glow effect */}
        <HoverGlowMesh hovered={hovered} color={typeColors.glow} baseScale={3} />

        {/* Label - zIndexRange keeps labels behind info panel (z-100) so they get backdrop-blur */}
        <Html zIndexRange={[90, 0]}>
          <div
            className={`text-white text-[10px] font-medium whitespace-nowrap transition-all duration-300 ${
              hovered ? 'opacity-100' : 'opacity-50'
            }`}
            style={{
              textShadow: `0 0 8px ${typeColors.color}`,
              transform: 'translate(-50%, -150%)',
              pointerEvents: 'none',
            }}
          >
            {data.name}
          </div>
        </Html>
      </group>
    </group>
  );
}
