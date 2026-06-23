/**
 * ItemDot - Small dot/icon representing an item within a zone
 * Visual indicator for items in the 2D floor plan
 */

import { useMemo } from 'react';

interface ItemDotProps {
  x: number;
  y: number;
  zoneId: number;
  isHighlighted?: boolean;
  status?: 'normal' | 'warning' | 'alert';
  onClick?: () => void;
}

// Color palette for item dots (by zone ID for visual variety)
const DOT_COLORS = [
  '#60a5fa', // blue-400
  '#34d399', // green-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#fbbf24', // amber-400
  '#2dd4bf', // teal-400
];

export default function ItemDot({
  x,
  y,
  zoneId,
  isHighlighted = false,
  status = 'normal',
  onClick,
}: ItemDotProps) {
  // Get dot color based on zone ID
  const dotColor = useMemo(() => {
    return DOT_COLORS[zoneId % DOT_COLORS.length];
  }, [zoneId]);

  // Status-based color override
  const effectiveColor = useMemo(() => {
    switch (status) {
      case 'warning':
        return '#eab308'; // yellow
      case 'alert':
        return '#ef4444'; // red
      default:
        return dotColor;
    }
  }, [status, dotColor]);

  // Size based on highlight state
  const radius = isHighlighted ? 4 : 3;
  const glowRadius = isHighlighted ? 8 : 6;

  return (
    <g
      className={`item-dot ${onClick ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* Glow effect */}
      <circle
        cx={x}
        cy={y}
        r={glowRadius}
        fill={effectiveColor}
        fillOpacity={isHighlighted ? 0.3 : 0.15}
        className="transition-all duration-200"
      />

      {/* Main dot */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={effectiveColor}
        className="transition-all duration-200"
      />

      {/* Highlight ring for selected zone items */}
      {isHighlighted && (
        <circle
          cx={x}
          cy={y}
          r={radius + 2}
          fill="none"
          stroke={effectiveColor}
          strokeWidth="1"
          strokeOpacity="0.6"
          className="animate-pulse"
        />
      )}
    </g>
  );
}

/**
 * ItemCluster - Represents multiple items when there are too many to show individually
 */
interface ItemClusterProps {
  x: number;
  y: number;
  count: number;
  zoneId: number;
  isHighlighted?: boolean;
}

export function ItemCluster({ x, y, count, zoneId, isHighlighted = false }: ItemClusterProps) {
  const dotColor = DOT_COLORS[zoneId % DOT_COLORS.length];

  // Size based on count
  const radius = Math.min(12, 6 + Math.log10(count) * 3);

  return (
    <g className="item-cluster">
      {/* Cluster background */}
      <circle
        cx={x}
        cy={y}
        r={radius + 2}
        fill={dotColor}
        fillOpacity={isHighlighted ? 0.4 : 0.2}
      />

      {/* Cluster circle */}
      <circle cx={x} cy={y} r={radius} fill={dotColor} fillOpacity={0.8} />

      {/* Count text */}
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fill="white"
        style={{ fontSize: '8px', fontWeight: 'bold', pointerEvents: 'none' }}
      >
        {count > 99 ? '99+' : count}
      </text>
    </g>
  );
}
