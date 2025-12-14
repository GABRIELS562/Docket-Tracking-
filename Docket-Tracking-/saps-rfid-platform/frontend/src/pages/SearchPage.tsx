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
  FileText,
  Shield,
  CheckCircle2,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../stores/sceneStore';
import { useAIAnalyticsStore } from '../stores/aiAnalyticsStore';
import { HERO_DEMO_ITEMS } from '../hooks/useDemoSimulator';

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

// Chain of custody event
interface CustodyEvent {
  id: string;
  zone: string;
  zoneName: string;
  action: 'entered' | 'verified' | 'scanned';
  timestamp: Date;
  operator: string;
  notes?: string;
}

// Generate chain of custody history for an item
const generateCustodyHistory = (zoneId: string, epc: string): CustodyEvent[] => {
  const operators: Record<string, string> = {
    'entry': 'Evidence Clerk',
    'extractions': 'Sgt Pillay',
    'qpcr-lab': 'Sgt Mulder',
    'pcr-lab': 'WO Jacobs',
    'electrophoresis': 'Lab Technician',
    'genemapper': 'WO Daniels',
    'chain-custody': 'Evidence Officer',
  };

  const zoneNames: Record<string, string> = {
    'entry': 'Entry into Lab',
    'extractions': 'Extractions Lab',
    'qpcr-lab': 'QPCR Lab',
    'pcr-lab': 'PCR Lab',
    'electrophoresis': 'Electrophoresis',
    'genemapper': 'GeneMapper ID',
    'chain-custody': 'Chain of Custody',
  };

  const history: CustodyEvent[] = [];
  let currentTime = new Date();
  // Use EPC to create consistent timing (so same item always shows same history)
  const seed = epc.charCodeAt(epc.length - 1) + epc.charCodeAt(epc.length - 2);
  currentTime.setHours(currentTime.getHours() - (24 + (seed % 72)));

  // Entry
  history.push({
    id: '1',
    zone: 'entry',
    zoneName: zoneNames['entry'],
    action: 'entered',
    timestamp: new Date(currentTime),
    operator: operators['entry'],
    notes: 'Evidence docket registered at lab entry',
  });

  // Extractions
  currentTime.setMinutes(currentTime.getMinutes() + 45 + (seed % 30));
  history.push({
    id: '2',
    zone: 'extractions',
    zoneName: zoneNames['extractions'],
    action: 'entered',
    timestamp: new Date(currentTime),
    operator: operators['extractions'],
    notes: 'DNA extraction initiated',
  });

  history.push({
    id: '3',
    zone: 'extractions',
    zoneName: zoneNames['extractions'],
    action: 'verified',
    timestamp: new Date(currentTime.getTime() + 30 * 60000),
    operator: operators['extractions'],
    notes: 'Sample integrity verified',
  });

  // If item has progressed further, add more history
  if (['qpcr-lab', 'pcr-lab', 'electrophoresis', 'genemapper', 'chain-custody'].includes(zoneId)) {
    currentTime.setMinutes(currentTime.getMinutes() + 120 + (seed % 60));
    history.push({
      id: '4',
      zone: 'pcr-lab',
      zoneName: zoneNames['pcr-lab'],
      action: 'entered',
      timestamp: new Date(currentTime),
      operator: operators['pcr-lab'],
      notes: 'PCR amplification started',
    });
  }

  if (['genemapper', 'chain-custody'].includes(zoneId)) {
    currentTime.setMinutes(currentTime.getMinutes() + 180 + (seed % 60));
    history.push({
      id: '5',
      zone: 'genemapper',
      zoneName: zoneNames['genemapper'],
      action: 'entered',
      timestamp: new Date(currentTime),
      operator: operators['genemapper'],
      notes: 'DNA profile analysis',
    });
  }

  // Current zone scan
  history.push({
    id: '6',
    zone: zoneId,
    zoneName: zoneNames[zoneId] || zoneId,
    action: 'scanned',
    timestamp: new Date(),
    operator: 'RFID System',
    notes: 'Current location confirmed',
  });

  return history;
};

// Zone metadata - SAPS Forensic Laboratory workflow
const ZONES = [
  { id: 'entry', name: 'Entry into Lab', color: '#3b82f6', icon: '🚪' },
  { id: 'extractions', name: 'Extractions - Sgt Pillay', color: '#10b981', icon: '🧬' },
  { id: 'qpcr-lab', name: 'QPCR Lab - Sgt Mulder', color: '#8b5cf6', icon: '🔬' },
  { id: 'pcr-lab', name: 'PCR Lab - WO Jacobs', color: '#f59e0b', icon: '⚗️' },
  { id: 'electrophoresis', name: 'Electrophoresis Lab', color: '#06b6d4', icon: '📊' },
  { id: 'genemapper', name: 'GeneMapper ID - WO Daniels', color: '#ec4899', icon: '🧪' },
  { id: 'chain-custody', name: 'Confirm Chain of Custody', color: '#ef4444', icon: '✅' },
];

// Zone positions for camera fly-to (matching 3D scene coordinates)
const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  'entry': [-22.5, 1.5, -27.5],
  'extractions': [-12.5, 1.5, -5],
  'qpcr-lab': [12.5, 1.5, -5],
  'pcr-lab': [-30, 1.5, 15],
  'electrophoresis': [-34, 1.5, 1.5],
  'genemapper': [-34, 1.5, -11.5],
  'chain-custody': [22.5, 1.5, -27.5],
};

// Get position for an item (from item or zone fallback)
const getItemPosition = (item: { position?: [number, number, number]; zone: string }): [number, number, number] => {
  // If item has valid position (not at origin), use it
  if (item.position && (item.position[0] !== 0 || item.position[1] !== 0 || item.position[2] !== 0)) {
    return item.position;
  }
  // Otherwise use zone center with small random offset
  const basePos = ZONE_POSITIONS[item.zone] || ZONE_POSITIONS['entry'];
  return [
    basePos[0] + (Math.random() - 0.5) * 8,
    basePos[1] + Math.random() * 0.3,
    basePos[2] + (Math.random() - 0.5) * 6,
  ];
};

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
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [custodyHistory, setCustodyHistory] = useState<CustodyEvent[]>([]);

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

  // Search items (from scene items + hero items)
  const searchItems = useCallback((q: string, filtersArg: SearchFilters): SearchResult[] => {
    const startTime = performance.now();
    const lowerQuery = q.toLowerCase().trim();
    const currentItems = itemsRef.current;

    // Always include hero items in search
    const heroResults: SearchResult[] = HERO_DEMO_ITEMS
      .filter((hero) => {
        const textMatch = !lowerQuery ||
          hero.epc.toLowerCase().includes(lowerQuery) ||
          hero.caseNumber.toLowerCase().includes(lowerQuery) ||
          hero.description.toLowerCase().includes(lowerQuery) ||
          hero.zone.toLowerCase().includes(lowerQuery);
        const zoneMatch = filtersArg.zones.length === 0 || filtersArg.zones.includes(hero.zone);
        return textMatch && zoneMatch;
      })
      .map((hero) => ({
        id: `item-${hero.epc}`,
        epc: hero.epc,
        name: `${itemTerm} ${hero.epc}`,
        zone: ZONES.find(z => z.id === hero.zone)?.name || hero.zone,
        zoneId: hero.zone,
        status: 'active' as const,
        lastSeen: new Date().toISOString(),
        position: getItemPosition({ zone: hero.zone }),
        priority: hero.priority,
        dwellTime: Math.floor(Math.random() * 1440 * 14),
      }));

    // Get scene items (excluding hero EPCs)
    const heroEpcs = new Set(HERO_DEMO_ITEMS.map(h => h.epc));
    const sceneResults = currentItems
      .filter((item) => {
        if (heroEpcs.has(item.epc)) return false; // Skip hero items (already added)

        const textMatch = !lowerQuery ||
          item.epc.toLowerCase().includes(lowerQuery) ||
          item.id.toLowerCase().includes(lowerQuery) ||
          item.zone.toLowerCase().includes(lowerQuery);
        const zoneMatch = filtersArg.zones.length === 0 || filtersArg.zones.includes(item.zone);

        return textMatch && zoneMatch;
      })
      .slice(0, 96)
      .map((item) => {
        const priorities: SearchResult['priority'][] = ['low', 'medium', 'high', 'critical'];
        const statuses: SearchResult['status'][] = ['active', 'active', 'active', 'in-transit'];
        const randomPriority = item.zone === 'chain-custody' ? 'critical' : priorities[Math.floor(Math.random() * 3)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const dwellMinutes = Math.floor(Math.random() * 1440 * 30);

        return {
          id: item.id,
          epc: item.epc,
          name: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
          zone: item.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          zoneId: item.zone,
          status: randomStatus,
          lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          position: getItemPosition({ position: item.position, zone: item.zone }),
          priority: randomPriority,
          dwellTime: dwellMinutes,
        };
      });

    // Combine: hero items first, then scene items
    const results = [...heroResults, ...sceneResults];

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

  // Handle result selection - show details inline
  const handleSelectItem = useCallback((result: SearchResult) => {
    setSelectedItem(result);
    setCustodyHistory(generateCustodyHistory(result.zoneId, result.epc));
    saveRecentSearch(result.epc);
  }, [saveRecentSearch]);

  // Navigate to 3D view with selected item
  const handleViewIn3D = useCallback(() => {
    if (!selectedItem) return;

    // CRITICAL: Look up the ACTUAL position from sceneStore items (the real 3D position)
    // This ensures camera flies to where the item actually is in the 3D scene
    const currentItems = itemsRef.current;
    const actualItem = currentItems.find(item => item.epc === selectedItem.epc);

    // Use actual position from 3D scene, or fall back to zone center
    const actualPosition: [number, number, number] = actualItem?.position &&
      (actualItem.position[0] !== 0 || actualItem.position[1] !== 0 || actualItem.position[2] !== 0)
        ? actualItem.position
        : ZONE_POSITIONS[selectedItem.zoneId] || ZONE_POSITIONS['entry'];

    console.log(`🎯 Flying to ${selectedItem.epc} at position:`, actualPosition);

    // Set the item in store with ACTUAL position
    flyToItem({
      id: selectedItem.id,
      epc: selectedItem.epc,
      name: selectedItem.name,
      zone: selectedItem.zoneId,
      position: actualPosition,
    });
    calculatePathToItem(selectedItem.zoneId);

    // Navigate to dashboard - the item will be selected and camera will animate
    // IMPORTANT: Dashboard is at /dashboard, NOT /
    navigate('/dashboard');
  }, [selectedItem, flyToItem, calculatePathToItem, navigate]);

  // Close item details
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setCustodyHistory([]);
  }, []);

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
  // Always includes the 4 hero demo items at the top
  const initialItemsList = useMemo(() => {
    // First, create entries for hero items (always available)
    const heroResults: SearchResult[] = HERO_DEMO_ITEMS.map((hero) => ({
      id: `item-${hero.epc}`,
      epc: hero.epc,
      name: `${itemTerm} ${hero.epc}`,
      zone: ZONES.find(z => z.id === hero.zone)?.name || hero.zone,
      zoneId: hero.zone,
      status: 'active' as const,
      lastSeen: new Date().toISOString(),
      position: getItemPosition({ zone: hero.zone }),
      priority: hero.priority,
      dwellTime: Math.floor(Math.random() * 1440 * 14), // 0-14 days
    }));

    // Then add scene items (excluding hero EPCs to avoid duplicates)
    const heroEpcs = new Set(HERO_DEMO_ITEMS.map(h => h.epc));
    const sceneResults = items
      .filter(item => !heroEpcs.has(item.epc))
      .slice(0, 16)
      .map((item) => {
        const priorities: SearchResult['priority'][] = ['low', 'medium', 'high', 'critical'];
        const statuses: SearchResult['status'][] = ['active', 'active', 'active', 'in-transit'];
        const randomPriority = item.zone === 'chain-custody' ? 'critical' : priorities[Math.floor(Math.random() * 3)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        return {
          id: item.id,
          epc: item.epc,
          name: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
          zone: item.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          zoneId: item.zone,
          status: randomStatus,
          lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          position: getItemPosition({ position: item.position, zone: item.zone }),
          priority: randomPriority,
          dwellTime: Math.floor(Math.random() * 1440 * 30),
        };
      });

    return [...heroResults, ...sceneResults];
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
        {!selectedItem && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur rounded-full flex items-center gap-4 text-xs text-gray-500 border border-white/10">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd>
              Select item
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd>
              Clear
            </span>
          </div>
        )}
      </div>

      {/* Item Details Slide-out Panel */}
      {selectedItem && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-900/98 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-600/20 to-blue-600/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-white font-bold">{itemTerm} Details</h2>
                <p className="text-xs text-gray-400">Live location & history</p>
              </div>
            </div>
            <button
              onClick={handleCloseDetails}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* EPC & Case Info */}
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">EPC Tag ID</div>
                <div className="font-mono text-2xl text-white font-bold tracking-wider">
                  {selectedItem.epc}
                </div>
              </div>

              {/* Hero item case details */}
              {(() => {
                const heroItem = HERO_DEMO_ITEMS.find(h => h.epc === selectedItem.epc);
                if (heroItem) {
                  return (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Case Number</div>
                        <div className="text-white font-mono">{heroItem.caseNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Description</div>
                        <div className="text-white">{heroItem.description}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Assigned Officer</div>
                        <div className="text-cyan-400">{heroItem.officer}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Current Location */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Live Location
                </div>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: `${ZONES.find(z => z.id === selectedItem.zoneId)?.color}20`,
                    color: ZONES.find(z => z.id === selectedItem.zoneId)?.color,
                    border: `1px solid ${ZONES.find(z => z.id === selectedItem.zoneId)?.color}40`,
                  }}
                >
                  <span className="text-lg">{ZONES.find(z => z.id === selectedItem.zoneId)?.icon}</span>
                  {selectedItem.zone}
                </div>
              </div>

              {/* Priority Badge */}
              {selectedItem.priority === 'critical' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">Critical Priority Evidence</span>
                </div>
              )}
            </div>

            {/* Chain of Custody Timeline */}
            <div>
              <div className="text-xs text-gray-500 uppercase mb-4 flex items-center gap-2">
                <History className="w-4 h-4" />
                Chain of Custody ({custodyHistory.length} events)
              </div>

              <div className="space-y-0">
                {custodyHistory.map((event, idx) => {
                  const isLast = idx === custodyHistory.length - 1;
                  const zoneColor = ZONES.find(z => z.id === event.zone)?.color || '#6b7280';

                  return (
                    <div key={event.id} className="relative flex gap-3">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-[11px] top-6 w-0.5 h-full bg-white/10" />
                      )}

                      {/* Timeline dot */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border"
                        style={{
                          backgroundColor: `${zoneColor}20`,
                          borderColor: `${zoneColor}40`,
                        }}
                      >
                        {event.action === 'entered' && <ArrowRight className="w-3 h-3" style={{ color: zoneColor }} />}
                        {event.action === 'verified' && <CheckCircle2 className="w-3 h-3" style={{ color: zoneColor }} />}
                        {event.action === 'scanned' && <Eye className="w-3 h-3" style={{ color: zoneColor }} />}
                      </div>

                      {/* Event content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white">
                            {event.action === 'entered' && 'Entered'}
                            {event.action === 'verified' && 'Verified at'}
                            {event.action === 'scanned' && 'Scanned at'} {event.zoneName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{event.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          <span>•</span>
                          <span>{event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span className="text-cyan-400">{event.operator}</span>
                        </div>
                        {event.notes && (
                          <div className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {event.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verification Status */}
            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Chain of custody verified</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-white/10 bg-slate-900/50">
            <button
              onClick={handleViewIn3D}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-semibold transition-all"
            >
              <Navigation className="w-5 h-5" />
              View Live Location in 3D
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
