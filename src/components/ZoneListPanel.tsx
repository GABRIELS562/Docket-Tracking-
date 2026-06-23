import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, AlertTriangle } from 'lucide-react';
import { Zone } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { getZoneColor } from '@/lib/utils';

/**
 * UI POLISH - ZoneListPanel
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Motion: Slide from left on enter, shorter exit (150ms vs 200ms)
 * 2. Hit Areas: Close button and zone cards have 44px touch targets
 * 3. Transition Scope: specific properties only
 * 4. Shadows: Panel shadow for depth
 * 5. Tabular Numbers: occupancy counts use tabular-nums
 */

interface Props {
  zones: Zone[];
  isOpen: boolean;
  onClose: () => void;
}

// Animation variants
const panelVariants = {
  initial: { x: -320, opacity: 0.8 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -320, opacity: 0 },
};

// Panel transition using spring physics
const panelTransition = { type: 'spring', damping: 28, stiffness: 280 };

export default function ZoneListPanel({ zones, isOpen, onClose }: Props) {
  const { selectedZoneId, setSelectedZone } = useStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={panelTransition}
          className="fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-r border-blue-500/30 z-40 overflow-hidden"
          style={{
            // Panel shadow for depth
            boxShadow: `
              4px 0 8px 0 rgba(0, 0, 0, 0.3),
              8px 0 24px -4px rgba(0, 0, 0, 0.2)
            `,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              {/* text-wrap: balance applied globally */}
              <h2 className="text-lg font-bold text-white">Zones</h2>
            </div>
            {/* Close button with 44px hit area */}
            <button
              onClick={onClose}
              className="
                p-2 min-w-[44px] min-h-[44px]
                flex items-center justify-center
                hover:bg-gray-800 rounded-lg
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                transition-[background-color,transform] duration-150 ease-out
                active:scale-[0.96]
              "
              aria-label="Close zones panel"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Zone List */}
          <div className="overflow-y-auto h-[calc(100vh-80px)] p-4 space-y-2">
            {zones.map((zone, index) => {
              const isSelected = selectedZoneId === zone.zoneId;
              const occupancyPercent = (zone.currentOccupancy / zone.capacity) * 100;
              const isOverCapacity = occupancyPercent >= 80;
              const color = getZoneColor(zone.zoneType);

              return (
                <motion.button
                  key={zone.zoneId}
                  // Enter animation with stagger
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  // Press state: scale(0.98) - slightly less than buttons since it's a card
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedZone(zone.zoneId)}
                  className={`
                    w-full p-4 rounded-lg border
                    min-h-[44px]
                    text-left
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                    transition-[background-color,border-color,box-shadow] duration-150 ease-out
                    ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_16px_-4px_rgba(59,130,246,0.4)]'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800/70'
                    }
                  `}
                >
                  {/* Zone Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-medium text-white text-sm">{zone.zoneName}</span>
                    </div>
                    {isOverCapacity && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  </div>

                  {/* Zone Type */}
                  <div className="text-xs text-gray-400 mb-2">
                    {zone.zoneType.charAt(0).toUpperCase() + zone.zoneType.slice(1)}
                  </div>

                  {/* Occupancy Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Occupancy</span>
                      {/* tabular-nums for stable width when numbers change */}
                      <span
                        className={`font-medium tabular-nums ${
                          isOverCapacity ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {zone.currentOccupancy}/{zone.capacity}
                      </span>
                    </div>
                    {/* Concentric radius: card is rounded-lg (8px), inner bar is rounded-full */}
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className={`h-full ${
                          isOverCapacity
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Readers Count - tabular-nums for numbers */}
                  <div className="mt-2 text-xs text-gray-500 tabular-nums">
                    {zone.readers.length} reader{zone.readers.length !== 1 ? 's' : ''}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
