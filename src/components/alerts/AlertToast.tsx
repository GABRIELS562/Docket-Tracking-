import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, LogOut, Clock, Radio, Activity, X } from 'lucide-react';
import { useSimulationStore, SimulationAlert, AlertType } from '@/store/useSimulationStore';

interface AlertToastProps {
  /** Maximum number of toasts to show at once */
  maxVisible?: number;
  /** Position of the toast container */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Auto-dismiss duration in ms (0 to disable) */
  autoDismissMs?: number;
}

/**
 * AlertToast - Displays simulation alerts as animated toast notifications
 *
 * Shows alerts from the simulation store with auto-dismiss and manual dismiss options.
 * Different alert types have different icons and colors.
 */
export default function AlertToast({
  maxVisible = 5,
  position = 'bottom-right',
  autoDismissMs = 8000,
}: AlertToastProps) {
  // Select raw alerts array (stable reference) instead of calling getActiveAlerts()
  const allAlerts = useSimulationStore((state) => state.alerts);
  const dismissAlert = useSimulationStore((state) => state.dismissAlert);

  // Filter and limit alerts with useMemo to avoid creating new arrays on every render
  const visibleAlerts = useMemo(() => {
    return allAlerts.filter((a) => !a.dismissed).slice(0, maxVisible);
  }, [allAlerts, maxVisible]);

  // Track which alerts we've already set timers for
  const dismissedTimersRef = useRef<Set<string>>(new Set());

  // Auto-dismiss logic - only set timer once per alert
  useEffect(() => {
    if (autoDismissMs <= 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    visibleAlerts.forEach((alert) => {
      // Skip if we already have a timer for this alert
      if (dismissedTimersRef.current.has(alert.id)) return;

      dismissedTimersRef.current.add(alert.id);
      const timer = setTimeout(() => {
        dismissAlert(alert.id);
        dismissedTimersRef.current.delete(alert.id);
      }, autoDismissMs);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [visibleAlerts, autoDismissMs, dismissAlert]);

  // Position classes
  const positionClasses = {
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[90] flex flex-col gap-2 pointer-events-none max-h-[60vh] overflow-hidden`}
    >
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert) => (
          <Toast key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastProps {
  alert: SimulationAlert;
  onDismiss: () => void;
}

function Toast({ alert, onDismiss }: ToastProps) {
  const config = getAlertConfig(alert.type, alert.severity);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="pointer-events-auto w-80"
    >
      <div
        className={`bg-gray-900/95 backdrop-blur-md border-l-4 ${config.borderColor} rounded-lg shadow-2xl overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 p-2 rounded-lg ${config.iconBgColor}`}>
              <div className={config.iconColor}>{config.icon}</div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-white truncate">{alert.title}</h4>
                {alert.severity === 'critical' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 rounded">
                    Critical
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">{alert.message}</p>

              {/* Timestamp */}
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(alert.timestamp)}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar (auto-dismiss indicator) */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 8, ease: 'linear' }}
          className={`h-0.5 ${config.progressColor}`}
        />
      </div>
    </motion.div>
  );
}

function getAlertConfig(type: AlertType, severity: string) {
  // Severity-based border and progress colors
  const severityColors = {
    info: {
      borderColor: 'border-blue-500',
      progressColor: 'bg-blue-500',
    },
    warning: {
      borderColor: 'border-yellow-500',
      progressColor: 'bg-yellow-500',
    },
    error: {
      borderColor: 'border-orange-500',
      progressColor: 'bg-orange-500',
    },
    critical: {
      borderColor: 'border-red-500',
      progressColor: 'bg-red-500',
    },
  };

  // Type-based icons
  const typeIcons: Record<
    AlertType,
    { icon: React.ReactNode; iconColor: string; iconBgColor: string }
  > = {
    exit: {
      icon: <LogOut className="w-4 h-4" />,
      iconColor: 'text-red-400',
      iconBgColor: 'bg-red-500/20',
    },
    stale: {
      icon: <Clock className="w-4 h-4" />,
      iconColor: 'text-yellow-400',
      iconBgColor: 'bg-yellow-500/20',
    },
    overcapacity: {
      icon: <AlertTriangle className="w-4 h-4" />,
      iconColor: 'text-orange-400',
      iconBgColor: 'bg-orange-500/20',
    },
    reader_offline: {
      icon: <Radio className="w-4 h-4" />,
      iconColor: 'text-purple-400',
      iconBgColor: 'bg-purple-500/20',
    },
    movement: {
      icon: <Activity className="w-4 h-4" />,
      iconColor: 'text-blue-400',
      iconBgColor: 'bg-blue-500/20',
    },
    info: {
      icon: <Info className="w-4 h-4" />,
      iconColor: 'text-gray-400',
      iconBgColor: 'bg-gray-500/20',
    },
  };

  const sevColors = severityColors[severity as keyof typeof severityColors] || severityColors.info;
  const typeIcon = typeIcons[type] || typeIcons.info;

  return {
    ...sevColors,
    ...typeIcon,
  };
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
