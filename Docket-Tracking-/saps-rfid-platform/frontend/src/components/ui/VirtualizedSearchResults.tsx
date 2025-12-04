import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Tag, Clock, Navigation, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * VirtualizedSearchResults (Phase 3.3)
 *
 * High-performance virtualized list for search results:
 * - Only renders visible items + buffer
 * - Infinite scroll with on-demand loading
 * - Smooth scrolling with 60 FPS
 * - Memory efficient for 300K+ items
 *
 * Target: Handle thousands of results smoothly
 * Reference: StartHere.md Phase 3.3
 */

// ============================================================================
// Types
// ============================================================================

export interface SearchResultItem {
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

interface VirtualizedSearchResultsProps {
  results: SearchResultItem[];
  totalResults: number;
  isLoading: boolean;
  hasMore: boolean;
  selectedIndex: number;
  onSelect: (result: SearchResultItem) => void;
  onLoadMore: () => void;
  onHover?: (result: SearchResultItem | null) => void;
}

// ============================================================================
// Constants
// ============================================================================

const ITEM_HEIGHT = 72; // Height of each result item in pixels
const BUFFER_SIZE = 5; // Number of items to render outside viewport
const SCROLL_THRESHOLD = 200; // Pixels from bottom to trigger load more

const ZONE_COLORS: Record<string, { color: string; icon: string }> = {
  'receiving': { color: '#3b82f6', icon: '📥' },
  'storage-a': { color: '#10b981', icon: '📦' },
  'storage-b': { color: '#10b981', icon: '📦' },
  'storage-c': { color: '#10b981', icon: '📦' },
  'secure-storage': { color: '#ef4444', icon: '🔒' },
  'storage-d': { color: '#10b981', icon: '📦' },
  'processing': { color: '#f59e0b', icon: '⚙️' },
  'shipping': { color: '#8b5cf6', icon: '📤' },
  'returns': { color: '#ec4899', icon: '↩️' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle }> = {
  'active': { color: '#22c55e', icon: CheckCircle },
  'inactive': { color: '#6b7280', icon: Clock },
  'missing': { color: '#ef4444', icon: AlertTriangle },
  'in-transit': { color: '#f59e0b', icon: Navigation },
};

// ============================================================================
// Main Component
// ============================================================================

const VirtualizedSearchResults = ({
  results,
  totalResults,
  isLoading,
  hasMore,
  selectedIndex,
  onSelect,
  onLoadMore,
  onHover,
}: VirtualizedSearchResultsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      results.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, results.length]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop: newScrollTop, scrollHeight, clientHeight } = containerRef.current;
    setScrollTop(newScrollTop);

    // Check if we need to load more
    if (hasMore && !isLoading && scrollHeight - newScrollTop - clientHeight < SCROLL_THRESHOLD) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex < 0 || !containerRef.current) return;

    const itemTop = selectedIndex * ITEM_HEIGHT;
    const itemBottom = itemTop + ITEM_HEIGHT;
    const { scrollTop: currentScroll, clientHeight } = containerRef.current;

    if (itemTop < currentScroll) {
      containerRef.current.scrollTop = itemTop;
    } else if (itemBottom > currentScroll + clientHeight) {
      containerRef.current.scrollTop = itemBottom - clientHeight;
    }
  }, [selectedIndex]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return results.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [results, visibleRange]);

  // Total height for scroll
  const totalHeight = results.length * ITEM_HEIGHT;

  // Offset for visible items
  const offsetY = visibleRange.startIndex * ITEM_HEIGHT;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase">
          Results ({results.length.toLocaleString()} of {totalResults.toLocaleString()})
        </span>
        <span className="text-xs text-cyan-400">&lt;300ms</span>
      </div>

      {/* Virtualized List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ willChange: 'transform' }}
      >
        {/* Spacer for total height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items container */}
          <div
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((result, index) => {
              const actualIndex = visibleRange.startIndex + index;
              const isSelected = selectedIndex === actualIndex;

              return (
                <ResultItem
                  key={result.id}
                  result={result}
                  isSelected={isSelected}
                  onSelect={() => onSelect(result)}
                  onHover={onHover}
                />
              );
            })}
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-400">Loading more...</span>
          </div>
        )}

        {/* End of results */}
        {!hasMore && results.length > 0 && (
          <div className="py-4 text-center text-xs text-gray-600">
            End of results
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Result Item Component
// ============================================================================

interface ResultItemProps {
  result: SearchResultItem;
  isSelected: boolean;
  onSelect: () => void;
  onHover?: (result: SearchResultItem | null) => void;
}

const ResultItem = ({ result, isSelected, onSelect, onHover }: ResultItemProps) => {
  const zone = ZONE_COLORS[result.zoneId] || { color: '#60a5fa', icon: '📦' };
  const status = STATUS_CONFIG[result.status] || STATUS_CONFIG['active'];
  const StatusIcon = status.icon;

  const priorityColors = {
    low: 'border-gray-500/30',
    medium: 'border-blue-500/30',
    high: 'border-orange-500/30',
    critical: 'border-red-500/30 shadow-red-500/10',
  };

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover?.(result)}
      onMouseLeave={() => onHover?.(null)}
      className={`
        w-full px-4 py-3 flex items-center gap-4
        transition-all text-left group border-l-2
        ${isSelected
          ? 'bg-cyan-500/20 border-l-cyan-400'
          : `hover:bg-white/5 ${priorityColors[result.priority]}`
        }
      `}
      style={{ height: ITEM_HEIGHT }}
    >
      {/* Item icon */}
      <div
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          bg-gradient-to-br from-slate-800 to-slate-900
          border transition-all
          ${isSelected ? 'border-cyan-500/50' : 'border-white/10 group-hover:border-white/20'}
        `}
      >
        <Tag className="w-5 h-5 text-cyan-400" />
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* EPC */}
          <span className="font-mono font-medium text-white text-sm">
            {result.epc.slice(-8).toUpperCase()}
          </span>

          {/* Zone badge */}
          <span
            className="px-2 py-0.5 rounded text-[10px] uppercase font-medium flex items-center gap-1"
            style={{
              backgroundColor: `${zone.color}20`,
              color: zone.color,
            }}
          >
            <span>{zone.icon}</span>
            {result.zone.replace('-', ' ')}
          </span>

          {/* Status badge */}
          <span
            className="px-2 py-0.5 rounded text-[10px] uppercase font-medium flex items-center gap-1"
            style={{
              backgroundColor: `${status.color}20`,
              color: status.color,
            }}
          >
            <StatusIcon className="w-3 h-3" />
            {result.status}
          </span>
        </div>

        {/* Last seen */}
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Last seen: {new Date(result.lastSeen).toLocaleString()}
          {result.rssi && (
            <>
              <span className="text-gray-700">|</span>
              <span>RSSI: {result.rssi} dBm</span>
            </>
          )}
        </div>
      </div>

      {/* Action hint */}
      <div
        className={`
          transition-all flex items-center gap-1 text-xs
          ${isSelected ? 'opacity-100 text-cyan-400' : 'opacity-0 group-hover:opacity-100 text-gray-400'}
        `}
      >
        <Navigation className="w-4 h-4" />
        <span>Fly to</span>
      </div>

      {/* Priority indicator for critical */}
      {result.priority === 'critical' && (
        <div className="absolute top-2 right-2">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        </div>
      )}
    </button>
  );
};

export default VirtualizedSearchResults;
