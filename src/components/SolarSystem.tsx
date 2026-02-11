import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls as DreiOrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { Starfield } from './Starfield';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { Satellite } from './Satellite';
import { Moon } from './Moon';
import { planets, sunData } from '@/data/planets';
import { satellites } from '@/data/satellites';
import { moons } from '@/data/moons';
import type { PlanetData, SatelliteData, MoonData } from '@/types';
import type { OrbitControls } from 'three-stdlib';

interface SolarSystemProps {
  speedMultiplier: number;
  isPaused: boolean;
  showOrbits: boolean;
  selectedPlanet: PlanetData | null;
  onPlanetSelect: (planet: PlanetData | null) => void;
  selectedSatellite: SatelliteData | null;
  onSatelliteSelect: (satellite: SatelliteData | null) => void;
  selectedMoon: MoonData | null;
  onMoonSelect: (moon: MoonData | null) => void;
  cameraMode: 'free' | 'follow';
  showSatellites: boolean;
  showMoons: boolean;
  onCameraInteractionChange?: (interacting: boolean) => void;
}

export function SolarSystem({
  speedMultiplier,
  isPaused,
  showOrbits,
  selectedPlanet,
  onPlanetSelect,
  selectedSatellite,
  onSatelliteSelect,
  selectedMoon,
  onMoonSelect,
  cameraMode,
  showSatellites,
  showMoons,
  onCameraInteractionChange,
}: SolarSystemProps) {
  const { camera, scene } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<OrbitControls>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCameraInteracting, setIsCameraInteracting] = useState(false);

  // Notify parent of camera interaction changes
  useEffect(() => {
    onCameraInteractionChange?.(isCameraInteracting);
  }, [isCameraInteracting, onCameraInteractionChange]);

  // Initial camera position
  useEffect(() => {
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        x: 0,
        y: 80,
        z: 180,
        duration: 2,
        ease: 'power2.out',
      });
    }
  }, []);

  // Handle planet selection with camera animation
  const handlePlanetClick = useCallback(
    (planet: PlanetData, position: THREE.Vector3) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      onPlanetSelect(planet);
      onSatelliteSelect(null);
      onMoonSelect(null);

      const distance = planet.id === 'sun' ? 30 : planet.radius * 8;
      const targetPosition = new THREE.Vector3(
        position.x + distance,
        position.y + distance * 0.5,
        position.z + distance
      );

      gsap.to(camera.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => setIsTransitioning(false),
      });

      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: position.x,
          y: position.y,
          z: position.z,
          duration: 1.5,
          ease: 'power2.inOut',
        });
      }
    },
    [camera, isTransitioning, onPlanetSelect, onSatelliteSelect, onMoonSelect]
  );

  // Handle satellite selection
  const handleSatelliteClick = useCallback(
    (satellite: SatelliteData, position: THREE.Vector3) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      onSatelliteSelect(satellite);
      onPlanetSelect(null);
      onMoonSelect(null);

      const distance = satellite.radius * 25;
      const targetPosition = new THREE.Vector3(
        position.x + distance,
        position.y + distance * 0.5,
        position.z + distance
      );

      gsap.to(camera.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => setIsTransitioning(false),
      });

      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: position.x,
          y: position.y,
          z: position.z,
          duration: 1.5,
          ease: 'power2.inOut',
        });
      }
    },
    [camera, isTransitioning, onSatelliteSelect, onPlanetSelect, onMoonSelect]
  );

  // Handle moon selection
  const handleMoonClick = useCallback(
    (moon: MoonData, position: THREE.Vector3) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      onMoonSelect(moon);
      onPlanetSelect(null);
      onSatelliteSelect(null);

      const distance = moon.radius * 10;
      const targetPosition = new THREE.Vector3(
        position.x + distance,
        position.y + distance * 0.5,
        position.z + distance
      );

      gsap.to(camera.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => setIsTransitioning(false),
      });

      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: position.x,
          y: position.y,
          z: position.z,
          duration: 1.5,
          ease: 'power2.inOut',
        });
      }
    },
    [camera, isTransitioning, onMoonSelect, onPlanetSelect, onSatelliteSelect]
  );

  // Handle sun click
  const handleSunClick = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    onPlanetSelect(sunData as unknown as PlanetData);
    onSatelliteSelect(null);
    onMoonSelect(null);

    gsap.to(camera.position, {
      x: 20,
      y: 15,
      z: 20,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: () => setIsTransitioning(false),
    });

    if (controlsRef.current) {
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: 'power2.inOut',
      });
    }
  }, [camera, isTransitioning, onPlanetSelect, onSatelliteSelect, onMoonSelect]);

  // Reset camera to overview
  const resetCamera = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    onPlanetSelect(null);
    onSatelliteSelect(null);
    onMoonSelect(null);

    gsap.to(camera.position, {
      x: 0,
      y: 80,
      z: 180,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: () => setIsTransitioning(false),
    });

    if (controlsRef.current) {
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: 'power2.inOut',
      });
    }
  }, [camera, isTransitioning, onPlanetSelect, onSatelliteSelect, onMoonSelect]);

  // Expose reset function to parent
  useEffect(() => {
    window.resetSolarSystemCamera = resetCamera;
  }, [resetCamera]);

  // Handle selection from ObjectList (when no position is provided)
  const prevSelectedPlanetIdRef = useRef<string | null>(null);
  const isAnimatingFromListRef = useRef(false);

  useEffect(() => {
    if (isTransitioning || isAnimatingFromListRef.current) return;

    const currentId = selectedPlanet?.id || selectedPlanet?.name || null;

    // Only run if selection actually changed
    if (currentId && currentId !== prevSelectedPlanetIdRef.current) {
      prevSelectedPlanetIdRef.current = currentId;
      isAnimatingFromListRef.current = true;

      // Find planet in scene
      const planetId = selectedPlanet?.name === 'Sun' ? 'sun' : selectedPlanet?.id;

      if (planetId === 'sun') {
        // Handle sun selection
        setTimeout(() => {
          handleSunClick();
          setTimeout(() => {
            isAnimatingFromListRef.current = false;
          }, 1600);
        }, 100);
      } else {
        const planetGroup = scene.getObjectByName(`planet-${planetId}`);
        if (planetGroup && selectedPlanet) {
          const worldPos = new THREE.Vector3();
          planetGroup.getWorldPosition(worldPos);
          handlePlanetClick(selectedPlanet, worldPos);
          setTimeout(() => {
            isAnimatingFromListRef.current = false;
          }, 1600);
        } else {
          isAnimatingFromListRef.current = false;
        }
      }
    }
  }, [selectedPlanet?.id, selectedPlanet?.name, scene, handlePlanetClick]);

  // Handle satellite selection from ObjectList — same POV as direct click (use actual position from scene)
  const prevSelectedSatelliteIdRef = useRef<string | null>(null);
  const isAnimatingSatelliteFromListRef = useRef(false);

  useEffect(() => {
    if (isTransitioning || isAnimatingSatelliteFromListRef.current) return;
    if (!selectedSatellite) return;

    const currentId = selectedSatellite.id;

    if (currentId && currentId !== prevSelectedSatelliteIdRef.current) {
      prevSelectedSatelliteIdRef.current = currentId;
      isAnimatingSatelliteFromListRef.current = true;

      const satelliteGroup = scene.getObjectByName(`satellite-${currentId}`);
      if (satelliteGroup) {
        const satellitePos = new THREE.Vector3();
        satelliteGroup.getWorldPosition(satellitePos);
        handleSatelliteClick(selectedSatellite, satellitePos);
        setTimeout(() => {
          isAnimatingSatelliteFromListRef.current = false;
        }, 1600);
      } else {
        isAnimatingSatelliteFromListRef.current = false;
      }
    }
  }, [selectedSatellite?.id, scene, handleSatelliteClick]);

  // Handle moon selection from ObjectList — same POV as direct click (use actual position from scene)
  const prevSelectedMoonIdRef = useRef<string | null>(null);
  const isAnimatingMoonFromListRef = useRef(false);

  useEffect(() => {
    if (isAnimatingMoonFromListRef.current) return;
    if (!selectedMoon) return;

    const currentId = selectedMoon.id;

    if (currentId && currentId !== prevSelectedMoonIdRef.current) {
      prevSelectedMoonIdRef.current = currentId;
      isAnimatingMoonFromListRef.current = true;

      const moonGroup = scene.getObjectByName(`moon-${currentId}`);
      if (moonGroup) {
        const moonPos = new THREE.Vector3();
        moonGroup.getWorldPosition(moonPos);
        handleMoonClick(selectedMoon, moonPos);
        setTimeout(() => {
          isAnimatingMoonFromListRef.current = false;
        }, 1600);
      } else {
        isAnimatingMoonFromListRef.current = false;
      }
    }
  }, [selectedMoon?.id, scene, handleMoonClick]);

  // Follow selected object (planet, satellite, or moon)
  useFrame(() => {
    if (cameraMode !== 'follow' || isTransitioning || !controlsRef.current) return;

    let targetObject: THREE.Object3D | null = null;
    if (selectedPlanet) {
      targetObject =
        scene.getObjectByName(
          selectedPlanet.id === 'sun' ? 'planet-sun' : `planet-${selectedPlanet.id}`
        ) ?? null;
    } else if (selectedSatellite) {
      targetObject = scene.getObjectByName(`satellite-${selectedSatellite.id}`) ?? null;
    } else if (selectedMoon) {
      targetObject = scene.getObjectByName(`moon-${selectedMoon.id}`) ?? null;
    }

    if (targetObject) {
      const worldPos = new THREE.Vector3();
      targetObject.getWorldPosition(worldPos);
      controlsRef.current.target.lerp(worldPos, 0.05);
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 80, 180]}
        fov={60}
        near={0.1}
        far={1000}
      />

      <DreiOrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        zoomSpeed={0.8}
        rotateSpeed={0.6}
        panSpeed={0.8}
        minDistance={1}
        maxDistance={400}
        maxPolarAngle={Math.PI / 1.5}
        onStart={() => setIsCameraInteracting(true)}
        onEnd={() => setIsCameraInteracting(false)}
      />

      {/* Base ambient; minimal = very dark night side */}
      <ambientLight intensity={0.02} />

      {/* Starfield */}
      <Starfield count={5000} radius={600} />

      {/* Sun */}
      <Sun onClick={handleSunClick} />

      {/* Planets */}
      {planets.map((planet) => (
        <group key={planet.id} name={`planet-group-${planet.id}`}>
          <Planet
            data={planet}
            speedMultiplier={speedMultiplier}
            isPaused={isPaused || isCameraInteracting}
            onClick={handlePlanetClick}
            showOrbits={showOrbits}
          />
        </group>
      ))}

      {/* Satellites */}
      {showSatellites &&
        satellites.map((satellite) => (
          <Satellite
            key={satellite.id}
            data={satellite}
            speedMultiplier={speedMultiplier}
            isPaused={isPaused || isCameraInteracting}
            onClick={handleSatelliteClick}
          />
        ))}

      {/* Natural Moons */}
      {showMoons &&
        moons.map((moon) => (
          <Moon
            key={moon.id}
            data={moon}
            speedMultiplier={speedMultiplier}
            isPaused={isPaused || isCameraInteracting}
            onClick={handleMoonClick}
          />
        ))}

      {/* Asteroid Belt */}
      <AsteroidBelt isPaused={isPaused || isCameraInteracting} />

      {/* Kuiper Belt */}
      <KuiperBelt isPaused={isPaused || isCameraInteracting} />
    </>
  );
}

// Asteroid Belt Component
function AsteroidBelt({ isPaused }: { isPaused: boolean }) {
  const asteroidsRef = useRef<THREE.InstancedMesh>(null);
  const count = 200;
  const innerRadius = 42;
  const outerRadius = 48;

  useEffect(() => {
    if (!asteroidsRef.current) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);

      position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 2, Math.sin(angle) * radius);

      rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      quaternion.setFromEuler(rotation);

      const s = 0.1 + Math.random() * 0.3;
      scale.set(s, s, s);

      matrix.compose(position, quaternion, scale);
      asteroidsRef.current.setMatrixAt(i, matrix);
    }

    asteroidsRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (asteroidsRef.current && !isPaused) {
      asteroidsRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <instancedMesh ref={asteroidsRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#A89B8E"
        emissive="#8B7355"
        emissiveIntensity={0.15}
        roughness={0.8}
        metalness={0.2}
      />
    </instancedMesh>
  );
}

// Kuiper Belt Component - icy objects beyond Neptune
function KuiperBelt({ isPaused }: { isPaused: boolean }) {
  const kuiperRef = useRef<THREE.InstancedMesh>(null);
  const count = 400; // More objects than asteroid belt
  const innerRadius = 155; // Beyond Neptune (140)
  const outerRadius = 220; // Extends well beyond Pluto (170)

  useEffect(() => {
    if (!kuiperRef.current) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.8;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);

      // Kuiper belt has more vertical spread than asteroid belt
      position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 8, Math.sin(angle) * radius);

      rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      quaternion.setFromEuler(rotation);

      // Varied sizes - some larger KBOs
      const s = 0.15 + Math.random() * 0.5;
      scale.set(s, s, s);

      matrix.compose(position, quaternion, scale);
      kuiperRef.current.setMatrixAt(i, matrix);
    }

    kuiperRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (kuiperRef.current && !isPaused) {
      // Very slow rotation - outer solar system moves slowly
      kuiperRef.current.rotation.y += delta * 0.003;
    }
  });

  return (
    <instancedMesh ref={kuiperRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#B8C4D0" // Icy blue-gray color
        emissive="#6B8399"
        emissiveIntensity={0.2}
        roughness={0.6}
        metalness={0.3}
      />
    </instancedMesh>
  );
}
