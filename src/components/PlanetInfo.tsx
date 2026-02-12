import {
  X,
  Thermometer,
  Clock,
  Orbit,
  Moon,
  Info,
  Scale,
  Gauge,
  Ruler,
  Cloud,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlanetData } from '@/types';
import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

interface PlanetInfoProps {
  planet: PlanetData | null;
  onClose: () => void;
}

export function PlanetInfo({ planet, onClose }: PlanetInfoProps) {
  const [isVisible, setIsVisible] = useState(!!planet);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (planet && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      setIsVisible(true);
      gsap.fromTo(
        '.planet-info-panel',
        { x: 400, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            isAnimatingRef.current = false;
          },
        }
      );
    } else if (!planet) {
      gsap.to('.planet-info-panel', {
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
  }, [planet]);

  if (!isVisible || !planet) return null;

  const isSun = planet.id === 'sun';

  return (
    <div className="planet-info-panel absolute top-6 right-6 z-[100] w-80">
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden glow-box">
        {/* Header with planet color */}
        <div
          className="relative h-24 flex items-end p-4"
          style={{
            background: `linear-gradient(135deg, ${planet.color}40 0%, ${planet.color}20 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 30% 50%, ${planet.color} 0%, transparent 70%)`,
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white glow-text" style={{ color: planet.color }}>
              {planet.name}
            </h2>
            <p className="text-white/70 text-xs mt-1">{isSun ? 'Star' : 'Planet'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-white/80 text-sm leading-relaxed">{planet.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            {!isSun && 'diameter' in planet && (planet as PlanetData).diameter && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Ruler className="w-3 h-3" />
                  Diameter
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData).diameter}
                </div>
              </div>
            )}
            {!isSun && 'mass' in planet && (planet as PlanetData).mass !== undefined && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Scale className="w-3 h-3" />
                  Mass
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData).mass} Earth
                </div>
              </div>
            )}
            {!isSun && 'gravity' in planet && (planet as PlanetData).gravity && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Gauge className="w-3 h-3" />
                  Gravity
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData).gravity}
                </div>
              </div>
            )}
            {!isSun && 'atmosphere' in planet && (planet as PlanetData).atmosphere && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Cloud className="w-3 h-3" />
                  Atmosphere
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData).atmosphere}
                </div>
              </div>
            )}
            {isSun && 'age' in planet && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  Age
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData & { age: string }).age}
                </div>
              </div>
            )}
            {isSun && 'diameter' in planet && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Ruler className="w-3 h-3" />
                  Diameter
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData & { diameter: string }).diameter}
                </div>
              </div>
            )}
            {isSun && 'mass' in planet && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 col-span-2">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Scale className="w-3 h-3" />
                  Mass
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData & { mass: string }).mass}
                </div>
              </div>
            )}
            {!isSun && planet.temperature && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Thermometer className="w-3 h-3" />
                  Temperature
                </div>
                <div className="text-white text-sm font-medium">{planet.temperature}</div>
              </div>
            )}
            {!isSun && planet.dayLength && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  Day Length
                </div>
                <div className="text-white text-sm font-medium">{planet.dayLength}</div>
              </div>
            )}
            {!isSun && planet.yearLength && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Orbit className="w-3 h-3" />
                  Year Length
                </div>
                <div className="text-white text-sm font-medium">{planet.yearLength}</div>
              </div>
            )}
            {!isSun && planet.moons !== undefined && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Moon className="w-3 h-3" />
                  Moons
                </div>
                <div className="text-white text-sm font-medium">{planet.moons}</div>
              </div>
            )}
            {isSun && 'temperature' in planet && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 col-span-2">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Thermometer className="w-3 h-3" />
                  Temperature
                </div>
                <div className="text-white text-sm font-medium">
                  {(planet as PlanetData & { temperature?: string }).temperature}
                </div>
              </div>
            )}
          </div>

          {/* Facts */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Info className="w-3 h-3" />
              Key Facts
            </div>
            <ul className="space-y-2">
              {planet.facts.map((fact, index) => (
                <li
                  key={index}
                  className="text-white/70 text-xs leading-relaxed flex items-start gap-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: planet.color }}
                  />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          {/* Interesting Number */}
          {!isSun && 'interestingNumber' in planet && (planet as PlanetData).interestingNumber && (
            <div
              className="rounded-lg p-3 border flex items-start gap-2"
              style={{
                backgroundColor: `${planet.color}15`,
                borderColor: `${planet.color}40`,
              }}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: planet.color }} />
              <p className="text-white/90 text-sm leading-relaxed">
                {(planet as PlanetData).interestingNumber}
              </p>
            </div>
          )}

          {/* Close button */}
          <Button
            onClick={onClose}
            className="w-full mt-2"
            variant="outline"
            style={{
              borderColor: `${planet.color}50`,
              backgroundColor: `${planet.color}10`,
              color: planet.color,
            }}
          >
            Continue Exploring
          </Button>
        </div>
      </div>
    </div>
  );
}
