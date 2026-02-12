import {
  X,
  Rocket,
  Calendar,
  Building2,
  Info,
  Orbit,
  Activity,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SatelliteData } from '@/types';
import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { satelliteTypeColors } from '@/data/satellites';

function SatelliteImage({ satellite }: { satellite: SatelliteData }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!satellite.imageUrl) return null;

  // In dev, Vite serves public at root, so use relative path (/satellites/...).
  // In prod, base is set (/solar-system/), so prepend BASE_URL.
  // Data stores paths without the base (e.g. /satellites/iss.jpg), so handle both cases.
  const baseUrl = import.meta.env.BASE_URL || '';
  const imageSrc = baseUrl ? `${baseUrl}${satellite.imageUrl}` : `/${satellite.imageUrl}`;

  return (
    <div className="relative w-full aspect-video bg-white/5 rounded-lg overflow-hidden border border-white/10">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs">
          Image unavailable
        </div>
      )}
      <img
        src={imageSrc}
        alt={satellite.name}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded && !error ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          console.error('[SatelliteImage] Error loading:', satellite.name, imageSrc, e);
          setError(true);
        }}
        loading="lazy"
      />
    </div>
  );
}

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
  const statusLabels: Record<string, string> = {
    active: 'Active',
    ended: 'Ended',
    extended: 'Extended',
  };
  const typeLabels: Record<string, string> = {
    'space-station': 'Space Station',
    telescope: 'Space Telescope',
    satellite: 'Satellite Constellation',
    probe: 'Space Probe',
  };

  return (
    <div className="satellite-info-panel absolute top-6 right-6 z-[100] w-80">
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
              <span className="text-white/60 text-xs uppercase tracking-wider">
                {typeLabels[satellite.type]}
              </span>
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
          {/* Real photo / illustration */}
          <SatelliteImage satellite={satellite} />

          {/* Description */}
          <p className="text-white/80 text-sm leading-relaxed">{satellite.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            {satellite.missionStatus && (
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Activity className="w-3 h-3" />
                  Status
                </div>
                <div className="text-white text-xs font-medium">
                  {statusLabels[satellite.missionStatus] ?? satellite.missionStatus}
                </div>
              </div>
            )}
            {satellite.altitude && (
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <MapPin className="w-3 h-3" />
                  Altitude
                </div>
                <div className="text-white text-xs font-medium">{satellite.altitude}</div>
              </div>
            )}
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                Launch Date
              </div>
              <div className="text-white text-xs font-medium">{satellite.launchDate}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Building2 className="w-3 h-3" />
                Operator
              </div>
              <div className="text-white text-xs font-medium">{satellite.operator}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10 col-span-2">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Orbit className="w-3 h-3" />
                Orbiting
              </div>
              <div className="text-white text-xs font-medium capitalize">
                {satellite.parentPlanet}
              </div>
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

          {/* Official link */}
          {satellite.url && (
            <a
              href={satellite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border transition-colors hover:bg-white/10"
              style={{
                borderColor: `${typeColors.color}50`,
                color: typeColors.color,
              }}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">Official Mission Page</span>
            </a>
          )}

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
