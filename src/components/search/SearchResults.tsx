import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Clock, AlertCircle, Loader2 } from 'lucide-react';
import type { ItemSummary } from '@/lib/types';
import { formatRelativeTimeShort } from '@/lib/utils';

interface SearchResultsProps {
  results: ItemSummary[];
  total: number;
  isSearching: boolean;
  query: string;
  onSelect: (item: ItemSummary) => void;
  highlightedIndex: number;
}

/**
 * Dropdown search results component with keyboard navigation support
 */
const SearchResults = memo(function SearchResults({
  results,
  total,
  isSearching,
  query,
  onSelect,
  highlightedIndex,
}: SearchResultsProps) {
  // Minimum query length
  if (query.length < 2) {
    return (
      <div className="py-8 text-center">
        <Package className="w-10 h-10 mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400 text-sm">Type at least 2 characters to search</p>
        <p className="text-gray-500 text-xs mt-1">
          Search by item number, reference, or description
        </p>
      </div>
    );
  }

  // Loading state
  if (isSearching) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-3 text-blue-400 animate-spin" />
        <p className="text-gray-400 text-sm">Searching across all zones...</p>
      </div>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400 text-sm">No dockets found for "{query}"</p>
        <p className="text-gray-500 text-xs mt-1">Try searching with a different term</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800/50">
      {/* Results header */}
      <div className="px-4 py-2 bg-gray-800/30 text-xs text-gray-500 flex justify-between items-center">
        <span>
          {total} result{total !== 1 ? 's' : ''} found
        </span>
        <span>Press Enter to locate</span>
      </div>

      {/* Results list */}
      <AnimatePresence mode="popLayout">
        {results.slice(0, 8).map((item, index) => (
          <motion.div
            key={item.itemId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, delay: index * 0.03 }}
          >
            <SearchResultItem
              item={item}
              isHighlighted={index === highlightedIndex}
              onSelect={() => onSelect(item)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* More results indicator */}
      {total > 8 && (
        <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-800/20">
          Showing 8 of {total} results - refine your search for better results
        </div>
      )}
    </div>
  );
});

export default SearchResults;

interface SearchResultItemProps {
  item: ItemSummary;
  isHighlighted: boolean;
  onSelect: () => void;
}

function SearchResultItem({ item, isHighlighted, onSelect }: SearchResultItemProps) {
  const statusColors: Record<string, string> = {
    registered: 'bg-green-500/20 text-green-400 border-green-500/30',
    in_transit: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    in_processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    disposed: 'bg-red-500/20 text-red-400 border-red-500/30',
    missing: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full px-4 py-3 flex items-center gap-4 transition-all text-left group ${
        isHighlighted
          ? 'bg-blue-500/20 border-l-2 border-blue-400'
          : 'hover:bg-gray-800/50 border-l-2 border-transparent'
      }`}
    >
      {/* Icon */}
      <div
        className={`p-2.5 rounded-lg transition-colors ${
          isHighlighted ? 'bg-blue-500/30' : 'bg-gray-800 group-hover:bg-gray-700'
        }`}
      >
        <Package className={`w-5 h-5 ${isHighlighted ? 'text-blue-300' : 'text-blue-400'}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white truncate">{item.itemNumber}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-xs border ${statusColors[item.status] || statusColors.registered}`}
          >
            {item.status.replace('_', ' ')}
          </span>
        </div>
        <div className="text-sm text-gray-400 truncate">{item.referenceId}</div>
      </div>

      {/* Location */}
      <div className="text-right shrink-0">
        {item.currentZoneName ? (
          <div className="flex items-center gap-1.5 text-blue-400">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{item.currentZoneName}</span>
          </div>
        ) : (
          <span className="text-sm text-red-400">Location unknown</span>
        )}
        {item.lastSeenAt && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 justify-end">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTimeShort(item.lastSeenAt)}</span>
          </div>
        )}
      </div>

      {/* Locate indicator */}
      {isHighlighted && item.currentZoneName && (
        <div className="shrink-0 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
          Locate
        </div>
      )}
    </button>
  );
}
