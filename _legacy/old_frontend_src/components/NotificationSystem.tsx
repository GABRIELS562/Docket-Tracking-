import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Bell,
  BellOff
} from 'lucide-react';
import { Notification, NotificationType } from '@/hooks/useNotifications';

interface NotificationSystemProps {
  notifications: Notification[];
  soundEnabled: boolean;
  onRemove: (id: string) => void;
  onToggleSound: () => void;
  onViewHistory: () => void;
}

export default function NotificationSystem({
  notifications,
  soundEnabled,
  onRemove,
  onToggleSound,
  onViewHistory,
}: NotificationSystemProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {/* Sound Toggle Button */}
      <div className="flex justify-end gap-2 pointer-events-auto">
        <button
          onClick={onViewHistory}
          className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
          title="View notification history"
        >
          <Bell className="w-4 h-4 text-gray-300" />
        </button>
        <button
          onClick={onToggleSound}
          className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
          title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
        >
          {soundEnabled ? (
            <Bell className="w-4 h-4 text-blue-400" />
          ) : (
            <BellOff className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface NotificationToastProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

function NotificationToast({ notification, onRemove }: NotificationToastProps) {
  const config = getNotificationConfig(notification.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="pointer-events-auto w-96"
    >
      <div
        className={`bg-gray-800/95 backdrop-blur-sm border-l-4 ${config.borderColor} rounded-lg shadow-xl overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 ${config.iconColor}`}>
              {config.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-300">{notification.message}</p>

              {/* Metadata */}
              {notification.metadata && (
                <div className="mt-2 text-xs text-gray-400">
                  {Object.entries(notification.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-gray-500 mt-2">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => onRemove(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 5, ease: 'linear' }}
          className={`h-1 ${config.progressColor}`}
        />
      </div>
    </motion.div>
  );
}

function getNotificationConfig(type: NotificationType) {
  const configs = {
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      iconColor: 'text-green-400',
      borderColor: 'border-green-500',
      progressColor: 'bg-green-500',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      iconColor: 'text-yellow-400',
      borderColor: 'border-yellow-500',
      progressColor: 'bg-yellow-500',
    },
    error: {
      icon: <XCircle className="w-5 h-5" />,
      iconColor: 'text-red-400',
      borderColor: 'border-red-500',
      progressColor: 'bg-red-500',
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500',
      progressColor: 'bg-blue-500',
    },
  };

  return configs[type];
}
