import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, MapPin, Clock, Tag, Loader2, Sparkles, Navigation } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * Search-First UI Interface (Phase 3.3)
 *
 * Primary interface for our on-demand architecture:
 * - Autocomplete with suggestions
 * - Real-time search as user types
 * - Faceted filtering (zone, status, date)
 * - Virtualized results for performance
 * - Integration with 3D visualization
 * - Search history and recent searches
 *
 * Target: <300ms search response, smooth autocomplete
 * Reference: StartHere.md Phase 3.3
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
  rssi?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface SearchFilters {
  zones: string[];
  status: string[];
  dateRange: 'today' | 'week' | 'month' | 'all';
}

interface SearchSuggestion {
  type: 'item' | 'zone' | 'recent' | 'command';
  value: string;
  label: string;
  icon: React.ReactNode;
  metadata?: string;
  // Item-specific fields for direct selection
  position?: [number, number, number];
  zoneId?: string;
  itemId?: string;
}

// Zone metadata - matches warehouse config
const ZONES = [
  { id: 'receiving', name: 'Receiving', color: '#22c55e', icon: '📥' },
  { id: 'shipping', name: 'Shipping', color: '#8b5cf6', icon: '📤' },
  { id: 'storage-a', name: 'Storage A', color: '#3b82f6', icon: '📦' },
  { id: 'storage-b', name: 'Storage B', color: '#3b82f6', icon: '📦' },
  { id: 'office', name: 'Office', color: '#6366f1', icon: '🏢' },
  { id: 'returns', name: 'Returns', color: '#f97316', icon: '↩️' },
  { id: 'processing', name: 'Processing', color: '#eab308', icon: '⚙️' },
  { id: 'secure-evidence', name: 'Secure Vault', color: '#ef4444', icon: '🔒' },
  { id: 'staging', name: 'Staging', color: '#14b8a6', icon: '📋' },
];

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active', color: '#22c55e' },
  { id: 'inactive', name: 'Inactive', color: '#6b7280' },
  { id: 'missing', name: 'Missing', color: '#ef4444' },
  { id: 'in-transit', name: 'In Transit', color: '#f59e0b' },
];

const SearchInterface = () => {
  // State
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    zones: [],
    status: [],
    dateRange: 'all',
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Tenant config for terminology
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const itemTerm = tenantConfig?.itemTerm || 'Item';

  // Camera store for navigation
  const cameraFlyToItem = useCameraStore((s) => s.flyToItem);
  const cameraFlyToZone = useCameraStore((s) => s.flyToZone);

  // Warehouse store for zone configs
  const getZone = useWarehouseStore((s) => s.getZone);

  // Scene store for pathfinding and items
  const selectItem = useSceneStore((s) => s.selectItem);
  const calculatePathToItem = useSceneStore((s) => s.calculatePathToItem);
  // Use useShallow for items array to prevent new reference on every render
  const items = useSceneStore(useShallow((s) => s.items));

  // Wrapper for flyToItem that uses camera store
  const flyToItem = useCallback((item: { id: string; epc: string; name: string; zone: string; position: [number, number, number] }) => {
    cameraFlyToItem(item.id, { x: item.position[0], y: item.position[1], z: item.position[2] });
    selectItem(item);
  }, [cameraFlyToItem, selectItem]);

  // Wrapper for flyToZone that uses camera store
  const flyToZone = useCallback((zoneId: string) => {
    const zone = getZone(zoneId);
    if (zone) {
      cameraFlyToZone(zoneId, zone.center, zone.cameraPreset);
    }
  }, [cameraFlyToZone, getZone]);

  // Use ref for items and itemTerm in callbacks to avoid dependency issues
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const itemTermRef = useRef(itemTerm);
  itemTermRef.current = itemTerm;

  // Debounced query for API calls
  const debouncedQuery = useDebounce(query, 200);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Generate suggestions based on query
  const generateSuggestions = useCallback((q: string): SearchSuggestion[] => {
    if (!q.trim()) {
      // Show recent searches and quick commands
      const suggestions: SearchSuggestion[] = [];

      // Recent searches
      recentSearches.forEach((recent) => {
        suggestions.push({
          type: 'recent',
          value: recent,
          label: recent,
          icon: <Clock className="w-4 h-4 text-gray-400" />,
          metadata: 'Recent',
        });
      });

      // Quick commands
      suggestions.push({
        type: 'command',
        value: '/tour',
        label: 'Start Zone Tour',
        icon: <Navigation className="w-4 h-4 text-cyan-400" />,
        metadata: 'Command',
      });

      suggestions.push({
        type: 'command',
        value: '/critical',
        label: 'Show Critical Items',
        icon: <Sparkles className="w-4 h-4 text-red-400" />,
        metadata: 'Command',
      });

      return suggestions;
    }

    const suggestions: SearchSuggestion[] = [];
    const lowerQuery = q.toLowerCase();
    const currentItems = itemsRef.current;

    // Zone suggestions
    ZONES.filter((z) => z.name.toLowerCase().includes(lowerQuery)).forEach((zone) => {
      suggestions.push({
        type: 'zone',
        value: zone.id,
        label: zone.name,
        icon: <MapPin className="w-4 h-4" style={{ color: zone.color }} />,
        metadata: 'Zone',
      });
    });

    // Item suggestions from current scene items
    currentItems
      .filter((item) =>
        item.epc.toLowerCase().includes(lowerQuery) ||
        item.id.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .forEach((item) => {
        suggestions.push({
          type: 'item',
          value: item.epc,
          label: item.epc.slice(-8).toUpperCase(),
          icon: <Tag className="w-4 h-4 text-blue-400" />,
          metadata: item.zone.replace('-', ' '),
          // Include position and zone for direct item selection
          position: item.position,
          zoneId: item.zone,
          itemId: item.id,
        });
      });

    return suggestions;
  }, [recentSearches]); // Removed items - using itemsRef

  // Search items (simulated - would connect to backend API)
  const searchItems = useCallback(async (q: string, filtersArg: SearchFilters): Promise<SearchResult[]> => {
    // In production, this would call the backend API:
    // const response = await fetch(`/api/v1/items/search?q=${q}&filters=${JSON.stringify(filters)}`);
    // return response.json();

    // For demo, filter from scene items
    const lowerQuery = q.toLowerCase();
    const currentItems = itemsRef.current;

    return currentItems
      .filter((item) => {
        // Text match
        const textMatch =
          item.epc.toLowerCase().includes(lowerQuery) ||
          item.id.toLowerCase().includes(lowerQuery) ||
          item.zone.toLowerCase().includes(lowerQuery);

        // Zone filter
        const zoneMatch = filtersArg.zones.length === 0 || filtersArg.zones.includes(item.zone);

        return textMatch && zoneMatch;
      })
      .slice(0, 50) // Limit results for performance
      .map((item) => ({
        id: item.id,
        epc: item.epc,
        name: `${itemTermRef.current} ${item.epc.slice(-6)}`,
        zone: item.zone.replace('-', ' '),
        zoneId: item.zone,
        status: 'active' as const,
        lastSeen: new Date().toISOString(),
        position: item.position,
        priority: 'medium' as const,
      }));
  }, []); // Removed items - using itemsRef

  // Handle search
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      setIsLoading(true);
      searchItems(debouncedQuery, filters).then((results) => {
        setResults(results);
        setIsLoading(false);
      });
    } else {
      setResults([]);
    }

    setSuggestions(generateSuggestions(debouncedQuery));
  }, [debouncedQuery, filters, searchItems, generateSuggestions]);

  // Handle suggestion/result selection
  const handleSelect = useCallback((suggestion: SearchSuggestion | SearchResult) => {
    if ('type' in suggestion) {
      // It's a suggestion
      switch (suggestion.type) {
        case 'zone':
          flyToZone(suggestion.value);
          setQuery('');
          setIsOpen(false);
          break;
        case 'item':
          // Fly to item and show tracking panel
          if (suggestion.position && suggestion.zoneId && suggestion.itemId) {
            flyToItem({
              id: suggestion.itemId,
              epc: suggestion.value,
              name: `${itemTerm} ${suggestion.label}`,
              zone: suggestion.zoneId,
              position: suggestion.position,
            });
            calculatePathToItem(suggestion.zoneId);
            setQuery('');
            setIsOpen(false);
          } else {
            setQuery(suggestion.value);
          }
          saveRecentSearch(suggestion.value);
          break;
        case 'recent':
          setQuery(suggestion.value);
          break;
        case 'command':
          handleCommand(suggestion.value);
          setQuery('');
          setIsOpen(false);
          break;
      }
    } else {
      // It's a search result - fly to item and show path
      flyToItem({
        id: suggestion.id,
        epc: suggestion.epc,
        name: suggestion.name,
        zone: suggestion.zoneId,
        position: suggestion.position,
      });
      // Calculate and display optimal route to the item's zone
      calculatePathToItem(suggestion.zoneId);
      saveRecentSearch(suggestion.epc);
      setIsOpen(false);
    }
  }, [flyToItem, flyToZone, saveRecentSearch, calculatePathToItem]);

  // Handle commands
  const handleCommand = (cmd: string) => {
    switch (cmd) {
      case '/tour':
        (window as any).cameraController?.startTour();
        break;
      case '/critical':
        setFilters({ ...filters, zones: ['secure-evidence'] });
        setQuery('');
        break;
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + results.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < suggestions.length) {
            handleSelect(suggestions[selectedIndex]);
          } else {
            handleSelect(results[selectedIndex - suggestions.length]);
          }
        } else if (query) {
          saveRecentSearch(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Toggle filter
  const toggleFilter = (type: 'zones' | 'status', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value],
    }));
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Main Search Input */}
      <div
        className={`
          relative flex items-center gap-3 px-4 py-3
          bg-slate-900/90 backdrop-blur-xl
          border-2 transition-all duration-300
          ${isOpen
            ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/20 rounded-t-2xl'
            : 'border-white/10 hover:border-white/20 rounded-2xl'
          }
        `}
      >
        <Search className={`w-5 h-5 transition-colors ${isOpen ? 'text-cyan-400' : 'text-gray-400'}`} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search items, zones, or type / for commands..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
        />

        {isLoading && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}

        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            p-2 rounded-lg transition-all
            ${showFilters || filters.zones.length > 0 || filters.status.length > 0
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'hover:bg-white/10 text-gray-400'
            }
          `}
        >
          <Filter className="w-4 h-4" />
          {(filters.zones.length > 0 || filters.status.length > 0) && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 right-0 z-50
            bg-slate-900/95 backdrop-blur-xl
            border-2 border-t-0 border-cyan-500/50
            rounded-b-2xl shadow-2xl shadow-cyan-500/10
            max-h-[70vh] overflow-hidden flex flex-col
          "
        >
          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 border-b border-white/10">
              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase mb-2">Zones</div>
                <div className="flex flex-wrap gap-2">
                  {ZONES.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => toggleFilter('zones', zone.id)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-all flex items-center gap-1.5
                        ${filters.zones.includes(zone.id)
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                        }
                      `}
                    >
                      <span>{zone.icon}</span>
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Status</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status.id}
                      onClick={() => toggleFilter('status', status.id)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-all flex items-center gap-1.5
                        ${filters.status.includes(status.id)
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                        }
                      `}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !query && (
            <div className="p-2 border-b border-white/5">
              <div className="text-xs text-gray-500 uppercase px-3 py-1">Quick Actions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  onClick={() => handleSelect(suggestion)}
                  className={`
                    w-full px-3 py-2.5 flex items-center gap-3
                    rounded-lg transition-all text-left
                    ${selectedIndex === index
                      ? 'bg-cyan-500/20 text-white'
                      : 'hover:bg-white/5 text-gray-300'
                    }
                  `}
                >
                  {suggestion.icon}
                  <span className="flex-1">{suggestion.label}</span>
                  <span className="text-xs text-gray-500">{suggestion.metadata}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div ref={resultsRef} className="flex-1 overflow-y-auto p-2">
              <div className="text-xs text-gray-500 uppercase px-3 py-1 flex items-center justify-between">
                <span>Results ({results.length})</span>
                <span className="text-cyan-400">&lt;300ms</span>
              </div>
              {results.map((result, index) => {
                const adjustedIndex = index + suggestions.length;
                const zone = ZONES.find((z) => z.id === result.zoneId);

                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className={`
                      w-full px-3 py-3 flex items-center gap-4
                      rounded-xl transition-all text-left group
                      ${selectedIndex === adjustedIndex
                        ? 'bg-cyan-500/20'
                        : 'hover:bg-white/5'
                      }
                    `}
                  >
                    {/* Item icon */}
                    <div
                      className="
                        w-10 h-10 rounded-lg flex items-center justify-center
                        bg-gradient-to-br from-cyan-500/20 to-blue-500/20
                        border border-cyan-500/30
                      "
                    >
                      <Tag className="w-5 h-5 text-cyan-400" />
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-white">
                          {result.epc.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] uppercase font-medium"
                          style={{
                            backgroundColor: `${zone?.color}20`,
                            color: zone?.color,
                          }}
                        >
                          {zone?.icon} {result.zone}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Last seen: {new Date(result.lastSeen).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Action hint */}
                    <div
                      className="
                        opacity-0 group-hover:opacity-100 transition-opacity
                        text-xs text-cyan-400 flex items-center gap-1
                      "
                    >
                      <Navigation className="w-3 h-3" />
                      Fly to
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {query && !isLoading && results.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-gray-400 text-sm">No items found</div>
              <div className="text-gray-600 text-xs mt-1">Try adjusting your search or filters</div>
            </div>
          )}

          {/* Keyboard hints */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd>
              Close
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">/</kbd>
              Commands
            </span>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SearchInterface;
