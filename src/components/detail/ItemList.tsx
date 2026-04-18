import { useState } from 'react';
import { Package, MapPin, Clock, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { Item, ItemStatus } from '@/lib/types';
import { formatNumber, formatRelativeTimeShort } from '@/lib/utils';

interface ItemListProps {
  items: Item[];
  total: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onItemClick: (item: Item) => void;
  selectedItemId?: string | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Paginated item list for zone detail view
 * Designed to handle zones with 100K+ items through pagination
 */
export default function ItemList({
  items,
  total,
  currentPage,
  totalPages,
  isLoading,
  onPageChange,
  onItemClick,
  selectedItemId,
  searchQuery = '',
  onSearchChange,
}: ItemListProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange?.('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header with search */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Items in Zone
          </h3>
          <span className="text-sm text-gray-400">{formatNumber(total)} total</span>
        </div>

        {/* Search bar */}
        {onSearchChange && (
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Package className="w-8 h-8 mb-2" />
            <p>No items found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {items.map((item) => (
              <ItemRow
                key={item.itemId}
                item={item}
                isSelected={selectedItemId === item.itemId}
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

interface ItemRowProps {
  item: Item;
  isSelected: boolean;
  onClick: () => void;
}

function ItemRow({ item, isSelected, onClick }: ItemRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left transition-colors hover:bg-gray-800/50 ${
        isSelected ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white truncate">{item.itemNumber}</span>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-xs text-gray-400 truncate mt-1">{item.referenceId}</p>
          <p className="text-xs text-gray-500 truncate">{item.description}</p>
        </div>
        <div className="flex flex-col items-end text-xs text-gray-500">
          {item.currentZone && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.currentZone.name}
            </span>
          )}
          {item.lastSeenAt && (
            <span className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTimeShort(item.lastSeenAt)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  // Exhaustive status config - TypeScript will error if a status is missing
  const config: Record<ItemStatus, { label: string; color: string }> = {
    registered: { label: 'Active', color: 'bg-green-500/20 text-green-400' },
    in_transit: { label: 'Transit', color: 'bg-yellow-500/20 text-yellow-400' },
    in_processing: { label: 'Processing', color: 'bg-blue-500/20 text-blue-400' },
    archived: { label: 'Archived', color: 'bg-gray-500/20 text-gray-400' },
    disposed: { label: 'Disposed', color: 'bg-red-500/20 text-red-400' },
    missing: { label: 'Missing', color: 'bg-red-500/30 text-red-300 font-bold' },
  };

  const { label, color } = config[status];

  return <span className={`px-1.5 py-0.5 rounded text-xs ${color}`}>{label}</span>;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between p-3 border-t border-gray-800 bg-gray-900/50">
      <span className="text-xs text-gray-500">
        Page {currentPage} of {formatNumber(totalPages)}
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers(currentPage, totalPages).map((page, i) =>
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-600">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`px-2 py-1 rounded text-sm ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Generate page numbers to display
 */
function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];

  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
}
