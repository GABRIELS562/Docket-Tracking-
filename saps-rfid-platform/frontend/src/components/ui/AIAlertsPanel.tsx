import { useState, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  BellOff,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  MapPin,
  Shield,
  Trash2,
  Zap,
  Activity,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  useAIAnalyticsStore,
  useAnomalies,
  useUnacknowledgedCount,
  useDwellAlerts,
} from '../../stores/aiAnalyticsStore';
import type { AnomalyEvent, AnomalySeverity } from '../../stores/aiAnalyticsStore';
import { useSceneStore } from '../../stores/sceneStore';

/**
 * Severity styling
 */
const SEVERITY_CONFIG: Record<AnomalySeverity, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: 'text-red-500' },
  high: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', icon: 'text-orange-500' },
  medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: 'text-yellow-500' },
  low: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', icon: 'text-blue-500' },
};

/**
 * Anomaly type icons
 */
const ANOMALY_ICONS = {
  dwell_exceeded: Clock,
  unusual_sequence: MapPin,
  unusual_time: Activity,
  unauthorized_zone: Shield,
};

/**
 * Format time ago
 */
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Single Anomaly Alert Card
 */
const AnomalyCard = ({
  anomaly,
  onAcknowledge,
  onDismiss,
  onViewItem,
}: {
  anomaly: AnomalyEvent;
  onAcknowledge: () => void;
  onDismiss: () => void;
  onViewItem: () => void;
}) => {
  const severity = SEVERITY_CONFIG[anomaly.severity];
  const Icon = ANOMALY_ICONS[anomaly.type];

  return (
    <div className={`rounded-xl border ${severity.border} ${severity.bg} p-3 transition-all hover:scale-[1.01]`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${severity.bg}`}>
            <Icon className={`w-4 h-4 ${severity.icon}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase ${severity.text}`}>
                {anomaly.severity}
              </span>
              <span className="text-gray-500 text-xs">{anomaly.confidence}% confidence</span>
            </div>
            <span className="text-white text-sm font-medium">{anomaly.itemName}</span>
          </div>
        </div>
        <span className="text-gray-500 text-xs whitespace-nowrap">
          {formatTimeAgo(anomaly.timestamp)}
        </span>
      </div>

      {/* Message */}
      <p className="text-gray-300 text-sm mb-3">{anomaly.message}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onViewItem}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          <Eye className="w-3 h-3" />
          View Item
        </button>
        {!anomaly.acknowledged ? (
          <button
            onClick={onAcknowledge}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors"
          >
            <Check className="w-3 h-3" />
            Acknowledge
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-500 text-xs">
            Acknowledged
          </span>
        )}
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

/**
 * AI Alerts Panel
 *
 * Displays AI-detected anomalies and dwell time alerts.
 * Collapsible panel positioned in the 3D scene overlay.
 */
const AIAlertsPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default for clean view
  const [showDwellAlerts, setShowDwellAlerts] = useState(false);

  const anomalies = useAnomalies();
  const unacknowledgedCount = useUnacknowledgedCount();
  const dwellAlerts = useDwellAlerts();

  // Use individual selectors to avoid re-renders when unrelated state changes
  const acknowledgeAnomaly = useAIAnalyticsStore((s) => s.acknowledgeAnomaly);
  const dismissAnomaly = useAIAnalyticsStore((s) => s.dismissAnomaly);
  const totalEventsProcessed = useAIAnalyticsStore((s) => s.totalEventsProcessed);
  const isLearning = useAIAnalyticsStore((s) => s.isLearning);
  const learningProgress = useAIAnalyticsStore((s) => s.learningProgress);

  const flyToZone = useSceneStore((s) => s.flyToZone);
  const items = useSceneStore(useShallow((s) => s.items));

  // Use ref for items to avoid dependency issues
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const flyToZoneRef = useRef(flyToZone);
  flyToZoneRef.current = flyToZone;

  const handleViewItem = useCallback((anomaly: AnomalyEvent) => {
    // Find item and fly to it
    const currentItems = itemsRef.current;
    const item = currentItems.find((i) => i.epc === anomaly.itemEpc);
    if (item) {
      flyToZoneRef.current(item.zone);
    }
  }, []);

  // Sort anomalies by severity and time
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
  const highCount = anomalies.filter((a) => a.severity === 'high').length;

  // Only show if there are anomalies or alerts
  const hasAlerts = anomalies.length > 0 || dwellAlerts.length > 0;

  // Compact badge when collapsed
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`absolute top-4 left-64 z-40 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border transition-all hover:scale-105 ${
          criticalCount > 0
            ? 'bg-red-500/20 border-red-500/30 text-red-400'
            : hasAlerts
            ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
            : 'bg-slate-900/80 border-white/10 text-gray-400'
        }`}
      >
        <Brain className="w-4 h-4" />
        <span className="text-xs font-medium">AI</span>
        {(criticalCount > 0 || hasAlerts) && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            criticalCount > 0 ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'
          }`}>
            {anomalies.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-64 z-40 w-80">
      {/* Header - Always visible */}
      <div
        className={`bg-slate-900/95 backdrop-blur-xl rounded-t-2xl border border-white/10 cursor-pointer transition-all ${
          !isExpanded ? 'rounded-b-2xl' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              {unacknowledgedCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{Math.min(unacknowledgedCount, 9)}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                AI Analytics
                {isLearning && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 animate-pulse">
                    Learning {learningProgress}%
                  </span>
                )}
              </h3>
              <p className="text-gray-500 text-xs">
                {totalEventsProcessed.toLocaleString()} events analyzed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">
                {criticalCount} Critical
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-b-2xl border border-t-0 border-white/10 max-h-[60vh] overflow-hidden flex flex-col">
          {/* Stats Row */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-gray-400">Real-time Detection</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {criticalCount > 0 && (
                <span className="text-xs text-red-400">{criticalCount} critical</span>
              )}
              {highCount > 0 && (
                <span className="text-xs text-orange-400">{highCount} high</span>
              )}
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="px-4 py-2 border-b border-white/5 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDwellAlerts(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !showDwellAlerts
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Anomalies ({anomalies.length})
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDwellAlerts(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showDwellAlerts
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Clock className="w-3 h-3" />
              Dwell Alerts ({dwellAlerts.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!showDwellAlerts ? (
              // Anomalies List
              sortedAnomalies.length > 0 ? (
                sortedAnomalies.map((anomaly) => (
                  <AnomalyCard
                    key={anomaly.id}
                    anomaly={anomaly}
                    onAcknowledge={() => acknowledgeAnomaly(anomaly.id)}
                    onDismiss={() => dismissAnomaly(anomaly.id)}
                    onViewItem={() => handleViewItem(anomaly)}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <BellOff className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No anomalies detected</p>
                  <p className="text-gray-600 text-xs mt-1">AI is monitoring all activity</p>
                </div>
              )
            ) : (
              // Dwell Alerts List
              dwellAlerts.length > 0 ? (
                dwellAlerts.map((alert) => (
                  <div
                    key={alert.itemEpc}
                    className={`rounded-xl border p-3 ${
                      alert.severity === 'critical'
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-amber-500/50 bg-amber-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">{alert.itemName}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          alert.severity === 'critical'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {alert.dwellDays} days
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{alert.zoneName}</span>
                      <span className="text-gray-600">|</span>
                      <span>Threshold: {alert.thresholdDays} days</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No dwell time alerts</p>
                  <p className="text-gray-600 text-xs mt-1">All items within normal timeframes</p>
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-gray-600 text-xs">
              Patterns updated: {new Date().toLocaleTimeString()}
            </span>
            <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              View Full Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAlertsPanel;
