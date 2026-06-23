/**
 * SVG-based 2D Floor Plan View
 * Primary navigation interface for the RFID Docket Tracking system
 */

import { useMemo, useCallback } from 'react';
import Zone2D from './Zone2D';
import ItemDot from './ItemDot';
import ViewToggle from './ViewToggle';
import { Zone, Item } from '@/lib/types';
import { Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useZoneStore } from '@/store/useZoneStore';

// U-shaped lab layout dimensions (80m x 60m scaled to viewBox)
const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 600;

// Zone type colors as specified in requirements
export const ZONE_TYPE_COLORS: Record<string, string> = {
  storage: '#3b82f6', // blue
  examination: '#22c55e', // green
  processing: '#22c55e', // green (alias for examination)
  transit: '#eab308', // yellow
  corridor: '#eab308', // yellow (alias for transit)
  archive: '#6b7280', // gray
  office: '#a855f7', // purple
  entrance: '#f97316', // orange
  exit: '#f97316', // orange (alias for entrance)
  restricted: '#ef4444', // red
};

// Zone layout positions for U-shaped forensic lab
// Based on ZONE_2D_POSITIONS but using new SVG coordinate system
export interface ZoneLayout {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zoneType: string;
}

// FSL-PAROW inspired U-shaped layout (80m x 60m)
const ZONE_LAYOUTS: ZoneLayout[] = [
  // LEFT WING - Office/Administration
  { id: 1, x: 40, y: 200, width: 120, height: 200, zoneType: 'office' },

  // TOP ROW - Examination Rooms (across the top of the U)
  { id: 2, x: 200, y: 60, width: 100, height: 80, zoneType: 'examination' },
  { id: 3, x: 320, y: 60, width: 100, height: 80, zoneType: 'examination' },
  { id: 4, x: 440, y: 60, width: 100, height: 80, zoneType: 'examination' },
  { id: 5, x: 560, y: 60, width: 100, height: 80, zoneType: 'examination' },

  // CENTER - Main EIMS / Processing Area
  { id: 6, x: 280, y: 200, width: 240, height: 160, zoneType: 'processing' },

  // RIGHT WING - Admin/Support
  { id: 7, x: 640, y: 160, width: 120, height: 100, zoneType: 'office' },
  { id: 8, x: 640, y: 280, width: 120, height: 100, zoneType: 'office' },

  // TRANSIT/CORRIDOR - Central spine
  { id: 9, x: 200, y: 200, width: 60, height: 160, zoneType: 'transit' },

  // BOTTOM - Archive/Storage
  { id: 10, x: 280, y: 420, width: 160, height: 100, zoneType: 'archive' },

  // ENTRANCE
  { id: 11, x: 360, y: 540, width: 80, height: 50, zoneType: 'entrance' },

  // STORAGE - Right side
  { id: 12, x: 640, y: 420, width: 120, height: 100, zoneType: 'storage' },

  // RESTRICTED ACCESS - Bottom left
  { id: 13, x: 40, y: 420, width: 120, height: 100, zoneType: 'restricted' },

  // LONG-TERM STORAGE - Far right storage wing
  { id: 14, x: 540, y: 200, width: 80, height: 160, zoneType: 'storage' },
];

interface FloorPlan2DProps {
  zones: Zone[];
  dockets?: Docket[];
  items?: Item[];
  onZoneClick?: (zoneId: number) => void;
  showViewToggle?: boolean;
}

export default function FloorPlan2D({
  zones,
  dockets = [],
  items = [],
  onZoneClick,
  showViewToggle = true,
}: FloorPlan2DProps) {
  const { selectedZoneId, setSelectedZone } = useStore();
  const { selectZone } = useZoneStore();

  // Map zone data to layouts
  const zoneDataMap = useMemo(() => {
    const map = new Map<number, Zone>();
    zones.forEach((zone) => map.set(zone.zoneId, zone));
    return map;
  }, [zones]);

  // Calculate item positions within zones
  const itemsByZone = useMemo(() => {
    const map = new Map<number, Array<{ id: string; x: number; y: number }>>();

    // Process dockets (legacy format)
    dockets.forEach((docket) => {
      if (!docket.currentZone) return;
      const zoneId = docket.currentZone.id;
      const layout = ZONE_LAYOUTS.find((l) => l.id === zoneId);
      if (!layout) return;

      if (!map.has(zoneId)) {
        map.set(zoneId, []);
      }

      // Distribute items within zone bounds with some padding
      const padding = 10;
      const items = map.get(zoneId)!;
      const itemIndex = items.length;

      // Grid-based positioning within zone
      const cols = Math.max(1, Math.floor((layout.width - padding * 2) / 8));
      const row = Math.floor(itemIndex / cols);
      const col = itemIndex % cols;

      const x = layout.x + padding + col * 8 + Math.random() * 4;
      const y = layout.y + padding + row * 8 + Math.random() * 4;

      // Use labNumber as the unique identifier for dockets
      items.push({ id: docket.labNumber, x, y });
    });

    // Process items (new format)
    items.forEach((item) => {
      if (!item.currentZone) return;
      const zoneId = item.currentZone.id;
      const layout = ZONE_LAYOUTS.find((l) => l.id === zoneId);
      if (!layout) return;

      if (!map.has(zoneId)) {
        map.set(zoneId, []);
      }

      const padding = 10;
      const zoneItems = map.get(zoneId)!;
      const itemIndex = zoneItems.length;

      const cols = Math.max(1, Math.floor((layout.width - padding * 2) / 8));
      const row = Math.floor(itemIndex / cols);
      const col = itemIndex % cols;

      const x = layout.x + padding + col * 8 + Math.random() * 4;
      const y = layout.y + padding + row * 8 + Math.random() * 4;

      zoneItems.push({ id: item.itemId, x, y });
    });

    return map;
  }, [dockets, items]);

  const handleZoneClick = useCallback(
    (zoneId: number) => {
      setSelectedZone(zoneId);
      selectZone(zoneId);
      onZoneClick?.(zoneId);
    },
    [setSelectedZone, selectZone, onZoneClick]
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedZone(null);
    selectZone(null);
  }, [setSelectedZone, selectZone]);

  // Calculate totals for summary
  const totalItems = useMemo(() => {
    return zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
  }, [zones]);

  return (
    <div className="relative w-full h-full bg-gray-900 flex flex-col">
      {/* View Toggle (if enabled) */}
      {showViewToggle && (
        <div className="absolute top-4 right-4 z-10">
          <ViewToggle />
        </div>
      )}

      {/* Summary Stats */}
      <div className="absolute top-4 left-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
        <h2 className="text-lg font-bold text-white">Floor Plan View</h2>
        <p className="text-sm text-gray-400">
          {totalItems.toLocaleString()} items across {zones.length} zones
        </p>
      </div>

      {/* SVG Floor Plan */}
      <div className="flex-1 flex items-center justify-center p-4">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="max-w-full max-h-full drop-shadow-2xl"
          style={{ aspectRatio: `${VIEWBOX_WIDTH}/${VIEWBOX_HEIGHT}` }}
          onClick={handleBackgroundClick}
        >
          {/* Definitions */}
          <defs>
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2937" strokeWidth="0.5" />
            </pattern>

            {/* Glow filter for selected zones */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Shadow filter */}
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#111827" />
          <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#grid)" />

          {/* Building outline */}
          <g className="building-outline">
            {/* U-shaped building outline */}
            <path
              d={`
                M 30 150
                L 30 50
                L 670 50
                L 670 150
                L 770 150
                L 770 530
                L 670 530
                L 670 400
                L 180 400
                L 180 530
                L 30 530
                L 30 150
                Z
              `}
              fill="none"
              stroke="#374151"
              strokeWidth="3"
            />

            {/* Center courtyard (negative space in U) */}
            <rect
              x="180"
              y="150"
              width="490"
              height="250"
              fill="none"
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="8,4"
            />
          </g>

          {/* Title */}
          <text
            x={VIEWBOX_WIDTH / 2}
            y="30"
            textAnchor="middle"
            className="fill-amber-400 text-sm font-bold"
            style={{ fontSize: '14px', fontWeight: 'bold' }}
          >
            FSL-PAROW Forensic Lab - Floor Plan
          </text>

          {/* Zone blocks */}
          <g className="zones">
            {ZONE_LAYOUTS.map((layout) => {
              const zoneData = zoneDataMap.get(layout.id);
              if (!zoneData) return null;

              return (
                <Zone2D
                  key={layout.id}
                  zone={zoneData}
                  layout={layout}
                  isSelected={selectedZoneId === layout.id}
                  onClick={() => handleZoneClick(layout.id)}
                />
              );
            })}
          </g>

          {/* Item dots */}
          <g className="items">
            {Array.from(itemsByZone.entries()).map(([zoneId, zoneItems]) =>
              zoneItems.slice(0, 50).map(
                (
                  item // Limit to 50 visible items per zone
                ) => (
                  <ItemDot
                    key={item.id}
                    x={item.x}
                    y={item.y}
                    zoneId={zoneId}
                    isHighlighted={selectedZoneId === zoneId}
                  />
                )
              )
            )}
          </g>

          {/* Connection lines from entrance */}
          <g className="connections" opacity="0.3">
            <line
              x1="400"
              y1="540"
              x2="400"
              y2="280"
              stroke="#4b5563"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <line
              x1="400"
              y1="280"
              x2="230"
              y2="280"
              stroke="#4b5563"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <line
              x1="400"
              y1="280"
              x2="700"
              y2="280"
              stroke="#4b5563"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          </g>

          {/* Legend */}
          <g className="legend" transform="translate(20, 560)">
            {Object.entries(ZONE_TYPE_COLORS)
              .slice(0, 6)
              .map(([type, color], index) => (
                <g key={type} transform={`translate(${index * 120}, 0)`}>
                  <rect x="0" y="0" width="12" height="12" fill={color} rx="2" />
                  <text x="18" y="10" className="fill-gray-400" style={{ fontSize: '10px' }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </text>
                </g>
              ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
