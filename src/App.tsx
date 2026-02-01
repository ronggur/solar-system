import { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import * as THREE from 'three';
import { SolarSystem } from '@/components/SolarSystem';
import { ControlPanel } from '@/components/ControlPanel';
import { ObjectList } from '@/components/ObjectList';
import { PlanetInfo } from '@/components/PlanetInfo';
import { SatelliteInfo } from '@/components/SatelliteInfo';
import { MoonInfo } from '@/components/MoonInfo';
import { Header } from '@/components/Header';
import type { PlanetData, SatelliteData, MoonData } from '@/types';
import './App.css';

function App() {
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [showMoons, setShowMoons] = useState(true);
  const [cameraMode, setCameraMode] = useState<'free' | 'follow'>('free');
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [selectedMoon, setSelectedMoon] = useState<MoonData | null>(null);

  const handleReset = useCallback(() => {
    window.resetSolarSystemCamera?.();
  }, []);

  const handlePlanetSelect = useCallback((planet: PlanetData | null) => {
    setSelectedPlanet(planet);
  }, []);

  const handleSatelliteSelect = useCallback((satellite: SatelliteData | null) => {
    setSelectedSatellite(satellite);
  }, []);

  const handleMoonSelect = useCallback((moon: MoonData | null) => {
    setSelectedMoon(moon);
  }, []);

  const handleClosePlanetInfo = useCallback(() => {
    setSelectedPlanet(null);
    handleReset();
  }, [handleReset]);

  const handleCloseSatelliteInfo = useCallback(() => {
    setSelectedSatellite(null);
    handleReset();
  }, [handleReset]);

  const handleCloseMoonInfo = useCallback(() => {
    setSelectedMoon(null);
    handleReset();
  }, [handleReset]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Header */}
      <Header />

      {/* 3D Canvas */}
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#000000'));
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <Suspense fallback={null}>
          <SolarSystem
            speedMultiplier={speedMultiplier}
            isPaused={isPaused}
            showOrbits={showOrbits}
            selectedPlanet={selectedPlanet}
            onPlanetSelect={handlePlanetSelect}
            selectedSatellite={selectedSatellite}
            onSatelliteSelect={handleSatelliteSelect}
            selectedMoon={selectedMoon}
            onMoonSelect={handleMoonSelect}
            cameraMode={cameraMode}
            showSatellites={showSatellites}
            showMoons={showMoons}
          />
        </Suspense>
      </Canvas>

      {/* Loading Screen */}
      <Loader
        containerStyles={{
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
        innerStyles={{
          color: '#4A90D9',
        }}
        barStyles={{
          background: '#4A90D9',
        }}
        dataStyles={{
          color: '#fff',
        }}
        dataInterpolation={(p) => `Loading Solar System... ${p.toFixed(0)}%`}
        initialState={(active) => active}
      />

      {/* Object List */}
      <ObjectList
        onPlanetSelect={handlePlanetSelect}
        onSatelliteSelect={handleSatelliteSelect}
        onMoonSelect={handleMoonSelect}
        selectedPlanet={selectedPlanet}
        selectedSatellite={selectedSatellite}
        selectedMoon={selectedMoon}
      />

      {/* Control Panel */}
      <ControlPanel
        speedMultiplier={speedMultiplier}
        setSpeedMultiplier={setSpeedMultiplier}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        showOrbits={showOrbits}
        setShowOrbits={setShowOrbits}
        showSatellites={showSatellites}
        setShowSatellites={setShowSatellites}
        showMoons={showMoons}
        setShowMoons={setShowMoons}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        onReset={handleReset}
      />

      {/* Planet Info Panel */}
      <PlanetInfo planet={selectedPlanet} onClose={handleClosePlanetInfo} />

      {/* Satellite Info Panel */}
      <SatelliteInfo satellite={selectedSatellite} onClose={handleCloseSatelliteInfo} />

      {/* Moon Info Panel */}
      <MoonInfo moon={selectedMoon} onClose={handleCloseMoonInfo} />

      {/* Quick Tips */}
      {!selectedPlanet && !selectedSatellite && !selectedMoon && (
        <div className="absolute bottom-6 right-6 z-40">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3">
            <p className="text-white/60 text-xs">
              <span className="text-blue-400 font-medium">Tip:</span> Click on planets or satellites to explore
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
