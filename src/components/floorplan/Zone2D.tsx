/**
 * Zone2D - Individual zone rectangle for the 2D floor plan
 * Displays zone with type-based coloring and occupancy status
 */

import { useMemo } from 'react';
import { Zone, getOccupancyStatus, getOccupancyColor } from '@/lib/types';
import { ZONE_TYPE_COLORS, ZoneLayout } from './FloorPlan2D';

interface Zone2DProps {
  zone: Zone;
  layout: ZoneLayout;
  isSelected: boolean;
  onClick: () => void;
}

export default function Zone2D({ zone, layout, isSelected, onClick }: Zone2DProps) {
  // Get zone color based on zone type
  const zoneColor = useMemo(() => {
    return ZONE_TYPE_COLORS[zone.zoneType] || ZONE_TYPE_COLORS[layout.zoneType] || '#6b7280';
  }, [zone.zoneType, layout.zoneType]);

  // Calculate occupancy status and color
  const occupancyPercent = zone.capacity > 0 ? (zone.currentOccupancy / zone.capacity) * 100 : 0;
  const occupancyStatus = getOccupancyStatus(occupancyPercent);
  const occupancyColor = getOccupancyColor(occupancyStatus);

  // Determine fill opacity based on occupancy
  const fillOpacity = 0.2 + (occupancyPercent / 100) * 0.4;

  // Selected styling
  const strokeColor = isSelected ? '#3b82f6' : zoneColor;
  const strokeWidth = isSelected ? 3 : 1.5;

  // Warning indicator for high occupancy
  const showWarning = occupancyPercent >= 90;

  return (
    <g
      className="zone-block cursor-pointer transition-all duration-200 hover:opacity-90"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ filter: isSelected ? 'url(#glow)' : 'url(#shadow)' }}
    >
      {/* Zone background */}
      <rect
        x={layout.x}
        y={layout.y}
        width={layout.width}
        height={layout.height}
        fill={zoneColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rx="6"
        ry="6"
        className="transition-all duration-200"
      />

      {/* Occupancy indicator bar at bottom */}
      <rect
        x={layout.x + 4}
        y={layout.y + layout.height - 8}
        width={Math.max(0, (layout.width - 8) * (occupancyPercent / 100))}
        height="4"
        fill={occupancyColor}
        rx="2"
      />

      {/* Occupancy bar background */}
      <rect
        x={layout.x + 4}
        y={layout.y + layout.height - 8}
        width={layout.width - 8}
        height="4"
        fill="#374151"
        fillOpacity="0.5"
        rx="2"
        style={{ pointerEvents: 'none' }}
      />

      {/* Occupancy filled portion (on top) */}
      <rect
        x={layout.x + 4}
        y={layout.y + layout.height - 8}
        width={Math.max(0, (layout.width - 8) * (occupancyPercent / 100))}
        height="4"
        fill={occupancyColor}
        rx="2"
        style={{ pointerEvents: 'none' }}
      />

      {/* Zone name */}
      <text
        x={layout.x + layout.width / 2}
        y={layout.y + layout.height / 2 - 8}
        textAnchor="middle"
        className="fill-white font-semibold"
        style={{ fontSize: '11px', fontWeight: 600, pointerEvents: 'none' }}
      >
        {zone.zoneName}
      </text>

      {/* Zone type label */}
      <text
        x={layout.x + layout.width / 2}
        y={layout.y + layout.height / 2 + 6}
        textAnchor="middle"
        className="fill-gray-300"
        style={{ fontSize: '9px', pointerEvents: 'none' }}
      >
        {zone.zoneType.toUpperCase()}
      </text>

      {/* Occupancy count */}
      <text
        x={layout.x + layout.width / 2}
        y={layout.y + layout.height / 2 + 20}
        textAnchor="middle"
        fill={occupancyColor}
        style={{ fontSize: '10px', fontWeight: 500, pointerEvents: 'none' }}
      >
        {zone.currentOccupancy}/{zone.capacity}
      </text>

      {/* Warning indicator for high occupancy */}
      {showWarning && (
        <g>
          {/* Pulsing warning circle */}
          <circle
            cx={layout.x + layout.width - 12}
            cy={layout.y + 12}
            r="6"
            fill="#ef4444"
            className="animate-pulse"
          />
          {/* Exclamation mark */}
          <text
            x={layout.x + layout.width - 12}
            y={layout.y + 15}
            textAnchor="middle"
            fill="white"
            style={{ fontSize: '8px', fontWeight: 'bold', pointerEvents: 'none' }}
          >
            !
          </text>
        </g>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <rect
          x={layout.x - 2}
          y={layout.y - 2}
          width={layout.width + 4}
          height={layout.height + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="6,3"
          rx="8"
          ry="8"
          className="animate-pulse"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
}
