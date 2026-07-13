import { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SatelliteData } from '@/types';
import { Html, useGLTF } from '@react-three/drei';
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
        opacity={0.1 + Math.sin(pulsePhase) * 0.05}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// GLB Model loader component (path must be absolute URL, e.g. with Vite base)
function GLBModel({ path, scale = 1 }: { path: string; scale?: number }) {
  const { scene } = useGLTF(path);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={clonedScene} scale={scale} />;
}

function GlbLoadPlaceholder({ color }: { color: string }) {
  return (
    <mesh>
      <sphereGeometry args={[0.09, 14, 14]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        metalness={0.35}
        roughness={0.45}
      />
    </mesh>
  );
}

function resolvePublicAssetUrl(relativePath: string) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  return `${baseUrl}${relativePath}`.replace(/\/\//g, '/');
}

interface SatelliteProps {
  data: SatelliteData;
  speedMultiplier: number;
  isPaused: boolean;
  onClick: (satellite: SatelliteData, position: THREE.Vector3) => void;
  /** Order for staggering GLB downloads (lower = sooner). */
  glbStaggerIndex?: number;
  /** When true, start loading this satellite's GLB immediately (e.g. list selection). */
  glbLoadNow?: boolean;
}

export function Satellite({
  data,
  speedMultiplier,
  isPaused,
  onClick,
  glbStaggerIndex = 0,
  glbLoadNow = false,
}: SatelliteProps) {
  const { scene } = useThree();
  const satelliteRef = useRef<THREE.Group>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const [angle, setAngle] = useState(() => Math.random() * Math.PI * 2);
  const [hovered, setHovered] = useState(false);

  const typeColors = satelliteTypeColors[data.type];
  const isEscape = data.escapeTrajectory === true;

  const [allowGlbLoad, setAllowGlbLoad] = useState(glbLoadNow);

  useEffect(() => {
    if (glbLoadNow) {
      setAllowGlbLoad(true);
      return;
    }
    // Defer background GLB downloads until the browser is idle so they never
    // compete with first paint / initial texture loads, then stagger them.
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const schedule = () => {
      timeoutId = window.setTimeout(() => setAllowGlbLoad(true), glbStaggerIndex * 250);
    };
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(schedule, { timeout: 5000 });
    } else {
      // Safari has no requestIdleCallback; wait past first paint instead.
      timeoutId = window.setTimeout(schedule, 3000);
    }
    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [glbLoadNow, glbStaggerIndex]);

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
    const { id, type, color, modelPath, modelScale } = data;

    // ---- GLB models with modelScale from data (deferred + staggered network) ----
    if (modelPath && modelScale) {
      const glbUrl = resolvePublicAssetUrl(modelPath);
      if (!allowGlbLoad) {
        return <GlbLoadPlaceholder color={color} />;
      }
      return (
        <Suspense fallback={<GlbLoadPlaceholder color={color} />}>
          <GLBModel path={glbUrl} scale={modelScale} />
        </Suspense>
      );
    }

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
      // T-shaped Tiangong: Tianhe core (down the stem), Wentian/Mengtian labs
      // across the bar, giant twin solar wings at each lab tip.
      const hull = () => mat('#EDEAE3', '#6b6b66', 0.4, 0.45);
      const wing = () => mat('#2c3570', '#141c4a', 0.5, 0.35);
      return (
        <group>
          {/* Multi-docking node at the T junction */}
          <mesh>
            <sphereGeometry args={[0.034, 14, 14]} />
            {hull()}
          </mesh>
          {/* Forward docking port */}
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.016, 0.02, 0.035, 10]} />
            {mat('#B0ADA5', '#555', 0.6, 0.4)}
          </mesh>
          {/* Tianhe core: narrow forward section */}
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.026, 0.028, 0.1, 14]} />
            {hull()}
          </mesh>
          {/* Tianhe core: wider aft section */}
          <mesh position={[0, -0.165, 0]}>
            <cylinderGeometry args={[0.028, 0.037, 0.075, 14]} />
            {hull()}
          </mesh>
          {/* Core solar panels (small, near aft) */}
          <mesh position={[0.08, -0.165, 0]}>
            <boxGeometry args={[0.08, 0.008, 0.035]} />
            {wing()}
          </mesh>
          <mesh position={[-0.08, -0.165, 0]}>
            <boxGeometry args={[0.08, 0.008, 0.035]} />
            {wing()}
          </mesh>
          {/* Wentian + Mengtian lab modules (the T bar) */}
          <mesh position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.026, 0.026, 0.125, 14]} />
            {hull()}
          </mesh>
          <mesh position={[-0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.026, 0.026, 0.125, 14]} />
            {hull()}
          </mesh>
          {/* Solar wing hubs at the lab tips */}
          <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.025, 10]} />
            {mat('#B0ADA5', '#555', 0.6, 0.4)}
          </mesh>
          <mesh position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.025, 10]} />
            {mat('#B0ADA5', '#555', 0.6, 0.4)}
          </mesh>
          {/* Giant twin solar wings (Tiangong's signature feature) */}
          {[0.16, -0.16].map((x) =>
            [0.095, -0.095].map((z) => (
              <mesh key={`${x}:${z}`} position={[x, 0, z]}>
                <boxGeometry args={[0.05, 0.008, 0.135]} />
                {wing()}
              </mesh>
            ))
          )}
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
      // Wide flat deployable sunshield "hat" with the conical payload atop.
      return (
        <group>
          {/* Sunshield disc (solar cells on the sun-facing side) */}
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 0.006, 24]} />
            {panelMat()}
          </mesh>
          {/* Shield rim */}
          <mesh>
            <cylinderGeometry args={[0.091, 0.091, 0.004, 24]} />
            {mat('#C0BDB4', '#666', 0.7, 0.3)}
          </mesh>
          {/* Payload module: truncated cone atop the shield */}
          <mesh position={[0, 0.038, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.065, 14]} />
            {mat('#D8D4CB', '#666', 0.5, 0.4)}
          </mesh>
          {/* Thermal tent cap */}
          <mesh position={[0, 0.075, 0]}>
            <cylinderGeometry args={[0.012, 0.03, 0.012, 14]} />
            {mat('#B8B4AB', '#555', 0.5, 0.4)}
          </mesh>
          {/* Phased-array antenna skirt below the shield */}
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.032, 0.022, 0.032, 12]} />
            {mat('#9A968E', '#555', 0.6, 0.35)}
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

    if (id === 'soho') {
      // Boxy bus with twin solar wings and instrument snouts facing the Sun.
      return (
        <group>
          {/* Main bus */}
          <mesh>
            <boxGeometry args={[0.06, 0.08, 0.05]} />
            {mat('#C9C4B8', '#666', 0.5, 0.4)}
          </mesh>
          {/* Instrument snouts (coronagraphs/imagers) on the sun face */}
          <mesh position={[0.015, 0.05, 0.01]}>
            <cylinderGeometry args={[0.009, 0.009, 0.022, 8]} />
            {mat('#8F8B83', '#555', 0.7, 0.3)}
          </mesh>
          <mesh position={[-0.015, 0.048, -0.008]}>
            <cylinderGeometry args={[0.007, 0.007, 0.018, 8]} />
            {mat('#8F8B83', '#555', 0.7, 0.3)}
          </mesh>
          {/* Solar wings on short booms */}
          <mesh position={[0.09, 0, 0]}>
            <boxGeometry args={[0.095, 0.007, 0.055]} />
            {panelMat()}
          </mesh>
          <mesh position={[-0.09, 0, 0]}>
            <boxGeometry args={[0.095, 0.007, 0.055]} />
            {panelMat()}
          </mesh>
          {/* High-gain antenna below */}
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.02, 0.008, 0.014, 12]} />
            {mat('#DAD7D0', '#666', 0.8, 0.2)}
          </mesh>
        </group>
      );
    }
    if (id === 'bepicolombo') {
      // Cruise stack: transfer module with very long thin wings,
      // MPO with its single wing, MMO sunshield cone on top.
      return (
        <group>
          {/* Mercury Transfer Module (bottom) */}
          <mesh position={[0, -0.045, 0]}>
            <boxGeometry args={[0.055, 0.05, 0.055]} />
            {mat('#BFBAB0', '#666', 0.5, 0.4)}
          </mesh>
          {/* MTM's extremely long, narrow solar wings */}
          <mesh position={[0.145, -0.045, 0]}>
            <boxGeometry args={[0.21, 0.006, 0.034]} />
            {panelMat()}
          </mesh>
          <mesh position={[-0.145, -0.045, 0]}>
            <boxGeometry args={[0.21, 0.006, 0.034]} />
            {panelMat()}
          </mesh>
          {/* Mercury Planetary Orbiter (middle) */}
          <mesh position={[0, 0.008, 0]}>
            <boxGeometry args={[0.05, 0.042, 0.05]} />
            {mat('#D9D5CC', '#666', 0.5, 0.4)}
          </mesh>
          {/* MPO's single solar wing */}
          <mesh position={[0, 0.008, 0.095]}>
            <boxGeometry args={[0.032, 0.006, 0.12]} />
            {panelMat()}
          </mesh>
          {/* MMO sunshield cone (top) */}
          <mesh position={[0, 0.052, 0]}>
            <cylinderGeometry args={[0.036, 0.027, 0.035, 14]} />
            {mat('#EDEAE3', '#777', 0.4, 0.5)}
          </mesh>
        </group>
      );
    }
    if (id === 'europa-clipper') {
      // Tall body with the largest solar wings of any planetary probe:
      // long multi-segment arrays with cross panels at the tips.
      return (
        <group>
          {/* Propulsion cylinder + avionics vault */}
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.09, 12]} />
            {mat('#CFCBC2', '#666', 0.5, 0.4)}
          </mesh>
          <mesh position={[0, -0.015, 0]}>
            <boxGeometry args={[0.052, 0.05, 0.052]} />
            {mat('#AFAAA0', '#555', 0.5, 0.4)}
          </mesh>
          {/* High-gain antenna dish on top */}
          <mesh position={[0, 0.062, 0]}>
            <cylinderGeometry args={[0.04, 0.014, 0.02, 16]} />
            {mat('#DAD7D0', '#666', 0.8, 0.2)}
          </mesh>
          {/* Giant segmented solar wings with cross tips */}
          {[1, -1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.095, 0, 0]}>
                <boxGeometry args={[0.1, 0.007, 0.075]} />
                {panelMat()}
              </mesh>
              <mesh position={[s * 0.2, 0, 0]}>
                <boxGeometry args={[0.09, 0.007, 0.075]} />
                {panelMat()}
              </mesh>
              <mesh position={[s * 0.258, 0, 0]}>
                <boxGeometry args={[0.022, 0.007, 0.115]} />
                {panelMat()}
              </mesh>
            </group>
          ))}
          {/* Magnetometer boom */}
          <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.12, 6]} />
            {mat('#8F8B83', '#555', 0.6, 0.4)}
          </mesh>
        </group>
      );
    }
    if (id === 'lucy') {
      // Unmistakable: two giant circular solar arrays flanking a small body.
      return (
        <group>
          {/* Body */}
          <mesh>
            <cylinderGeometry args={[0.026, 0.032, 0.055, 12]} />
            {mat('#B8B4AB', '#666', 0.5, 0.4)}
          </mesh>
          {/* High-gain antenna dish */}
          <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.012, 0.014, 16]} />
            {mat('#DAD7D0', '#666', 0.8, 0.2)}
          </mesh>
          {/* Twin round solar arrays */}
          {[1, -1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.1, 0, -0.005]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.068, 0.068, 0.006, 24]} />
                {panelMat()}
              </mesh>
              {/* Array hub */}
              <mesh position={[s * 0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.012, 10]} />
                {mat('#8F8B83', '#555', 0.6, 0.4)}
              </mesh>
            </group>
          ))}
        </group>
      );
    }
    if (id === 'new-horizons') {
      // Compact gold-foiled body dominated by its big dish; RTG on a side
      // strut, no solar panels this far out.
      return (
        <group>
          {/* Body (grand-piano silhouette, simplified hex) */}
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 0.035, 6]} />
            {mat('#C7A55A', '#6b5420', 0.55, 0.4)}
          </mesh>
          {/* High-gain antenna dish */}
          <mesh position={[0, 0.032, 0]}>
            <cylinderGeometry args={[0.055, 0.016, 0.026, 20]} />
            {mat('#E5E2DB', '#777', 0.75, 0.25)}
          </mesh>
          {/* Dish feed */}
          <mesh position={[0, 0.055, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.025, 6]} />
            {mat('#8F8B83', '#555', 0.6, 0.4)}
          </mesh>
          {/* RTG on side strut */}
          <mesh position={[0.075, -0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
            {mat('#3a3a3a', '#1a1a1a', 0.6, 0.5)}
          </mesh>
        </group>
      );
    }
    if (id === 'psyche') {
      // Tall chassis with two cross-shaped (plus-sign) solar arrays.
      return (
        <group>
          {/* Chassis */}
          <mesh>
            <boxGeometry args={[0.05, 0.085, 0.05]} />
            {mat('#CFCBC4', '#666', 0.5, 0.4)}
          </mesh>
          {/* High-gain antenna dish */}
          <mesh position={[0, 0.02, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.01, 0.014, 16]} />
            {mat('#DAD7D0', '#666', 0.8, 0.2)}
          </mesh>
          {/* Cross-shaped solar wings */}
          {[1, -1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.115, 0, 0]}>
                <boxGeometry args={[0.13, 0.007, 0.048]} />
                {panelMat()}
              </mesh>
              <mesh position={[s * 0.115, 0, 0]}>
                <boxGeometry args={[0.048, 0.007, 0.13]} />
                {panelMat()}
              </mesh>
            </group>
          ))}
        </group>
      );
    }

    // ---- Satellites (navigation / comms) ----
    if (id === 'gps') {
      // GPS III: boxy bus, nadir antenna farm, two segmented solar wings.
      return (
        <group>
          {/* Bus */}
          <mesh>
            <boxGeometry args={[0.055, 0.06, 0.055]} />
            {mat('#9A948A', '#555', 0.5, 0.4)}
          </mesh>
          {/* Nadir-pointing antenna array */}
          <mesh position={[0, -0.042, 0]}>
            <cylinderGeometry args={[0.012, 0.03, 0.028, 10]} />
            {mat('#6F6B63', '#3a3a3a', 0.6, 0.4)}
          </mesh>
          <mesh position={[0.018, -0.038, 0.018]}>
            <cylinderGeometry args={[0.006, 0.006, 0.02, 6]} />
            {mat('#6F6B63', '#3a3a3a', 0.6, 0.4)}
          </mesh>
          {/* Segmented solar wings with booms */}
          {[1, -1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.004, 0.004, 0.025, 6]} />
                {mat('#8F8B83', '#555', 0.6, 0.4)}
              </mesh>
              <mesh position={[s * 0.09, 0, 0]}>
                <boxGeometry args={[0.07, 0.007, 0.052]} />
                {panelMat()}
              </mesh>
              <mesh position={[s * 0.165, 0, 0]}>
                <boxGeometry args={[0.07, 0.007, 0.052]} />
                {panelMat()}
              </mesh>
            </group>
          ))}
        </group>
      );
    }
    if (id === 'starlink') {
      // Flat-sat chassis with phased-array face and one big solar sail
      // hinged upward.
      return (
        <group>
          {/* Flat chassis */}
          <mesh>
            <boxGeometry args={[0.095, 0.008, 0.05]} />
            {mat('#4a4d52', '#26282c', 0.6, 0.4)}
          </mesh>
          {/* Phased-array antennas on the earth-facing side */}
          {[-0.028, 0, 0.028].map((x) => (
            <mesh key={x} position={[x, -0.007, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.005, 12]} />
              {mat('#8F8B83', '#555', 0.7, 0.3)}
            </mesh>
          ))}
          {/* Single solar sail hinged up from one edge */}
          <group position={[0, 0.006, -0.024]} rotation={[-0.5, 0, 0]}>
            <mesh position={[0, 0.07, 0]}>
              <boxGeometry args={[0.08, 0.135, 0.005]} />
              {panelMat()}
            </mesh>
            {/* Hinge boom */}
            <mesh position={[0, 0.004, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.003, 0.003, 0.075, 6]} />
              {mat('#8F8B83', '#555', 0.6, 0.4)}
            </mesh>
          </group>
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
            opacity={0.05}
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
