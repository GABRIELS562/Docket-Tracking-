import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X, Trash2, Clock } from 'lucide-react';
import { Notification, NotificationType } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/lib/utils';

interface NotificationHistoryProps {
  isOpen: boolean;
  history: Notification[];
  onClose: () => void;
  onClearHistory: () => void;
  onMarkAsRead: (id: string) => void;
}

export default function NotificationHistory({
  isOpen,
  history,
  onClose,
  onClearHistory,
  onMarkAsRead,
}: NotificationHistoryProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[450px] bg-gray-900 border-l border-gray-700 shadow-2xl z-[120] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Notification History</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClearHistory}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                  title="Clear all history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 bg-gray-800/50 border-b border-gray-700">
              <div className="grid grid-cols-4 gap-2 text-center">
                <StatCard label="Total" value={history.length} color="text-gray-400" />
                <StatCard
                  label="Success"
                  value={history.filter((n) => n.type === 'success').length}
                  color="text-green-400"
                />
                <StatCard
                  label="Warnings"
                  value={history.filter((n) => n.type === 'warning').length}
                  color="text-yellow-400"
                />
                <StatCard
                  label="Errors"
                  value={history.filter((n) => n.type === 'error').length}
                  color="text-red-400"
                />
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Clock className="w-12 h-12 mb-2" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                history.map((notification) => (
                  <HistoryItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

interface HistoryItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

function HistoryItem({ notification, onMarkAsRead }: HistoryItemProps) {
  const config = getNotificationConfig(notification.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-800 border-l-4 ${config.borderColor} rounded-lg p-3 hover:bg-gray-750 transition-colors cursor-pointer ${
        !notification.read ? 'ring-1 ring-blue-500/30' : ''
      }`}
      onClick={() => onMarkAsRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor}`}>{config.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">{notification.title}</h4>
            {!notification.read && (
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{notification.message}</p>

          {/* Metadata */}
          {notification.metadata && (
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              {Object.entries(notification.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-1">
                  <span className="font-medium text-gray-400">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-gray-600 mt-2">{formatRelativeTime(notification.timestamp)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function getNotificationConfig(type: NotificationType) {
  const configs = {
    success: {
      icon: <CheckCircle className="w-4 h-4" />,
      iconColor: 'text-green-400',
      borderColor: 'border-green-500',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" />,
      iconColor: 'text-yellow-400',
      borderColor: 'border-yellow-500',
    },
    error: {
      icon: <XCircle className="w-4 h-4" />,
      iconColor: 'text-red-400',
      borderColor: 'border-red-500',
    },
    info: {
      icon: <Info className="w-4 h-4" />,
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500',
    },
  };

  return configs[type];
}
