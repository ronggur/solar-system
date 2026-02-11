import {
  Play,
  Pause,
  RotateCcw,
  Orbit,
  Zap,
  ChevronDown,
  ChevronUp,
  Satellite,
  Eye,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

interface ControlPanelProps {
  speedMultiplier: number;
  setSpeedMultiplier: (value: number) => void;
  isPaused: boolean;
  setIsPaused: (value: boolean) => void;
  showOrbits: boolean;
  setShowOrbits: (value: boolean) => void;
  showSatellites: boolean;
  setShowSatellites: (value: boolean) => void;
  showMoons: boolean;
  setShowMoons: (value: boolean) => void;
  cameraMode: 'free' | 'follow';
  setCameraMode: (mode: 'free' | 'follow') => void;
  onReset: () => void;
}

export function ControlPanel({
  speedMultiplier,
  setSpeedMultiplier,
  isPaused,
  setIsPaused,
  showOrbits,
  setShowOrbits,
  showSatellites,
  setShowSatellites,
  showMoons,
  setShowMoons,
  cameraMode,
  setCameraMode,
  onReset,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="absolute bottom-6 left-6 z-50">
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 glow-box">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Orbit className="w-4 h-4 text-blue-400" />
            Controls
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="space-y-4 w-64">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 text-white"
              >
                {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Orbit Speed
                </span>
                <span>{speedMultiplier.toFixed(1)}x</span>
              </div>
              <Slider
                value={[speedMultiplier]}
                onValueChange={(value) => setSpeedMultiplier(value[0])}
                min={0.1}
                max={10}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 flex items-center gap-2">
                  <Eye className="w-3 h-3" />
                  Show Orbits
                </span>
                <Switch
                  checked={showOrbits}
                  onCheckedChange={setShowOrbits}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 flex items-center gap-2">
                  <Satellite className="w-3 h-3" />
                  Show Satellites
                </span>
                <Switch
                  checked={showSatellites}
                  onCheckedChange={setShowSatellites}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 flex items-center gap-2">
                  <Moon className="w-3 h-3" />
                  Show Moons
                </span>
                <Switch
                  checked={showMoons}
                  onCheckedChange={setShowMoons}
                  className="data-[state=checked]:bg-yellow-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 flex items-center gap-2">
                  <Orbit className="w-3 h-3" />
                  Follow Object
                </span>
                <Switch
                  checked={cameraMode === 'follow'}
                  onCheckedChange={(checked) => setCameraMode(checked ? 'follow' : 'free')}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
