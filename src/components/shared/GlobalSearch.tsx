import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Package, MapPin, ArrowRight } from 'lucide-react';
import { useItemSearch } from '@/hooks/useItems';
import type { ItemSummary } from '@/lib/types';

/**
 * UI POLISH - GlobalSearch
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Motion: CSS animations for enter/exit (fade-in-scale, fade-out-scale)
 * 2. Shadows: Layered modal shadow
 * 3. Hit Areas: Clear button and result items have 44px touch targets
 * 4. Transition Scope: specific properties only
 * 5. Concentric Radius: Modal rounded-xl (12px), inner elements rounded-lg (8px)
 */

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onItemSelect?: (item: ItemSummary) => void;
  onZoneNavigate?: (zoneName: string) => void;
}

/**
 * Global search overlay for finding items across all zones
 * Uses server-side search for scalability
 */
export default function GlobalSearch({
  isOpen,
  onClose,
  onItemSelect,
  onZoneNavigate,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, total, isSearching, search, clearSearch } = useItemSearch();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setIsClosing(false);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search, clearSearch]);

  // Handle close with exit animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for exit animation (150ms) before actually closing
    setTimeout(() => {
      setQuery('');
      clearSearch();
      onClose();
      setIsClosing(false);
    }, 150);
  }, [clearSearch, onClose]);

  const handleItemClick = useCallback(
    (item: ItemSummary) => {
      onItemSelect?.(item);
      handleClose();
    },
    [onItemSelect, handleClose]
  );

  const handleZoneClick = useCallback(
    (zoneName: string) => {
      onZoneNavigate?.(zoneName);
      handleClose();
    },
    [onZoneNavigate, handleClose]
  );

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop with fade animation */}
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-sm
          ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}
        `}
        onClick={handleClose}
      />

      {/* Search modal with scale animation and layered shadow */}
      <div
        className={`
          relative w-full max-w-2xl mx-4 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden
          ${isClosing ? 'animate-fade-out-scale' : 'animate-fade-in-scale'}
        `}
        style={{
          // Layered modal shadow
          boxShadow: `
            0 4px 8px 0 rgba(0, 0, 0, 0.4),
            0 16px 32px -8px rgba(0, 0, 0, 0.3),
            0 32px 64px -16px rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items by number, reference, or description..."
            className="flex-1 px-4 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
          />
          {query && (
            // Clear button with 44px hit area
            <button
              onClick={() => setQuery('')}
              className="
                p-2 min-w-[44px] min-h-[44px]
                flex items-center justify-center
                text-gray-500 hover:text-gray-300 rounded-lg
                transition-[color,background-color,transform] duration-150 ease-out
                hover:bg-gray-800
                active:scale-[0.96]
              "
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : query.length < 2 ? (
            <div className="py-12 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>Type at least 2 characters to search</p>
              <p className="text-sm mt-1">Search by item number, reference ID, or description</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No items found for "{query}"</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-sm text-gray-500 bg-gray-800/50">
                {total} results found
              </div>
              <div className="divide-y divide-gray-800">
                {results.map((item) => (
                  <SearchResult
                    key={item.itemId}
                    item={item}
                    onItemClick={() => handleItemClick(item)}
                    onZoneClick={
                      item.currentZoneName
                        ? () => handleZoneClick(item.currentZoneName!)
                        : undefined
                    }
                  />
                ))}
              </div>
              {total > results.length && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center bg-gray-800/30">
                  Showing {results.length} of {total} results
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500 flex items-center justify-between">
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">ESC</kbd> to close
          </span>
          <span>Search across all zones</span>
        </div>
      </div>
    </div>
  );
}

interface SearchResultProps {
  item: ItemSummary;
  onItemClick: () => void;
  onZoneClick?: () => void;
}

/**
 * SearchResult - Individual result item
 *
 * Polish: 44px hit areas, specific transition properties
 */
function SearchResult({ item, onItemClick, onZoneClick }: SearchResultProps) {
  return (
    <div
      className="
        flex items-center justify-between p-4
        hover:bg-gray-800/50
        transition-[background-color] duration-150 ease-out
      "
    >
      {/* Item click area with minimum 44px height */}
      <button
        onClick={onItemClick}
        className="
          flex-1 text-left min-h-[44px]
          flex items-center
          rounded-lg
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
        "
      >
        <div className="flex items-center gap-3">
          {/* Icon container - concentric radius (outer p-4, this is p-2, so rounded-lg is appropriate) */}
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            {/* tabular-nums for item numbers */}
            <p className="font-mono text-white tabular-nums">{item.itemNumber}</p>
            <p className="text-sm text-gray-400">{item.referenceId}</p>
          </div>
        </div>
      </button>

      {item.currentZoneName && onZoneClick && (
        // Zone navigation button with 44px hit area
        <button
          onClick={onZoneClick}
          className="
            flex items-center gap-2 px-3 py-2 min-h-[44px]
            text-sm text-gray-400 rounded-lg
            hover:text-white hover:bg-gray-700
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            transition-[color,background-color,transform] duration-150 ease-out
            active:scale-[0.96]
          "
        >
          <MapPin className="w-4 h-4" />
          <span>{item.currentZoneName}</span>
          {/* Arrow icon with optical alignment (slight right shift) */}
          <ArrowRight className="w-4 h-4 translate-x-[0.5px]" />
        </button>
      )}
    </div>
  );
}
