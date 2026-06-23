import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Radio,
  Clock,
  Activity,
  AlertTriangle,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useZoneStore } from '@/store/useZoneStore';
import { useReaderStore } from '@/store/useReaderStore';

interface MetricsPanelProps {
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MetricsPanel - Displays real-time tracking metrics
 *
 * Shows key metrics including:
 * - Total items tracked
 * - Active zones
 * - Online readers
 * - Last movement time
 * - Movements per minute
 * - Active alerts
 */
export default function MetricsPanel({ compact = false, className = '' }: MetricsPanelProps) {
  const metrics = useSimulationStore((state) => state.metrics);
  const recentMovements = useSimulationStore((state) => state.recentMovements);
  const activeAlerts = useSimulationStore((state) => state.getActiveAlerts());

  const zones = useZoneStore((state) => state.zones);
  const readers = useReaderStore((state) => state.readers);

  // Compute live metrics from stores as fallback
  const liveMetrics = useMemo(() => {
    const totalItems = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
    const activeZones = zones.filter((z) => z.isActive && z.currentOccupancy > 0).length;
    const onlineReaders = readers.filter((r) => r.status === 'online').length;

    return {
      totalItemsTracked: metrics.totalItemsTracked || totalItems,
      activeZones: metrics.activeZones || activeZones,
      onlineReaders: metrics.onlineReaders || onlineReaders,
      lastMovementTime: metrics.lastMovementTime,
      movementsPerMinute: metrics.movementsPerMinute,
      alertsToday: metrics.alertsToday,
    };
  }, [metrics, zones, readers]);

  // Format last movement time
  const lastMovementDisplay = useMemo(() => {
    if (!liveMetrics.lastMovementTime) return 'No activity';

    const now = new Date();
    const diff = now.getTime() - liveMetrics.lastMovementTime.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return liveMetrics.lastMovementTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [liveMetrics.lastMovementTime]);

  if (compact) {
    return (
      <CompactMetrics
        metrics={liveMetrics}
        lastMovementDisplay={lastMovementDisplay}
        activeAlertCount={activeAlerts.length}
        className={className}
      />
    );
  }

  return (
    <div
      className={`bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Live Metrics
        </h3>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Total Items */}
        <MetricCard
          icon={<Package className="w-4 h-4" />}
          label="Items Tracked"
          value={formatNumber(liveMetrics.totalItemsTracked)}
          color="blue"
        />

        {/* Active Zones */}
        <MetricCard
          icon={<MapPin className="w-4 h-4" />}
          label="Active Zones"
          value={liveMetrics.activeZones.toString()}
          subValue={`of ${zones.length}`}
          color="purple"
        />

        {/* Online Readers */}
        <MetricCard
          icon={<Radio className="w-4 h-4" />}
          label="Readers Online"
          value={liveMetrics.onlineReaders.toString()}
          subValue={`of ${readers.length}`}
          color="green"
          highlight={liveMetrics.onlineReaders < readers.length * 0.9}
        />

        {/* Last Movement */}
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="Last Movement"
          value={lastMovementDisplay}
          color="cyan"
        />
      </div>

      {/* Activity Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-400">Movements/min</span>
          </div>
          <motion.span
            key={liveMetrics.movementsPerMinute}
            initial={{ scale: 1.2, color: '#10b981' }}
            animate={{ scale: 1, color: '#ffffff' }}
            className="text-sm font-semibold text-white"
          >
            {liveMetrics.movementsPerMinute}
          </motion.span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Active Alerts</span>
          </div>
          <span
            className={`text-sm font-semibold ${
              activeAlerts.length > 0 ? 'text-yellow-400' : 'text-gray-400'
            }`}
          >
            {activeAlerts.length}
          </span>
        </div>
      </div>

      {/* Recent Movements Preview */}
      {recentMovements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-gray-400">Recent Activity</span>
          </div>
          <div className="space-y-1.5">
            {recentMovements.slice(0, 3).map((movement, idx) => (
              <motion.div
                key={`${movement.itemId}-${movement.timestamp}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-300 truncate max-w-[120px]">{movement.itemNumber}</span>
                <span className="text-gray-500">
                  {movement.fromZoneName?.split(' ')[0]} → {movement.toZoneName.split(' ')[0]}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CompactMetricsProps {
  metrics: {
    totalItemsTracked: number;
    activeZones: number;
    onlineReaders: number;
  };
  lastMovementDisplay: string;
  activeAlertCount: number;
  className?: string;
}

function CompactMetrics({
  metrics,
  lastMovementDisplay,
  activeAlertCount,
  className = '',
}: CompactMetricsProps) {
  return (
    <div
      className={`flex items-center gap-4 bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700/50 ${className}`}
    >
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-green-400">LIVE</span>
      </div>

      <div className="h-4 w-px bg-gray-700" />

      {/* Items */}
      <div className="flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs text-gray-300">
          <span className="font-semibold text-white">
            {formatNumber(metrics.totalItemsTracked)}
          </span>{' '}
          items
        </span>
      </div>

      {/* Zones */}
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs text-gray-300">
          <span className="font-semibold text-white">{metrics.activeZones}</span> zones
        </span>
      </div>

      {/* Readers */}
      <div className="flex items-center gap-1.5">
        <Radio className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs text-gray-300">
          <span className="font-semibold text-white">{metrics.onlineReaders}</span> readers
        </span>
      </div>

      <div className="h-4 w-px bg-gray-700" />

      {/* Last Activity */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs text-gray-400">{lastMovementDisplay}</span>
      </div>

      {/* Alerts badge */}
      {activeAlertCount > 0 && (
        <>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400">{activeAlertCount}</span>
          </div>
        </>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: 'blue' | 'purple' | 'green' | 'cyan' | 'yellow' | 'red';
  highlight?: boolean;
}

function MetricCard({ icon, label, value, subValue, color, highlight }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    green: 'text-green-400 bg-green-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    red: 'text-red-400 bg-red-500/10',
  };

  return (
    <div
      className={`p-3 rounded-lg ${colorClasses[color]} ${
        highlight ? 'ring-1 ring-yellow-500/50' : ''
      }`}
    >
      <div className={`${colorClasses[color].split(' ')[0]} mb-1`}>{icon}</div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <motion.span
          key={value}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-lg font-bold text-white"
        >
          {value}
        </motion.span>
        {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}
