import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Globe, Satellite as SatelliteIcon, Moon, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { planets, sunData } from '@/data/planets';
import { satellites } from '@/data/satellites';
import { moons } from '@/data/moons';
import type { PlanetData, SatelliteData, MoonData, SunData } from '@/types';

interface ObjectListProps {
  onPlanetSelect: (planet: PlanetData | null) => void;
  onSatelliteSelect: (satellite: SatelliteData | null) => void;
  onMoonSelect: (moon: MoonData | null) => void;
  selectedPlanet: PlanetData | null;
  selectedSatellite: SatelliteData | null;
  selectedMoon: MoonData | null;
}

type ObjectType = 'sun' | 'planet' | 'satellite' | 'moon';

interface FilterState {
  planets: boolean;
  satellites: boolean;
  moons: boolean;
}

export function ObjectList({
  onPlanetSelect,
  onSatelliteSelect,
  onMoonSelect,
  selectedPlanet,
  selectedSatellite,
  selectedMoon,
}: ObjectListProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    planets: true,
    satellites: true,
    moons: true,
  });

  // Combine all objects for filtering
  const allObjects = useMemo(() => {
    const sunObject: SunData = { ...sunData, id: 'sun' };
    const planetObjects = [
      { type: 'sun' as ObjectType, data: sunObject },
      ...planets.map(p => ({ type: 'planet' as ObjectType, data: p }))
    ];
    const satelliteObjects = satellites.map(s => ({ type: 'satellite' as ObjectType, data: s }));
    const moonObjects = moons.map(m => ({ type: 'moon' as ObjectType, data: m }));
    return [...planetObjects, ...satelliteObjects, ...moonObjects];
  }, []);

  // Filter objects based on search query and type filters
  const filteredObjects = useMemo(() => {
    let filtered = allObjects;

    // Apply type filters
    filtered = filtered.filter(obj => {
      if (obj.type === 'sun' || obj.type === 'planet') return filters.planets;
      if (obj.type === 'satellite') return filters.satellites;
      if (obj.type === 'moon') return filters.moons;
      return true;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(obj =>
        obj.data.name.toLowerCase().includes(query) ||
        obj.data.description?.toLowerCase().includes(query) ||
        (obj.type === 'satellite' && (obj.data as SatelliteData).parentPlanet.toLowerCase().includes(query)) ||
        (obj.type === 'moon' && (obj.data as MoonData).parentPlanet.toLowerCase().includes(query))
      );
    }

    // Sort by name (case-insensitive)
    return [...filtered].sort((a, b) =>
      a.data.name.localeCompare(b.data.name, undefined, { sensitivity: 'base' })
    );
  }, [allObjects, searchQuery, filters]);

  const handleObjectClick = (obj: typeof allObjects[0]) => {
    // Clear all other selections first
    if (obj.type === 'satellite') {
      onSatelliteSelect(obj.data as SatelliteData);
      onPlanetSelect(null);
      onMoonSelect(null);
    } else if (obj.type === 'moon') {
      onMoonSelect(obj.data as MoonData);
      onPlanetSelect(null);
      onSatelliteSelect(null);
    } else {
      onPlanetSelect(obj.data as PlanetData);
      onSatelliteSelect(null);
      onMoonSelect(null);
    }
  };

  const isSelected = (obj: typeof allObjects[0]) => {
    if (obj.type === 'satellite') {
      return selectedSatellite?.id === obj.data.id;
    } else if (obj.type === 'moon') {
      return selectedMoon?.id === obj.data.id;
    } else {
      // For planets, use id (all planets including sun have id)
      return selectedPlanet?.id === obj.data.id;
    }
  };

  const getObjectIcon = (type: ObjectType) => {
    if (type === 'satellite') {
      return <SatelliteIcon className="w-3 h-3" />;
    }
    if (type === 'moon') {
      return <Moon className="w-3 h-3" />;
    }
    return <Globe className="w-3 h-3" />;
  };

  const getObjectTypeColor = (type: ObjectType) => {
    if (type === 'sun') return 'text-yellow-400';
    if (type === 'satellite') return 'text-green-400';
    if (type === 'moon') return 'text-amber-400';
    return 'text-blue-400';
  };

  const toggleFilter = (key: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeFilterCount = Object.values(filters).filter(v => !v).length;

  return (
    <div className="absolute bottom-[300px] left-6 z-50">
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 glow-box">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Objects
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="space-y-3 w-64">
            {/* Search and Filter Row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search objects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  p-2 rounded-lg border transition-all duration-200
                  ${showFilters || activeFilterCount > 0
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-400'
                    : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white'
                  }
                `}
                title="Filter objects"
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
                <div className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Filter by type</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleFilter('planets')}
                    className={`
                      px-3 py-1.5 rounded-full text-[11px] font-medium
                      transition-all duration-200 flex items-center gap-1.5
                      ${filters.planets
                        ? 'bg-blue-500/30 text-blue-400 border border-blue-400/50'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                      }
                    `}
                  >
                    <Globe className="w-3 h-3" />
                    Planets
                  </button>
                  <button
                    onClick={() => toggleFilter('satellites')}
                    className={`
                      px-3 py-1.5 rounded-full text-[11px] font-medium
                      transition-all duration-200 flex items-center gap-1.5
                      ${filters.satellites
                        ? 'bg-green-500/30 text-green-400 border border-green-400/50'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                      }
                    `}
                  >
                    <SatelliteIcon className="w-3 h-3" />
                    Satellites
                  </button>
                  <button
                    onClick={() => toggleFilter('moons')}
                    className={`
                      px-3 py-1.5 rounded-full text-[11px] font-medium
                      transition-all duration-200 flex items-center gap-1.5
                      ${filters.moons
                        ? 'bg-amber-500/30 text-amber-400 border border-amber-400/50'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                      }
                    `}
                  >
                    <Moon className="w-3 h-3" />
                    Moons
                  </button>
                </div>
              </div>
            )}

            {/* Objects List */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {filteredObjects.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-4">
                  No objects found
                </div>
              ) : (
                filteredObjects.map((obj, index) => (
                  <button
                    key={`${obj.type}-${obj.data.id || obj.data.name}-${index}`}
                    onClick={() => handleObjectClick(obj)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg
                      transition-all duration-200
                      flex items-center gap-2
                      ${isSelected(obj)
                        ? 'bg-blue-500/30 border border-blue-400/50'
                        : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    <span className={getObjectTypeColor(obj.type)}>
                      {getObjectIcon(obj.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">
                        {obj.data.name}
                      </div>
                      <div className="text-white/50 text-[10px] truncate">
                        {obj.type === 'satellite'
                          ? `Orbits ${(obj.data as SatelliteData).parentPlanet}`
                          : obj.type === 'moon'
                          ? `Moon of ${(obj.data as MoonData).parentPlanet.charAt(0).toUpperCase() + (obj.data as MoonData).parentPlanet.slice(1)}`
                          : (obj.data as PlanetData).type === 'dwarf-planet'
                          ? 'Dwarf Planet'
                          : obj.type === 'sun'
                          ? 'Star'
                          : 'Planet'
                        }
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Object Count */}
            <div className="text-[10px] text-white/40 text-center pt-2 border-t border-white/10">
              {filteredObjects.length} of {allObjects.length} objects
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
