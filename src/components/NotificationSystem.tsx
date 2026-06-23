import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X, Bell, BellOff } from 'lucide-react';
import { Notification, NotificationType } from '@/hooks/useNotifications';

/**
 * UI POLISH - NotificationSystem
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Motion: Slide-in from right on enter, slide-out on exit (150ms)
 * 2. Hit Areas: All buttons have 44px minimum touch targets
 * 3. Transition Scope: specific properties only
 * 4. Shadows: Toast shadows for depth
 * 5. Tabular Numbers: timestamps use tabular-nums
 */

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
      {/* Action Buttons - 44px hit areas */}
      <div className="flex justify-end gap-2 pointer-events-auto">
        <button
          onClick={onViewHistory}
          className="
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2
            hover:bg-gray-700 hover:border-gray-600
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            transition-[background-color,border-color,transform] duration-150 ease-out
            active:scale-[0.96]
          "
          title="View notification history"
          aria-label="View notification history"
        >
          <Bell className="w-4 h-4 text-gray-300" />
        </button>
        <button
          onClick={onToggleSound}
          className="
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2
            hover:bg-gray-700 hover:border-gray-600
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            transition-[background-color,border-color,transform] duration-150 ease-out
            active:scale-[0.96]
          "
          title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
          aria-label={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
          aria-pressed={soundEnabled}
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

// Animation variants
// Enter: slide from right with opacity and scale, 200ms
// Exit: shorter (150ms), less movement
const toastVariants = {
  initial: { opacity: 0, x: 48, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 24, scale: 0.98 },
};

// Enter transition uses spring physics; exit is handled by variant
const toastTransition = { type: 'spring', damping: 25, stiffness: 350 };

function NotificationToast({ notification, onRemove }: NotificationToastProps) {
  const config = getNotificationConfig(notification.type);

  return (
    <motion.div
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={toastTransition}
      className="pointer-events-auto w-96"
    >
      <div
        className={`bg-gray-800/95 backdrop-blur-sm border-l-4 ${config.borderColor} rounded-lg overflow-hidden`}
        style={{
          // Layered toast shadow
          boxShadow: `
            0 2px 4px 0 rgba(0, 0, 0, 0.3),
            0 8px 16px -4px rgba(0, 0, 0, 0.25),
            0 16px 32px -8px rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 ${config.iconColor}`}>{config.icon}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title with text-wrap: balance (applied globally) */}
              <h4 className="text-sm font-semibold text-white mb-1">{notification.title}</h4>
              {/* Message with text-wrap: pretty (applied globally to p) */}
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

              {/* Timestamp with tabular-nums for stable width */}
              <p className="text-xs text-gray-500 mt-2 tabular-nums">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {/* Close Button - 44px hit area via padding */}
            <button
              onClick={() => onRemove(notification.id)}
              className="
                flex-shrink-0 p-2 -m-2
                min-w-[44px] min-h-[44px]
                flex items-center justify-center
                text-gray-400 hover:text-white rounded-lg
                hover:bg-gray-700/50
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
                transition-[color,background-color,transform] duration-150 ease-out
                active:scale-[0.96]
              "
              aria-label="Dismiss notification"
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
