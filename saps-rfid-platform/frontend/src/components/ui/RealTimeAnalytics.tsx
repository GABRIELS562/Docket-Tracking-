import React, { useState, useEffect, useRef } from 'react';
import { Activity, Package, MapPin, Clock, TrendingUp, AlertTriangle, Zap, Wifi } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';

/**
 * Real-Time Analytics Dashboard Panel
 *
 * Floating analytics panel showing:
 * - Live item count and tracking stats
 * - Zone utilization metrics
 * - Recent activity feed
 * - System health indicators
 * - Movement trends
 *
 * Designed to impress clients with real-time data visualization
 */

interface ActivityEvent {
  id: string;
  type: 'arrival' | 'departure' | 'movement' | 'alert';
  message: string;
  zone: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Zone colors for consistent styling
const ZONE_COLORS: Record<string, string> = {
  'receiving': '#3b82f6',
  'storage-a': '#10b981',
  'storage-b': '#10b981',
  'storage-c': '#10b981',
  'secure-storage': '#ef4444',
  'storage-d': '#10b981',
  'processing': '#f59e0b',
  'shipping': '#8b5cf6',
  'returns': '#ec4899',
};

const RealTimeAnalytics = () => {
  // Use individual selectors to avoid re-renders when unrelated state changes
  const items = useSceneStore(useShallow((s) => s.items));
  const visibleItemCount = useSceneStore((s) => s.visibleItemCount);
  const fps = useSceneStore((s) => s.fps);

  const [isExpanded, setIsExpanded] = useState(true);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    activeZones: 0,
    avgItemsPerZone: 0,
    busiestZone: '',
    busiestZoneCount: 0,
    zoneDistribution: new Map<string, number>(),
  });

  // Use ref for items to avoid recreating the effect
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Calculate metrics on interval instead of on every items change
  useEffect(() => {
    const calculateMetrics = () => {
      const currentItems = itemsRef.current;
      const zoneDistribution = new Map<string, number>();
      currentItems.forEach((item) => {
        const count = zoneDistribution.get(item.zone) || 0;
        zoneDistribution.set(item.zone, count + 1);
      });

      const totalItems = currentItems.length;
      const activeZones = zoneDistribution.size;
      const avgItemsPerZone = activeZones > 0 ? Math.round(totalItems / activeZones) : 0;

      // Find busiest zone
      let busiestZone = '';
      let maxItems = 0;
      zoneDistribution.forEach((count, zone) => {
        if (count > maxItems) {
          maxItems = count;
          busiestZone = zone;
        }
      });

      setMetrics({
        totalItems,
        activeZones,
        avgItemsPerZone,
        busiestZone: busiestZone.replace('-', ' '),
        busiestZoneCount: maxItems,
        zoneDistribution,
      });
    };

    calculateMetrics();
    const interval = setInterval(calculateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Simulate activity feed updates
  useEffect(() => {
    const generateEvent = (): ActivityEvent => {
      const zones = Object.keys(ZONE_COLORS);
      const types: ActivityEvent['type'][] = ['arrival', 'departure', 'movement', 'alert'];
      const type = types[Math.floor(Math.random() * types.length)];
      const zone = zones[Math.floor(Math.random() * zones.length)];

      const messages: Record<ActivityEvent['type'], string[]> = {
        arrival: ['New item registered', 'Item checked in', 'Incoming shipment'],
        departure: ['Item dispatched', 'Item transferred out', 'Outgoing shipment'],
        movement: ['Item relocated', 'Zone transfer detected', 'Position updated'],
        alert: ['Low signal strength', 'Unusual movement', 'Capacity warning'],
      };

      return {
        id: `event-${Date.now()}-${Math.random()}`,
        type,
        message: messages[type][Math.floor(Math.random() * messages[type].length)],
        zone,
        timestamp: new Date(),
        priority: type === 'alert' ? 'high' : 'medium',
      };
    };

    // Initial events
    setActivityFeed(Array.from({ length: 5 }, generateEvent));

    // Add new events periodically
    const interval = setInterval(() => {
      setActivityFeed((prev) => [generateEvent(), ...prev.slice(0, 9)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const eventIcons: Record<ActivityEvent['type'], React.ReactNode> = {
    arrival: <Package className="w-3 h-3 text-green-400" />,
    departure: <TrendingUp className="w-3 h-3 text-blue-400" />,
    movement: <MapPin className="w-3 h-3 text-yellow-400" />,
    alert: <AlertTriangle className="w-3 h-3 text-red-400" />,
  };

  return (
    <div
      className={`
        fixed right-4 top-24 z-40 transition-all duration-300
        ${isExpanded ? 'w-72' : 'w-16'}
      `}
    >
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-white/10 flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            {isExpanded && (
              <span className="text-white font-medium text-sm">Live Analytics</span>
            )}
          </div>
          {isExpanded && (
            <div className="flex items-center gap-2">
              <Wifi className={`w-4 h-4 ${fps >= 30 ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-xs text-gray-400">{fps} FPS</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Key Metrics */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <MetricCard
                icon={<Package className="w-4 h-4" />}
                label="Total Items"
                value={metrics.totalItems}
                trend="+12"
                trendUp
              />
              <MetricCard
                icon={<MapPin className="w-4 h-4" />}
                label="Active Zones"
                value={metrics.activeZones}
                subValue="/9"
              />
              <MetricCard
                icon={<Zap className="w-4 h-4" />}
                label="Visible"
                value={visibleItemCount}
                subValue={`/${metrics.totalItems}`}
              />
              <MetricCard
                icon={<Clock className="w-4 h-4" />}
                label="Avg/Zone"
                value={metrics.avgItemsPerZone}
              />
            </div>

            {/* Busiest Zone */}
            {metrics.busiestZone && (
              <div className="px-4 pb-3">
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-3 border border-cyan-500/20">
                  <div className="text-xs text-gray-400 mb-1">Busiest Zone</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium capitalize">{metrics.busiestZone}</span>
                    <span className="text-cyan-400 font-bold">{metrics.busiestZoneCount} items</span>
                  </div>
                </div>
              </div>
            )}

            {/* Zone Distribution */}
            <div className="px-4 pb-3">
              <div className="text-xs text-gray-500 uppercase mb-2">Zone Distribution</div>
              <div className="space-y-1.5">
                {Array.from(metrics.zoneDistribution.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([zone, count]) => (
                    <ZoneBar
                      key={zone}
                      zone={zone}
                      count={count}
                      total={metrics.totalItems}
                      color={ZONE_COLORS[zone] || '#6b7280'}
                    />
                  ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="px-4 pb-4">
              <div className="text-xs text-gray-500 uppercase mb-2 flex items-center justify-between">
                <span>Live Activity</span>
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activityFeed.map((event, index) => (
                  <ActivityItem
                    key={event.id}
                    event={event}
                    icon={eventIcons[event.type]}
                    isNew={index === 0}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Metric card component
 */
const MetricCard = ({
  icon,
  label,
  value,
  subValue,
  trend,
  trendUp,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
}) => (
  <div className="bg-white/5 rounded-xl p-3">
    <div className="flex items-center gap-2 text-gray-400 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold text-white">{value}</span>
      {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
      {trend && (
        <span className={`text-xs ml-auto ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          {trend}
        </span>
      )}
    </div>
  </div>
);

/**
 * Zone distribution bar
 */
const ZoneBar = ({
  zone,
  count,
  total,
  color,
}: {
  zone: string;
  count: number;
  total: number;
  color: string;
}) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 text-xs text-gray-400 capitalize truncate">{zone.replace('-', ' ')}</div>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="w-8 text-xs text-gray-500 text-right">{count}</div>
    </div>
  );
};

/**
 * Activity feed item
 */
const ActivityItem = ({
  event,
  icon,
  isNew,
}: {
  event: ActivityEvent;
  icon: React.ReactNode;
  isNew: boolean;
}) => {
  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div
      className={`
        flex items-start gap-2 p-2 rounded-lg transition-all
        ${isNew ? 'bg-cyan-500/10 animate-pulse' : 'bg-white/5'}
      `}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white">{event.message}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded capitalize"
            style={{
              backgroundColor: `${ZONE_COLORS[event.zone]}20`,
              color: ZONE_COLORS[event.zone],
            }}
          >
            {event.zone.replace('-', ' ')}
          </span>
          <span className="text-[10px] text-gray-600">{timeAgo(event.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default RealTimeAnalytics;
