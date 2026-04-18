import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Package, MapPin, ArrowRight } from 'lucide-react';
import { useItemSearch } from '@/hooks/useItems';
import type { ItemSummary } from '@/lib/types';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, total, isSearching, search, clearSearch } = useItemSearch();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
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

  const handleClose = useCallback(() => {
    setQuery('');
    clearSearch();
    onClose();
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Search modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
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
            <button onClick={() => setQuery('')} className="p-1 text-gray-500 hover:text-gray-300">
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

function SearchResult({ item, onItemClick, onZoneClick }: SearchResultProps) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
      <button onClick={onItemClick} className="flex-1 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-mono text-white">{item.itemNumber}</p>
            <p className="text-sm text-gray-400">{item.referenceId}</p>
          </div>
        </div>
      </button>

      {item.currentZoneName && onZoneClick && (
        <button
          onClick={onZoneClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span>{item.currentZoneName}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
