import { useRef, useMemo, useState, useCallback, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import type { PlanetData } from '@/types';
import { Html } from '@react-three/drei';

interface PlanetProps {
  data: PlanetData;
  speedMultiplier: number;
  isPaused: boolean;
  onClick: (planet: PlanetData, position: THREE.Vector3) => void;
  showOrbits: boolean;
}

// Separate component for Earth with day + night textures
function EarthMesh({
  data,
  planetRef,
  hovered,
  handleClick,
  setHovered,
}: {
  data: PlanetData;
  planetRef: React.RefObject<THREE.Mesh | null>;
  hovered: boolean;
  handleClick: () => void;
  setHovered: (h: boolean) => void;
}) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const dayPath = `${baseUrl}textures/earth_day.webp`.replace(/\/\//g, '/');
  const nightPath = `${baseUrl}textures/earth_night.webp`.replace(/\/\//g, '/');

  const [dayTexture, nightTexture] = useLoader(TextureLoader, [dayPath, nightPath]);

  const processedDay = useMemo(() => {
    const t = dayTexture.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [dayTexture]);

  const processedNight = useMemo(() => {
    const t = nightTexture.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [nightTexture]);

  return (
    <group>
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
      >
        <sphereGeometry args={[data.radius, 64, 64]} />
        <meshStandardMaterial
          map={processedDay}
          emissiveMap={processedNight}
          emissive={new THREE.Color('#ffffff')}
          emissiveIntensity={0.6}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      {/* Animated hover glow effect */}
      <HoverGlowMesh hovered={hovered} radius={data.radius} color={data.color} />
    </group>
  );
}

// Animated glow mesh component
function HoverGlowMesh({
  hovered,
  radius,
  color,
}: {
  hovered: boolean;
  radius: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  useFrame((_, delta) => {
    if (hovered) {
      setPulsePhase((prev) => prev + delta * 3);
      if (meshRef.current) {
        const scale = 1.15 + Math.sin(pulsePhase) * 0.05;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  if (!hovered) return null;

  return (
    <mesh ref={meshRef} scale={1.15}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3 + Math.sin(pulsePhase) * 0.1}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// Generic textured planet mesh (for future planets with textures)
function TexturedPlanetMesh({
  data,
  planetRef,
  hovered,
  handleClick,
  setHovered,
}: {
  data: PlanetData;
  planetRef: React.RefObject<THREE.Mesh | null>;
  hovered: boolean;
  handleClick: () => void;
  setHovered: (h: boolean) => void;
}) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const texturePath = `${baseUrl}${data.texture}`.replace(/\/\//g, '/');

  const dayTexture = useLoader(TextureLoader, texturePath);

  const processedTexture = useMemo(() => {
    const t = dayTexture.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [dayTexture]);

  return (
    <group>
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
      >
        <sphereGeometry args={[data.radius, 64, 64]} />
        <meshStandardMaterial map={processedTexture} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Animated hover glow effect */}
      <HoverGlowMesh hovered={hovered} radius={data.radius} color={data.color} />
    </group>
  );
}

// Saturn rings component with texture
function SaturnRings({ planetRadius }: { planetRadius: number }) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const ringTexturePath = `${baseUrl}textures/saturn_ring_alpha.png`.replace(/\/\//g, '/');

  const ringTexture = useLoader(TextureLoader, ringTexturePath);

  const { geometry, material } = useMemo(() => {
    // Create ring geometry with custom UV mapping
    const innerRadius = planetRadius * 1.2;
    const outerRadius = planetRadius * 2.2;
    const segments = 128;

    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);

    // Fix UV mapping - map the texture radially
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const v3 = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const radius = v3.length();
      const normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);

      // U = radial position (maps across the texture strip from inner to outer)
      // V = 0.5 (center of texture height)
      uv.setXY(i, normalizedRadius, 0.5);
    }
    uv.needsUpdate = true;

    const t = ringTexture.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
      map: t,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    });

    return { geometry, material };
  }, [planetRadius, ringTexture]);

  return (
    <group rotation={[0.466, 0, 0]}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}

// Fallback colored planet mesh
function ColoredPlanetMesh({
  data,
  planetRef,
  hovered,
  handleClick,
  setHovered,
}: {
  data: PlanetData;
  planetRef: React.RefObject<THREE.Mesh | null>;
  hovered: boolean;
  handleClick: () => void;
  setHovered: (h: boolean) => void;
}) {
  return (
    <group>
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
      >
        <sphereGeometry args={[data.radius, 32, 32]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.emissive}
          emissiveIntensity={(data.emissiveIntensity ?? 0.1) * 0.4}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      {/* Animated hover glow effect */}
      <HoverGlowMesh hovered={hovered} radius={data.radius} color={data.color} />
    </group>
  );
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
  const eccentricity = isPluto ? 0.25 : 0;
  const inclination = isPluto ? 17 * (Math.PI / 180) : 0;
  const semiMajorAxis = data.distance;

  // Calculate position on elliptical orbit
  const getOrbitalPosition = useCallback(
    (theta: number) => {
      if (isPluto) {
        const r =
          (semiMajorAxis * (1 - eccentricity * eccentricity)) /
          (1 + eccentricity * Math.cos(theta));
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        const y = z * Math.sin(inclination);
        const zInclined = z * Math.cos(inclination);
        return new THREE.Vector3(x, y, zInclined);
      } else {
        return new THREE.Vector3(
          Math.cos(theta) * data.distance,
          0,
          Math.sin(theta) * data.distance
        );
      }
    },
    [isPluto, semiMajorAxis, eccentricity, inclination, data.distance]
  );

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
      const newAngle = angle + data.orbitalSpeed * speedMultiplier * delta * 0.1;
      setAngle(newAngle);

      const pos = getOrbitalPosition(newAngle);
      orbitRef.current.position.set(pos.x, pos.y, pos.z);

      if (trailRef.current) {
        trailPoints.current.push(pos.clone());
        if (trailPoints.current.length > maxTrailPoints) {
          trailPoints.current.shift();
        }
        trailGeometry.setFromPoints(trailPoints.current);
      }
    }

    if (planetRef.current) {
      planetRef.current.rotation.y += data.rotationSpeed * (isPaused ? 0 : 1);
    }
  });

  const handleClick = () => {
    if (orbitRef.current) {
      const worldPosition = new THREE.Vector3();
      orbitRef.current.getWorldPosition(worldPosition);
      onClick(data, worldPosition);
    }
  };

  // Determine which mesh component to render
  const renderPlanetMesh = () => {
    if (data.id === 'earth') {
      return (
        <Suspense
          fallback={
            <ColoredPlanetMesh
              data={data}
              planetRef={planetRef}
              hovered={hovered}
              handleClick={handleClick}
              setHovered={setHovered}
            />
          }
        >
          <EarthMesh
            data={data}
            planetRef={planetRef}
            hovered={hovered}
            handleClick={handleClick}
            setHovered={setHovered}
          />
        </Suspense>
      );
    }

    if (data.texture) {
      return (
        <Suspense
          fallback={
            <ColoredPlanetMesh
              data={data}
              planetRef={planetRef}
              hovered={hovered}
              handleClick={handleClick}
              setHovered={setHovered}
            />
          }
        >
          <TexturedPlanetMesh
            data={data}
            planetRef={planetRef}
            hovered={hovered}
            handleClick={handleClick}
            setHovered={setHovered}
          />
        </Suspense>
      );
    }

    return (
      <ColoredPlanetMesh
        data={data}
        planetRef={planetRef}
        hovered={hovered}
        handleClick={handleClick}
        setHovered={setHovered}
      />
    );
  };

  return (
    <group>
      {/* Orbit path */}
      {showOrbits && (
        <primitive
          object={
            new THREE.Line(
              orbitGeometry,
              new THREE.LineBasicMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.15,
              })
            )
          }
        />
      )}

      {/* Trail */}
      {showOrbits && (
        <primitive
          object={
            new THREE.Line(
              trailGeometry,
              new THREE.LineBasicMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.4,
              })
            )
          }
        />
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
        {/* Planet sphere - textured or colored */}
        {renderPlanetMesh()}

        {/* Earth's atmosphere glow */}
        {data.id === 'earth' && (
          <mesh scale={1.05}>
            <sphereGeometry args={[data.radius, 64, 64]} />
            <meshStandardMaterial
              color="#4A90E2"
              transparent={true}
              opacity={0.15}
              side={THREE.BackSide}
            />
          </mesh>
        )}

        {/* Saturn's rings with texture */}
        {data.id === 'saturn' && <SaturnRings planetRadius={data.radius} />}

        {/* Uranus rings (opaque) */}
        {data.id === 'uranus' && (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[data.radius * 1.8, data.radius * 2.0, 64]} />
              <meshStandardMaterial
                color="#5DADE2"
                side={THREE.DoubleSide}
                roughness={0.8}
                metalness={0.1}
              />
            </mesh>
          </group>
        )}

        {/* Label */}
        <Html>
          <div
            className={`planet-label text-white text-xs font-medium whitespace-nowrap transition-all duration-300 ${
              hovered ? 'opacity-100' : 'opacity-60'
            }`}
            style={{
              textShadow: `0 0 10px ${data.color}, 0 0 20px ${data.color}`,
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
