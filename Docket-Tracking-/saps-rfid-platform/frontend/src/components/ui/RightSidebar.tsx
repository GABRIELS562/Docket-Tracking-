import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  MapPin,
  Shield,
  Check,
  Eye,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import {
  useAIAnalyticsStore,
  useAnomalies,
  useDwellAlerts,
} from '../../stores/aiAnalyticsStore';
import type { AnomalyEvent, AnomalySeverity } from '../../stores/aiAnalyticsStore';

/**
 * Right Sidebar - Combined Analytics & Alerts
 *
 * Collapsible sidebar with tabs for:
 * - Live Analytics (item counts, zone stats)
 * - AI Alerts (anomalies, dwell alerts)
 *
 * Starts collapsed to keep 3D view clean
 */

// Severity styling
const SEVERITY_CONFIG: Record<AnomalySeverity, { bg: string; border: string; text: string }> = {
  critical: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  low: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
};

const ANOMALY_ICONS = {
  dwell_exceeded: Clock,
  unusual_sequence: MapPin,
  unusual_time: Activity,
  unauthorized_zone: Shield,
};

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

type TabId = 'analytics' | 'alerts';

const RightSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('analytics');

  // Analytics data
  const items = useSceneStore(useShallow((s) => s.items));
  const fps = useSceneStore((s) => s.fps);

  // Alerts data
  const anomalies = useAnomalies();
  const dwellAlerts = useDwellAlerts();
  const acknowledgeAnomaly = useAIAnalyticsStore((s) => s.acknowledgeAnomaly);
  const flyToZone = useSceneStore((s) => s.flyToZone);

  // Calculate metrics
  const zoneDistribution = new Map<string, number>();
  items.forEach((item) => {
    const count = zoneDistribution.get(item.zone) || 0;
    zoneDistribution.set(item.zone, count + 1);
  });

  const totalItems = items.length;
  const activeZones = zoneDistribution.size;
  const avgPerZone = activeZones > 0 ? Math.round(totalItems / activeZones) : 0;

  const totalAlerts = anomalies.length + dwellAlerts.length;
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;

  const tabs = [
    { id: 'analytics' as TabId, label: 'Analytics', icon: Activity },
    { id: 'alerts' as TabId, label: 'Alerts', icon: AlertTriangle, badge: totalAlerts > 0 ? totalAlerts : undefined },
  ];

  return (
    <>
      {/* Collapsed state - floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-24 right-4 z-30 flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-slate-800/90 transition-all"
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-white text-sm font-medium">Panels</span>
          {totalAlerts > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {totalAlerts}
            </span>
          )}
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
      )}

      {/* Expanded sidebar */}
      {isOpen && (
        <div className="absolute top-24 right-4 bottom-24 z-30 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl flex flex-col overflow-hidden">
          {/* Header with tabs */}
          <div className="flex items-center border-b border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-all ${
                    isActive
                      ? 'bg-white/10 text-white border-b-2 border-cyan-500'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
                      criticalCount > 0 ? 'bg-red-500 text-white' : 'bg-cyan-500/30 text-cyan-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setIsOpen(false)}
              className="p-3 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'analytics' && (
              <AnalyticsTab
                totalItems={totalItems}
                activeZones={activeZones}
                avgPerZone={avgPerZone}
                fps={fps}
                zoneDistribution={zoneDistribution}
              />
            )}
            {activeTab === 'alerts' && (
              <AlertsTab
                anomalies={anomalies}
                dwellAlerts={dwellAlerts}
                onAcknowledge={acknowledgeAnomaly}
                onViewItem={(zone) => flyToZone(zone)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Analytics Tab Content
const AnalyticsTab = ({
  totalItems,
  activeZones,
  avgPerZone,
  fps,
  zoneDistribution,
}: {
  totalItems: number;
  activeZones: number;
  avgPerZone: number;
  fps: number;
  zoneDistribution: Map<string, number>;
}) => (
  <div className="space-y-4">
    {/* Key Metrics */}
    <div className="grid grid-cols-2 gap-3">
      <MetricCard icon={Package} label="Total Items" value={totalItems} color="cyan" />
      <MetricCard icon={MapPin} label="Active Zones" value={activeZones} color="emerald" />
      <MetricCard icon={TrendingUp} label="Avg/Zone" value={avgPerZone} color="blue" />
      <MetricCard icon={Zap} label="FPS" value={fps} color="amber" />
    </div>

    {/* Zone Distribution */}
    <div className="bg-white/5 rounded-xl p-3">
      <h4 className="text-white text-sm font-medium mb-3">Zone Distribution</h4>
      <div className="space-y-2">
        {Array.from(zoneDistribution.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([zone, count]) => (
            <div key={zone} className="flex items-center justify-between">
              <span className="text-gray-400 text-xs capitalize">{zone.replace('-', ' ')}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${Math.min(100, (count / totalItems) * 100)}%` }}
                  />
                </div>
                <span className="text-white text-xs font-medium w-6 text-right">{count}</span>
              </div>
            </div>
          ))}
      </div>
    </div>

    {/* System Status */}
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-emerald-400 text-sm font-medium">System Online</span>
      </div>
      <p className="text-gray-500 text-xs mt-1">All RFID readers connected</p>
    </div>
  </div>
);

// Metric Card Component
const MetricCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) => {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
  };

  return (
    <div className="bg-white/5 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-gray-500 text-xs">{label}</span>
      </div>
      <div className={`text-xl font-bold ${colors[color].split(' ')[0]}`}>{value}</div>
    </div>
  );
};

// Alerts Tab Content
const AlertsTab = ({
  anomalies,
  dwellAlerts,
  onAcknowledge,
  onViewItem,
}: {
  anomalies: AnomalyEvent[];
  dwellAlerts: any[];
  onAcknowledge: (id: string) => void;
  onViewItem: (zone: string) => void;
}) => {
  if (anomalies.length === 0 && dwellAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
          <Check className="w-6 h-6 text-emerald-400" />
        </div>
        <h4 className="text-white font-medium">All Clear</h4>
        <p className="text-gray-500 text-sm">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
        <Brain className="w-4 h-4 text-cyan-400" />
        <span className="text-gray-300 text-sm">
          {anomalies.length} anomalies, {dwellAlerts.length} dwell alerts
        </span>
      </div>

      {/* Anomalies */}
      {anomalies.slice(0, 5).map((anomaly) => {
        const severity = SEVERITY_CONFIG[anomaly.severity];
        const Icon = ANOMALY_ICONS[anomaly.type];

        return (
          <div
            key={anomaly.id}
            className={`rounded-xl border ${severity.border} ${severity.bg} p-3`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${severity.text}`} />
                <span className={`text-xs font-medium uppercase ${severity.text}`}>
                  {anomaly.severity}
                </span>
              </div>
              <span className="text-gray-500 text-xs">{formatTimeAgo(anomaly.timestamp)}</span>
            </div>
            <p className="text-white text-sm font-medium mb-1">{anomaly.itemName}</p>
            <p className="text-gray-400 text-xs mb-2 line-clamp-2">{anomaly.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onViewItem(anomaly.details.zone || '')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-all"
              >
                <Eye className="w-3 h-3" /> View
              </button>
              <button
                onClick={() => onAcknowledge(anomaly.id)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-xs text-emerald-400 transition-all"
              >
                <Check className="w-3 h-3" /> Ack
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RightSidebar;
