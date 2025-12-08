import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Filter,
  MapPin,
  Clock,
  Tag,
  Loader2,
  Sparkles,
  Navigation,
  ExternalLink,
  ArrowRight,
  History,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../stores/sceneStore';
import { useAIAnalyticsStore } from '../stores/aiAnalyticsStore';

/**
 * Search Page - Full-Page Search Experience
 *
 * Complete search interface with:
 * - Real-time search with fly-to-3D integration
 * - Autocomplete suggestions
 * - Zone filtering
 * - Item results with direct camera navigation
 * - Recent searches
 * - Quick commands
 */

// Types
interface SearchResult {
  id: string;
  epc: string;
  name: string;
  zone: string;
  zoneId: string;
  status: 'active' | 'inactive' | 'missing' | 'in-transit';
  lastSeen: string;
  position: [number, number, number];
  priority: 'low' | 'medium' | 'high' | 'critical';
  dwellTime?: number; // in minutes
}

interface SearchFilters {
  zones: string[];
  status: string[];
  priority: string[];
}

// Zone metadata
const ZONES = [
  { id: 'receiving', name: 'Receiving', color: '#3b82f6', icon: '📥' },
  { id: 'shipping', name: 'Shipping', color: '#8b5cf6', icon: '📤' },
  { id: 'storage-a', name: 'Storage A', color: '#10b981', icon: '📦' },
  { id: 'storage-b', name: 'Storage B', color: '#10b981', icon: '📦' },
  { id: 'processing', name: 'Processing', color: '#f59e0b', icon: '⚙️' },
  { id: 'staging', name: 'Staging', color: '#06b6d4', icon: '📋' },
  { id: 'secure-storage', name: 'Secure Storage', color: '#ef4444', icon: '🔒' },
  { id: 'returns', name: 'Returns', color: '#ec4899', icon: '↩️' },
  { id: 'office', name: 'Office', color: '#6366f1', icon: '🏢' },
];

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active', color: '#22c55e' },
  { id: 'in-transit', name: 'In Transit', color: '#f59e0b' },
  { id: 'missing', name: 'Missing', color: '#ef4444' },
];

const PRIORITY_OPTIONS = [
  { id: 'critical', name: 'Critical', color: '#ef4444' },
  { id: 'high', name: 'High', color: '#f97316' },
  { id: 'medium', name: 'Medium', color: '#eab308' },
  { id: 'low', name: 'Low', color: '#22c55e' },
];

const SearchPage = () => {
  const navigate = useNavigate();

  // State
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    zones: [],
    status: [],
    priority: [],
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchTime, setSearchTime] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Tenant config for terminology
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const itemTerm = tenantConfig?.itemTerm || 'Item';

  // Scene store for 3D integration
  const flyToItem = useSceneStore((s) => s.flyToItem);
  const flyToZone = useSceneStore((s) => s.flyToZone);
  const calculatePathToItem = useSceneStore((s) => s.calculatePathToItem);
  const items = useSceneStore(useShallow((s) => s.items));

  // Use ref for items in callbacks
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 8));
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Search items (from scene items)
  const searchItems = useCallback((q: string, filtersArg: SearchFilters): SearchResult[] => {
    const startTime = performance.now();
    const lowerQuery = q.toLowerCase().trim();
    const currentItems = itemsRef.current;

    const results = currentItems
      .filter((item) => {
        // Text match (if query exists)
        const textMatch = !lowerQuery ||
          item.epc.toLowerCase().includes(lowerQuery) ||
          item.id.toLowerCase().includes(lowerQuery) ||
          item.zone.toLowerCase().includes(lowerQuery);

        // Zone filter
        const zoneMatch = filtersArg.zones.length === 0 || filtersArg.zones.includes(item.zone);

        return textMatch && zoneMatch;
      })
      .slice(0, 100)
      .map((item) => {
        // Generate realistic mock data for demo
        const priorities: SearchResult['priority'][] = ['low', 'medium', 'high', 'critical'];
        const statuses: SearchResult['status'][] = ['active', 'active', 'active', 'in-transit'];
        const randomPriority = item.zone === 'secure-storage' ? 'critical' : priorities[Math.floor(Math.random() * 3)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const dwellMinutes = Math.floor(Math.random() * 1440 * 30); // 0-30 days in minutes

        return {
          id: item.id,
          epc: item.epc,
          name: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
          zone: item.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          zoneId: item.zone,
          status: randomStatus,
          lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          position: item.position,
          priority: randomPriority,
          dwellTime: dwellMinutes,
        };
      });

    // Apply status and priority filters
    const filteredResults = results.filter(item => {
      const statusMatch = filtersArg.status.length === 0 || filtersArg.status.includes(item.status);
      const priorityMatch = filtersArg.priority.length === 0 || filtersArg.priority.includes(item.priority);
      return statusMatch && priorityMatch;
    });

    setSearchTime(Math.round(performance.now() - startTime));
    return filteredResults;
  }, [itemTerm]);

  // Handle search on query or filter change
  useEffect(() => {
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      const results = searchItems(query, filters);
      setResults(results);
      setIsLoading(false);
    }, 150); // Slight delay for UX

    return () => clearTimeout(timeoutId);
  }, [query, filters, searchItems]);

  // Handle result selection - fly to item in 3D
  const handleSelectItem = useCallback((result: SearchResult) => {
    flyToItem({
      id: result.id,
      epc: result.epc,
      name: result.name,
      zone: result.zoneId,
      position: result.position,
    });
    calculatePathToItem(result.zoneId);
    saveRecentSearch(result.epc);
    // Navigate to dashboard to see the 3D view
    navigate('/');
  }, [flyToItem, calculatePathToItem, saveRecentSearch, navigate]);

  // Handle zone click - fly to zone
  const handleSelectZone = useCallback((zoneId: string) => {
    flyToZone(zoneId);
    navigate('/');
  }, [flyToZone, navigate]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectItem(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  // Toggle filter
  const toggleFilter = (type: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value],
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ zones: [], status: [], priority: [] });
  };

  // Count active filters
  const activeFilterCount = filters.zones.length + filters.status.length + filters.priority.length;

  // Format dwell time
  const formatDwellTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  // Stats for the search
  const stats = useMemo(() => ({
    totalItems: items.length,
    zones: new Set(items.map(i => i.zone)).size,
    criticalZone: items.filter(i => i.zone === 'secure-storage').length,
  }), [items]);

  // Memoized initial items list for "All Tracked Items" section
  // This avoids calling searchItems during render which causes infinite loop
  const initialItemsList = useMemo(() => {
    return items.slice(0, 20).map((item) => {
      const priorities: SearchResult['priority'][] = ['low', 'medium', 'high', 'critical'];
      const statuses: SearchResult['status'][] = ['active', 'active', 'active', 'in-transit'];
      const randomPriority = item.zone === 'secure-storage' ? 'critical' : priorities[Math.floor(Math.random() * 3)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      return {
        id: item.id,
        epc: item.epc,
        name: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
        zone: item.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        zoneId: item.zone,
        status: randomStatus,
        lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        position: item.position,
        priority: randomPriority,
        dwellTime: Math.floor(Math.random() * 1440 * 30),
      };
    });
  }, [items, itemTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Search {itemTerm}s</h1>
          <p className="text-gray-400">
            Find and locate items instantly. Click any result to fly to it in 3D.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-gray-400 text-xs uppercase mb-1">Total Items</div>
            <div className="text-2xl font-bold text-white">{stats.totalItems}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-gray-400 text-xs uppercase mb-1">Active Zones</div>
            <div className="text-2xl font-bold text-cyan-400">{stats.zones}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-gray-400 text-xs uppercase mb-1">Secure Storage</div>
            <div className="text-2xl font-bold text-red-400">{stats.criticalZone}</div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <div className="relative flex items-center gap-3 px-5 py-4 bg-slate-800/80 backdrop-blur-xl border-2 border-white/10 rounded-2xl focus-within:border-cyan-500/50 transition-all">
            <Search className="w-6 h-6 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Search by EPC, zone, or ${itemTerm.toLowerCase()} ID...`}
              className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 outline-none"
              autoFocus
            />
            {isLoading && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
            {!isLoading && searchTime > 0 && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {searchTime}ms
              </span>
            )}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-all relative ${
                showFilters || activeFilterCount > 0
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'hover:bg-white/10 text-gray-400'
              }`}
            >
              <Filter className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-slate-800/60 rounded-2xl p-6 mb-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Filters</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Zone Filters */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase mb-2">Zones</div>
              <div className="flex flex-wrap gap-2">
                {ZONES.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => toggleFilter('zones', zone.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      filters.zones.includes(zone.id)
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <span>{zone.icon}</span>
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filters */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase mb-2">Status</div>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => toggleFilter('status', status.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      filters.status.includes(status.id)
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                    {status.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filters */}
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">Priority</div>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((priority) => (
                  <button
                    key={priority.id}
                    onClick={() => toggleFilter('priority', priority.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      filters.priority.includes(priority.id)
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priority.color }} />
                    {priority.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Zone Access (when no query) */}
        {!query && results.length === 0 && (
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm uppercase mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Quick Zone Access
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleSelectZone(zone.id)}
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="text-2xl mb-2">{zone.icon}</div>
                  <div className="text-white text-sm font-medium">{zone.name}</div>
                  <div className="text-gray-500 text-xs flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3" />
                    Fly to zone
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches (when no query) */}
        {!query && recentSearches.length > 0 && (
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm uppercase mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(search)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 text-sm transition-all flex items-center gap-2"
                >
                  <Clock className="w-3 h-3 text-gray-500" />
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {(query || activeFilterCount > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm uppercase flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {results.length} Results
              </h3>
              {results.length > 0 && (
                <span className="text-xs text-gray-500">
                  Click to fly to location in 3D
                </span>
              )}
            </div>

            {results.length === 0 && !isLoading ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <div className="text-gray-400 text-lg mb-2">No items found</div>
                <div className="text-gray-600 text-sm">Try adjusting your search or filters</div>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => {
                  const zone = ZONES.find((z) => z.id === result.zoneId);
                  const statusColor = STATUS_OPTIONS.find(s => s.id === result.status)?.color;
                  const isSelected = selectedIndex === index;

                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelectItem(result)}
                      className={`w-full p-4 flex items-center gap-4 rounded-xl transition-all text-left group ${
                        isSelected
                          ? 'bg-cyan-500/20 border-2 border-cyan-500/50'
                          : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                      }`}
                    >
                      {/* Item Icon */}
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                      >
                        <Tag className="w-7 h-7 text-cyan-400" />
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono font-bold text-white text-lg">
                            {result.epc.slice(-8).toUpperCase()}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-xs uppercase font-medium"
                            style={{
                              backgroundColor: `${zone?.color}20`,
                              color: zone?.color,
                            }}
                          >
                            {zone?.icon} {result.zone}
                          </span>
                          {result.priority === 'critical' && (
                            <span className="px-2 py-0.5 rounded text-xs uppercase font-medium bg-red-500/20 text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(result.lastSeen).toLocaleTimeString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                            {result.status.replace('-', ' ')}
                          </span>
                          {result.dwellTime && result.dwellTime > 1440 && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <Clock className="w-3 h-3" />
                              Dwell: {formatDwellTime(result.dwellTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Navigation className="w-5 h-5" />
                        <span className="text-sm font-medium">Fly to</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Initial State - Show all items */}
        {!query && activeFilterCount === 0 && items.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                All Tracked Items ({items.length})
              </h3>
              <span className="text-xs text-gray-500">
                Click to fly to location in 3D
              </span>
            </div>
            <div className="space-y-2">
              {initialItemsList.map((result) => {
                const zone = ZONES.find((z) => z.id === result.zoneId);

                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelectItem(result)}
                    className="w-full p-4 flex items-center gap-4 rounded-xl bg-white/5 hover:bg-white/10 border-2 border-transparent transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                      <Tag className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono font-medium text-white">
                          {result.epc.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-xs uppercase font-medium"
                          style={{
                            backgroundColor: `${zone?.color}20`,
                            color: zone?.color,
                          }}
                        >
                          {zone?.icon} {result.zone}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last seen: {new Date(result.lastSeen).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Navigation className="w-4 h-4" />
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
            {items.length > 20 && (
              <div className="text-center mt-4">
                <span className="text-gray-500 text-sm">
                  Showing 20 of {items.length} items. Use search or filters to find specific items.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Keyboard hints */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur rounded-full flex items-center gap-4 text-xs text-gray-500 border border-white/10">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd>
            Fly to item
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd>
            Clear
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
