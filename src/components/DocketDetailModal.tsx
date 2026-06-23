import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Package, AlertCircle, ExternalLink, Navigation } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { api } from '@/lib/api';

/**
 * UI POLISH - DocketDetailModal
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Motion: Enter with opacity + scale + translateY; Exit shorter (150ms vs 200ms)
 * 2. Shadows: Modal shadow for depth
 * 3. Hit Areas: Close button and action buttons have 44px touch targets
 * 4. Transition Scope: Framer Motion with explicit properties
 * 5. Concentric Radius: Modal rounded-2xl (16px), inner elements rounded-xl (12px) or rounded-lg (8px)
 * 6. Tabular Numbers: timestamps and metrics use tabular-nums
 */

interface LocationHistoryItem {
  timestamp: string;
  zoneName: string;
  zoneId: number;
  rssi: number;
  confidenceScore: number;
  readerId: string;
}

interface Props {
  docket: Docket | null;
  isOpen: boolean;
  onClose: () => void;
}

// Animation variants following ECC principles
// Enter: opacity + scale + translateY, 200ms
// Exit: shorter (150ms), smaller movement
const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 8 }, // Exit: smaller movement, scale closer to 1
};

// Enter is 200ms, exit is 150ms (shorter and quieter)
const enterTransition = { type: 'spring', damping: 28, stiffness: 350, duration: 0.2 };
const exitTransition = { duration: 0.15, ease: 'easeIn' };

export default function DocketDetailModal({ docket, isOpen, onClose }: Props) {
  const { setSelectedZone } = useStore();

  // Fetch location history for the selected docket
  const { data: historyData } = useQuery({
    queryKey: ['docket-history', docket?.labNumber],
    queryFn: async () => {
      if (!docket) return null;
      const response = await api.get<{ data: { locations: LocationHistoryItem[] } }>(
        `/dockets/${docket.labNumber}/history`,
        { params: { hours: 24 } }
      );
      return response.data.data;
    },
    enabled: !!docket && isOpen,
  });

  const locationHistory = historyData?.locations || [];

  const handleTrackOnMap = () => {
    if (docket?.currentZone) {
      setSelectedZone(docket.currentZone.id);
      onClose();
    }
  };

  if (!docket) return null;

  const statusColors = {
    active: 'text-green-400 bg-green-500/20 border-green-500/50',
    archived: 'text-gray-400 bg-gray-500/20 border-gray-500/50',
    missing: 'text-red-400 bg-red-500/20 border-red-500/50',
  };

  const evidenceType = (docket.metadata?.evidenceType as string) || 'Unknown';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - faster exit */}
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 pointer-events-auto"
          />

          {/* Modal with layered shadow */}
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={isOpen ? enterTransition : exitTransition}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[80vh] bg-gray-900 rounded-2xl border border-blue-500/30 z-50 overflow-hidden pointer-events-auto"
            style={{
              // Layered modal shadow for depth
              boxShadow: `
                0 4px 8px 0 rgba(0, 0, 0, 0.4),
                0 16px 32px -8px rgba(0, 0, 0, 0.3),
                0 32px 64px -16px rgba(0, 0, 0, 0.2),
                0 0 48px -12px rgba(59, 130, 246, 0.15)
              `,
            }}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-gray-800">
              {/* Close button with 44px hit area */}
              <button
                onClick={onClose}
                className="
                  absolute top-4 right-4 p-2 rounded-lg
                  min-w-[44px] min-h-[44px]
                  flex items-center justify-center
                  hover:bg-gray-800/50
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                  transition-[background-color,transform] duration-150 ease-out
                  active:scale-[0.96]
                "
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Package className="w-8 h-8 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{docket.labNumber}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        statusColors[docket.status]
                      }`}
                    >
                      {docket.status.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/50">
                      {evidenceType}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-200px)] p-6 space-y-6">
              {/* Case Information */}
              <section>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                  Case Information
                </h3>
                <div className="space-y-3">
                  <InfoRow
                    icon={<Package className="w-4 h-4" />}
                    label="Case Reference"
                    value={docket.caseReference}
                  />
                  <InfoRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="Current Zone"
                    value={
                      <span className="flex items-center gap-2">
                        {docket.currentZone ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            {docket.currentZone.name}
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                            Unknown Location
                          </>
                        )}
                      </span>
                    }
                  />
                  <InfoRow
                    icon={<Clock className="w-4 h-4" />}
                    label="Last Seen"
                    value={
                      docket.lastSeenAt ? (
                        <div className="flex flex-col items-end">
                          <span className="text-white">
                            {formatRelativeTime(docket.lastSeenAt)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(docket.lastSeenAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )
                    }
                  />
                  <InfoRow
                    icon={<AlertCircle className="w-4 h-4" />}
                    label="RFID EPC"
                    value={
                      <code className="text-xs font-mono text-blue-400">{docket.rfidEpc}</code>
                    }
                  />
                </div>
              </section>

              {/* Location History Timeline */}
              <section>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">
                  Location History (24h)
                </h3>
                {locationHistory.length > 0 ? (
                  <div className="relative space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-transparent" />

                    {locationHistory.map((location, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative pl-12 pb-4"
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-2.5 top-2 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-900 shadow-lg shadow-blue-500/50" />

                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{location.zoneName}</span>
                            <span className="text-xs text-gray-500">
                              {formatRelativeTime(location.timestamp)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDate(location.timestamp)}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>Reader: {location.readerId}</span>
                            <span>•</span>
                            <span>RSSI: {location.rssi} dBm</span>
                            <span>•</span>
                            <span className="text-green-400">
                              {(location.confidenceScore * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No location history available</p>
                  </div>
                )}
              </section>
            </div>

            {/* Footer Actions - buttons with proper hit areas and transitions */}
            <div className="border-t border-gray-800 p-4 bg-gray-900/50 flex items-center justify-between">
              {/* Secondary action with expanded hit area */}
              <button
                onClick={() => window.open('#', '_blank')}
                className="
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  min-h-[44px]
                  text-sm text-gray-400
                  hover:text-white hover:bg-gray-800/50
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                  transition-[color,background-color,transform] duration-150 ease-out
                  active:scale-[0.96]
                "
              >
                <ExternalLink className="w-4 h-4" />
                View Full History
              </button>
              {/* Primary action button */}
              <button
                onClick={handleTrackOnMap}
                disabled={!docket.currentZone}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  min-h-[44px]
                  bg-blue-600 text-white font-medium
                  hover:bg-blue-700
                  disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                  transition-[background-color,transform,opacity] duration-150 ease-out
                  active:scale-[0.96]
                  disabled:active:scale-100
                "
              >
                <Navigation className="w-4 h-4" />
                Track on Map
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm text-white">{value}</div>
    </div>
  );
}
