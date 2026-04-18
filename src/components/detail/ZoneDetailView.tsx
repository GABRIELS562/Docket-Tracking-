import { useState, useCallback } from 'react';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import ZoneFloorPlan from './ZoneFloorPlan';
import ItemList from './ItemList';
import type { Zone, Item, Reader } from '@/lib/types';
import { useZoneItems } from '@/hooks/useItems';
import { useZoneReaders } from '@/hooks/useReaders';
import { useItemStore } from '@/store/useItemStore';
import { formatNumber } from '@/lib/utils';

interface ZoneDetailViewProps {
  zone: Zone;
  onBack: () => void;
  onItemSelect?: (item: Item) => void;
}

/**
 * 2D Zone Detail View
 * Shows zone floor plan with readers + paginated item list
 */
export default function ZoneDetailView({ zone, onBack, onItemSelect }: ZoneDetailViewProps) {
  const [selectedReaderId, setSelectedReaderId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // All hooks must be called unconditionally (before any early returns)
  // Get items for this zone with pagination (pass null if no zone)
  const { items, total, totalPages, isLoading } = useZoneItems(zone?.zoneId ?? null);
  const { currentPage, setPage, searchQuery, setSearchQuery } = useItemStore();

  // Get readers in this zone
  const { readers } = useZoneReaders(zone?.zoneId ?? null);

  const handlePageChange = useCallback(
    (page: number) => {
      setPage(page);
    },
    [setPage]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setPage(1); // Reset to first page on search
    },
    [setSearchQuery, setPage]
  );

  const handleReaderClick = useCallback((reader: Reader) => {
    setSelectedReaderId((prev) => (prev === reader.readerId ? null : reader.readerId));
  }, []);

  const handleItemClick = useCallback(
    (item: Item) => {
      onItemSelect?.(item);
    },
    [onItemSelect]
  );

  // Null safety check - must come AFTER all hooks
  if (!zone) {
    return (
      <div className="absolute inset-0 bg-gray-950 z-40 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">Zone not found</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-950 z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{zone.zoneName}</h1>
            <p className="text-sm text-gray-400">
              {formatNumber(zone.currentOccupancy)} items • {zone.occupancyPercentage}% capacity •{' '}
              {readers.length} readers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Floor Plan */}
        <div
          className={`${
            isExpanded ? 'hidden' : 'w-1/2'
          } p-4 border-r border-gray-800 overflow-y-auto`}
        >
          <ZoneFloorPlan
            zone={zone}
            readers={readers}
            onReaderClick={handleReaderClick}
            selectedReaderId={selectedReaderId}
          />

          {/* Zone stats */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatCard
              label="Total Items"
              value={formatNumber(zone.currentOccupancy)}
              subValue={`of ${formatNumber(zone.capacity)} capacity`}
            />
            <StatCard
              label="Readers Online"
              value={`${readers.filter((r) => r.status === 'online').length}`}
              subValue={`of ${readers.length} total`}
            />
          </div>

          {/* Recent activity placeholder */}
          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Activity</h4>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Item movement tracking available in live mode</p>
              <p>• Real-time updates via WebSocket</p>
            </div>
          </div>
        </div>

        {/* Right: Item List */}
        <div className={`${isExpanded ? 'w-full' : 'w-1/2'} p-4 overflow-hidden`}>
          <ItemList
            items={items}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onItemClick={handleItemClick}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
}

function StatCard({ label, value, subValue }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}
