import { X, Rocket, Calendar, Building2, Info, Orbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SatelliteData } from '@/types';
import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { satelliteTypeColors } from '@/data/satellites';

interface SatelliteInfoProps {
  satellite: SatelliteData | null;
  onClose: () => void;
}

export function SatelliteInfo({ satellite, onClose }: SatelliteInfoProps) {
  const [isVisible, setIsVisible] = useState(!!satellite);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (satellite && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      setIsVisible(true);
      gsap.fromTo(
        '.satellite-info-panel',
        { x: 400, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', onComplete: () => {
          isAnimatingRef.current = false;
        }}
      );
    } else if (!satellite) {
      gsap.to('.satellite-info-panel', {
        x: 400,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          setIsVisible(false);
          isAnimatingRef.current = false;
        },
      });
    }
  }, [satellite]);

  if (!isVisible || !satellite) return null;

  const typeColors = satelliteTypeColors[satellite.type];
  const typeLabels: Record<string, string> = {
    'space-station': 'Space Station',
    'telescope': 'Space Telescope',
    'satellite': 'Satellite Constellation',
    'probe': 'Space Probe'
  };

  return (
    <div className="satellite-info-panel absolute top-6 right-6 z-50 w-80">
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden glow-box">
        {/* Header */}
        <div
          className="relative h-24 flex items-end p-4"
          style={{
            background: `linear-gradient(135deg, ${typeColors.color}40 0%, ${typeColors.color}20 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 30% 50%, ${typeColors.color} 0%, transparent 70%)`,
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-4 h-4" style={{ color: typeColors.color }} />
              <span className="text-white/60 text-xs uppercase tracking-wider">{typeLabels[satellite.type]}</span>
            </div>
            <h2
              className="text-xl font-bold text-white glow-text"
              style={{ color: typeColors.color }}
            >
              {satellite.name}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-white/80 text-sm leading-relaxed">{satellite.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                Launch Date
              </div>
              <div className="text-white text-sm font-medium">{satellite.launchDate}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Building2 className="w-3 h-3" />
                Operator
              </div>
              <div className="text-white text-sm font-medium">{satellite.operator}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Orbit className="w-3 h-3" />
                Orbiting
              </div>
              <div className="text-white text-sm font-medium capitalize">{satellite.parentPlanet}</div>
            </div>
          </div>

          {/* Facts */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Info className="w-3 h-3" />
              Key Facts
            </div>
            <ul className="space-y-2">
              {satellite.facts.map((fact, index) => (
                <li
                  key={index}
                  className="text-white/70 text-xs leading-relaxed flex items-start gap-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: typeColors.color }}
                  />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          {/* Close button */}
          <Button
            onClick={onClose}
            className="w-full mt-2"
            variant="outline"
            style={{
              borderColor: `${typeColors.color}50`,
              backgroundColor: `${typeColors.color}10`,
              color: typeColors.color,
            }}
          >
            Continue Exploring
          </Button>
        </div>
      </div>
    </div>
  );
}
