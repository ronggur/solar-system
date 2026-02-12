import { X, Calendar, User, Ruler, Info, Clock, Layers, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MoonData } from '@/types';
import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

interface MoonInfoProps {
  moon: MoonData | null;
  onClose: () => void;
}

export function MoonInfo({ moon, onClose }: MoonInfoProps) {
  const [isVisible, setIsVisible] = useState(!!moon);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (moon && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      setIsVisible(true);
      gsap.fromTo(
        '.moon-info-panel',
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
    } else if (!moon) {
      gsap.to('.moon-info-panel', {
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
  }, [moon]);

  if (!isVisible || !moon) return null;

  return (
    <div className="moon-info-panel absolute top-6 right-6 z-[100] w-80">
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden glow-box">
        {/* Header with moon color */}
        <div
          className="relative h-24 flex items-end p-4"
          style={{
            background: `linear-gradient(135deg, ${moon.color}40 0%, ${moon.color}20 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 30% 50%, ${moon.color} 0%, transparent 70%)`,
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white glow-text" style={{ color: moon.color }}>
              {moon.name}
            </h2>
            <p className="text-white/70 text-xs mt-1">Natural Satellite</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-white/80 text-sm leading-relaxed">{moon.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            {moon.diameter && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Ruler className="w-3 h-3" />
                  Diameter
                </div>
                <div className="text-white text-sm font-medium">{moon.diameter}</div>
              </div>
            )}
            {moon.orbitalPeriod && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  Orbital Period
                </div>
                <div className="text-white text-sm font-medium">{moon.orbitalPeriod}</div>
              </div>
            )}
            {moon.surfaceType && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Layers className="w-3 h-3" />
                  Surface
                </div>
                <div className="text-white text-sm font-medium capitalize">{moon.surfaceType}</div>
              </div>
            )}
            {moon.discoveryYear && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Calendar className="w-3 h-3" />
                  Discovered
                </div>
                <div className="text-white text-sm font-medium">{moon.discoveryYear}</div>
              </div>
            )}
            {moon.discoveredBy && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 col-span-2">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <User className="w-3 h-3" />
                  Discovered By
                </div>
                <div className="text-white text-sm font-medium">{moon.discoveredBy}</div>
              </div>
            )}
          </div>

          {/* Mission Highlights */}
          {moon.missionHighlights && (
            <div className="flex items-start gap-2 rounded-lg p-3 bg-white/5 border border-white/10">
              <Rocket className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/50" />
              <div>
                <div className="text-white/50 text-xs mb-1">Mission Highlights</div>
                <p className="text-white/80 text-sm leading-relaxed">{moon.missionHighlights}</p>
              </div>
            </div>
          )}

          {/* Facts */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Info className="w-3 h-3" />
              Key Facts
            </div>
            <ul className="space-y-2">
              {moon.facts.map((fact, index) => (
                <li
                  key={index}
                  className="text-white/70 text-xs leading-relaxed flex items-start gap-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: moon.color }}
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
              borderColor: `${moon.color}50`,
              backgroundColor: `${moon.color}10`,
              color: moon.color,
            }}
          >
            Continue Exploring
          </Button>
        </div>
      </div>
    </div>
  );
}
