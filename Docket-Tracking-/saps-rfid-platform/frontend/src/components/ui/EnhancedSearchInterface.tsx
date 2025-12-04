import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, Clock, Tag, Loader2, Sparkles, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearch } from '../../services/searchApi';
import type { SearchResultItem } from '../../services/searchApi';
import VirtualizedSearchResults from './VirtualizedSearchResults';
import FacetedFilters from './FacetedFilters';
import type { FilterState } from './FacetedFilters';
import { useSearchTo3D, SearchTo3DProvider } from './SearchTo3D';

/**
 * Enhanced Search Interface (Phase 3.3)
 *
 * Fully integrated search-first UI with all Phase 3.3 components:
 * - Autocomplete with suggestions
 * - VirtualizedSearchResults for infinite scroll
 * - FacetedFilters for zone/status/priority/date filtering
 * - SearchTo3D pipeline for 3D visualization
 * - Real-time Elasticsearch integration
 *
 * Target: <300ms search response, smooth autocomplete
 * Reference: StartHere.md Phase 3.3
 */

// ============================================================================
// Types
// ============================================================================

interface SearchSuggestion {
  type: 'item' | 'zone' | 'recent' | 'command';
  value: string;
  label: string;
  icon: React.ReactNode;
  metadata?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ZONES = [
  { id: 'receiving', name: 'Receiving', color: '#3b82f6', icon: '📥' },
  { id: 'storage-a', name: 'Storage A', color: '#10b981', icon: '📦' },
  { id: 'storage-b', name: 'Storage B', color: '#10b981', icon: '📦' },
  { id: 'storage-c', name: 'Storage C', color: '#10b981', icon: '📦' },
  { id: 'secure-storage', name: 'Secure Storage', color: '#ef4444', icon: '🔒' },
  { id: 'storage-d', name: 'Storage D', color: '#10b981', icon: '📦' },
  { id: 'processing', name: 'Processing', color: '#f59e0b', icon: '⚙️' },
  { id: 'shipping', name: 'Shipping', color: '#8b5cf6', icon: '📤' },
  { id: 'returns', name: 'Returns', color: '#ec4899', icon: '↩️' },
];

// ============================================================================
// Main Component
// ============================================================================

const EnhancedSearchInterface = () => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Search API hook
  const {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    total,
    isLoading,
    hasMore,
    aggregations,
    took,
    loadMore,
    reset,
  } = useSearch({ pageSize: 50, debounceMs: 200 });

  // 3D integration
  const { flyToItem, flyToZone, setHoveredItem, focusOnResults } = useSearchTo3D();

  // Convert filters to FacetedFilters format
  const facetedFilters: FilterState = {
    zones: filters.zones,
    status: filters.status,
    priority: filters.priority,
    dateRange: filters.dateRange,
  };

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

  // Generate suggestions
  const generateSuggestions = useCallback((q: string): SearchSuggestion[] => {
    if (!q.trim()) {
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

      suggestions.push({
        type: 'command',
        value: '/focus',
        label: 'Focus on Results',
        icon: <Search className="w-4 h-4 text-blue-400" />,
        metadata: 'Command',
      });

      return suggestions;
    }

    const suggestions: SearchSuggestion[] = [];
    const lowerQuery = q.toLowerCase();

    // Zone suggestions
    ZONES.filter((z) => z.name.toLowerCase().includes(lowerQuery)).forEach((zone) => {
      suggestions.push({
        type: 'zone',
        value: zone.id,
        label: zone.name,
        icon: <span style={{ color: zone.color }}>{zone.icon}</span>,
        metadata: 'Zone',
      });
    });

    return suggestions;
  }, [recentSearches]);

  // Update suggestions when query changes
  useEffect(() => {
    setSuggestions(generateSuggestions(query));
  }, [query, generateSuggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'zone':
        flyToZone(suggestion.value);
        setQuery('');
        setIsOpen(false);
        break;
      case 'item':
        setQuery(suggestion.value);
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
  }, [flyToZone, saveRecentSearch, setQuery]);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResultItem) => {
    flyToItem(result);
    saveRecentSearch(result.epc);
  }, [flyToItem, saveRecentSearch]);

  // Handle result hover
  const handleResultHover = useCallback((result: SearchResultItem | null) => {
    setHoveredItem(result);
  }, [setHoveredItem]);

  // Handle commands
  const handleCommand = (cmd: string) => {
    switch (cmd) {
      case '/tour':
        (window as unknown as { cinematicCamera?: { runZoneTour: () => void } }).cinematicCamera?.runZoneTour();
        break;
      case '/critical':
        setFilters({ ...filters, zones: ['secure-storage'], priority: ['critical'] });
        break;
      case '/focus':
        if (results.length > 0) {
          focusOnResults(results);
        }
        break;
    }
  };

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters({
      zones: newFilters.zones,
      status: newFilters.status,
      priority: newFilters.priority,
      dateRange: newFilters.dateRange,
    });
  }, [setFilters]);

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
            handleSuggestionSelect(suggestions[selectedIndex]);
          } else {
            handleResultSelect(results[selectedIndex - suggestions.length]);
          }
        } else if (query) {
          saveRecentSearch(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (e.shiftKey) {
          // Focus filters
          setShowFilters(true);
        }
        break;
    }
  };

  return (
    <SearchTo3DProvider>
      <div className="relative w-full max-w-4xl mx-auto">
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

          {/* Response time indicator */}
          {took > 0 && !isLoading && (
            <span className={`text-xs ${took < 300 ? 'text-green-400' : 'text-yellow-400'}`}>
              {took}ms
            </span>
          )}

          {query && (
            <button
              onClick={() => {
                reset();
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
              p-2 rounded-lg transition-all relative
              ${showFilters || filters.zones.length > 0 || filters.status.length > 0
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'hover:bg-white/10 text-gray-400'
              }
            `}
          >
            <Filter className="w-4 h-4" />
            {(filters.zones.length > 0 || filters.status.length > 0 || filters.priority.length > 0) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Dropdown Panel */}
        {isOpen && (
          <div
            className={`
              absolute top-full left-0 right-0 z-50
              bg-slate-900/95 backdrop-blur-xl
              border-2 border-t-0 border-cyan-500/50
              rounded-b-2xl shadow-2xl shadow-cyan-500/10
              transition-all duration-300
              ${isPanelExpanded ? 'max-h-[70vh]' : 'max-h-[200px]'}
              overflow-hidden flex flex-col
            `}
          >
            {/* Expand/Collapse toggle */}
            <button
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              className="absolute top-2 right-2 z-10 p-1 hover:bg-white/10 rounded transition-colors"
            >
              {isPanelExpanded ? (
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* Faceted Filters */}
            {showFilters && (
              <div className="border-b border-white/10">
                <FacetedFilters
                  filters={facetedFilters}
                  onFilterChange={handleFilterChange}
                  zoneAggregations={aggregations?.zones}
                  statusAggregations={aggregations?.statuses}
                  totalResults={total}
                  isCollapsible={false}
                  defaultExpanded={true}
                />
              </div>
            )}

            {/* Suggestions (when no query) */}
            {suggestions.length > 0 && !query && (
              <div className="p-2 border-b border-white/5">
                <div className="text-xs text-gray-500 uppercase px-3 py-1">Quick Actions</div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    onClick={() => handleSuggestionSelect(suggestion)}
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

            {/* Zone suggestions when typing */}
            {suggestions.length > 0 && query && (
              <div className="p-2 border-b border-white/5">
                <div className="text-xs text-gray-500 uppercase px-3 py-1">Suggestions</div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    onClick={() => handleSuggestionSelect(suggestion)}
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

            {/* Virtualized Search Results */}
            {(query || filters.zones.length > 0 || filters.status.length > 0) && (
              <div className="flex-1 min-h-0">
                <VirtualizedSearchResults
                  results={results}
                  totalResults={total}
                  isLoading={isLoading}
                  hasMore={hasMore}
                  selectedIndex={selectedIndex - suggestions.length}
                  onSelect={handleResultSelect}
                  onLoadMore={loadMore}
                  onHover={handleResultHover}
                />
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

        {/* Tracked items indicator */}
        {results.length > 0 && (
          <div className="absolute -bottom-10 left-0 right-0 flex justify-center">
            <button
              onClick={() => {
                if (results.length > 0) {
                  focusOnResults(results.slice(0, 10));
                }
              }}
              className="
                px-4 py-1.5 bg-cyan-500/20 text-cyan-400 text-xs
                rounded-full border border-cyan-500/30
                hover:bg-cyan-500/30 transition-all
                flex items-center gap-2
              "
            >
              <Tag className="w-3 h-3" />
              Focus on {Math.min(results.length, 10)} results in 3D
            </button>
          </div>
        )}
      </div>
    </SearchTo3DProvider>
  );
};

export default EnhancedSearchInterface;
