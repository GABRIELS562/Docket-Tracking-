import { useMemo } from 'react';
import { Wifi, WifiOff, AlertTriangle, Radio } from 'lucide-react';
import type { Zone, Reader, ReaderStatus } from '@/lib/types';
import { getOccupancyStatus, getOccupancyColor } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { ZoneFloorPlanSkeleton } from '@/components/ui';

interface ZoneFloorPlanProps {
  zone: Zone;
  readers: Reader[];
  onReaderClick?: (reader: Reader) => void;
  selectedReaderId?: string | null;
  isLoading?: boolean;
}

/**
 * 2D SVG floor plan of a single zone
 * Shows reader positions and coverage areas
 */
export default function ZoneFloorPlan({
  zone,
  readers,
  onReaderClick,
  selectedReaderId,
  isLoading = false,
}: ZoneFloorPlanProps) {
  // All hooks must be called unconditionally (before any early returns)
  // Calculate reader positions evenly distributed
  const readerPositions = useMemo(() => {
    const count = readers.length;
    if (count === 0) return [];

    // Position readers in a grid within the zone
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    return readers.map((reader, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Calculate position as percentage (10% padding on each side)
      const x = 10 + (col + 0.5) * (80 / cols);
      const y = 15 + (row + 0.5) * (70 / rows);

      return { reader, x, y };
    });
  }, [readers]);

  // Show skeleton while loading - must come AFTER all hooks
  if (isLoading) {
    return <ZoneFloorPlanSkeleton />;
  }

  const status = getOccupancyStatus(zone.occupancyPercentage);
  const statusColor = getOccupancyColor(status);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{zone.zoneName}</h3>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-sm text-gray-400">{zone.occupancyPercentage}% capacity</span>
        </div>
      </div>

      {/* SVG Floor Plan */}
      <div className="relative w-full aspect-[4/3] bg-gray-800/50 rounded-lg overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Zone boundary */}
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            fill="none"
            stroke={statusColor}
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.5"
          />

          {/* Zone fill based on occupancy */}
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            fill={statusColor}
            opacity={0.1 + (zone.occupancyPercentage / 100) * 0.2}
            rx="2"
          />

          {/* Reader coverage areas */}
          {readerPositions.map(({ reader, x, y }) => (
            <circle
              key={`coverage-${reader.readerId}`}
              cx={x}
              cy={y}
              r={reader.status === 'online' ? 15 : 10}
              fill={getReaderColor(reader.status)}
              opacity={reader.status === 'online' ? 0.1 : 0.05}
            />
          ))}

          {/* Reader positions */}
          {readerPositions.map(({ reader, x, y }) => (
            <ReaderMarker
              key={reader.readerId}
              reader={reader}
              x={x}
              y={y}
              isSelected={selectedReaderId === reader.readerId}
              onClick={() => onReaderClick?.(reader)}
            />
          ))}

          {/* Zone label */}
          <text x="50" y="95" textAnchor="middle" className="fill-gray-500 text-[3px]">
            {zone.zoneCode}
          </text>
        </svg>

        {/* Overlay stats */}
        <div className="absolute top-2 left-2 bg-gray-900/80 rounded px-2 py-1">
          <div className="text-lg font-bold text-white">{formatNumber(zone.currentOccupancy)}</div>
          <div className="text-xs text-gray-400">items</div>
        </div>

        <div className="absolute top-2 right-2 bg-gray-900/80 rounded px-2 py-1">
          <div className="text-sm font-medium text-gray-300">
            {readers.filter((r) => r.status === 'online').length}/{readers.length}
          </div>
          <div className="text-xs text-gray-400">readers</div>
        </div>
      </div>

      {/* Reader list */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Readers</h4>
        <div className="space-y-2">
          {readers.map((reader) => (
            <ReaderRow
              key={reader.readerId}
              reader={reader}
              isSelected={selectedReaderId === reader.readerId}
              onClick={() => onReaderClick?.(reader)}
            />
          ))}
          {readers.length === 0 && <p className="text-sm text-gray-500">No readers in this zone</p>}
        </div>
      </div>
    </div>
  );
}

interface ReaderMarkerProps {
  reader: Reader;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
}

function ReaderMarker({ reader, x, y, isSelected, onClick }: ReaderMarkerProps) {
  const color = getReaderColor(reader.status);

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} className="cursor-pointer">
      {/* Selection ring */}
      {isSelected && (
        <circle r="6" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1 1" />
      )}

      {/* Reader icon background */}
      <circle r="4" fill={color} opacity={0.3} />
      <circle r="2.5" fill={color} />

      {/* Pulse animation for online readers */}
      {reader.status === 'online' && (
        <circle r="4" fill="none" stroke={color} strokeWidth="0.3">
          <animate attributeName="r" from="2.5" to="6" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Label */}
      <text y="8" textAnchor="middle" className="fill-white text-[2.5px] font-medium">
        {reader.readerName.split(' - ')[1] || reader.readerId.slice(-3)}
      </text>
    </g>
  );
}

interface ReaderRowProps {
  reader: Reader;
  isSelected: boolean;
  onClick: () => void;
}

function ReaderRow({ reader, isSelected, onClick }: ReaderRowProps) {
  const StatusIcon = getReaderIcon(reader.status);
  const color = getReaderTextColor(reader.status);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
        isSelected
          ? 'bg-blue-900/30 border border-blue-500/50'
          : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 ${color}`} />
        <div className="text-left">
          <p className="text-sm text-white">{reader.readerName}</p>
          <p className="text-xs text-gray-500">{reader.ipAddress}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs ${color}`}>{reader.status}</p>
        {reader.totalReads && (
          <p className="text-xs text-gray-500">{formatNumber(reader.totalReads)} reads</p>
        )}
      </div>
    </button>
  );
}

function getReaderColor(status: ReaderStatus): string {
  switch (status) {
    case 'online':
      return '#22c55e';
    case 'offline':
      return '#6b7280';
    case 'error':
      return '#ef4444';
    case 'connecting':
      return '#f59e0b';
    case 'maintenance':
      return '#f97316';
    default:
      return '#6b7280';
  }
}

function getReaderTextColor(status: ReaderStatus): string {
  switch (status) {
    case 'online':
      return 'text-green-400';
    case 'offline':
      return 'text-gray-400';
    case 'error':
      return 'text-red-400';
    case 'connecting':
      return 'text-yellow-400';
    case 'maintenance':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
}

function getReaderIcon(status: ReaderStatus) {
  switch (status) {
    case 'online':
      return Wifi;
    case 'offline':
      return WifiOff;
    case 'error':
      return AlertTriangle;
    case 'connecting':
    case 'maintenance':
      return Radio;
    default:
      return WifiOff;
  }
}
