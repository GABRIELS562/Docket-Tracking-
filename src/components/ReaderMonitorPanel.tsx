import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ChevronDown, ChevronUp, Wifi, WifiOff, AlertTriangle, MapPin } from 'lucide-react';
import { Reader } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { formatRelativeTime } from '@/lib/utils';

interface Props {
  readers: Reader[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function ReaderMonitorPanel({ readers, isOpen, onToggle }: Props) {
  const { setSelectedZone } = useStore();

  const onlineReaders = readers.filter((r) => r.status === 'online').length;
  const offlineReaders = readers.filter((r) => r.status === 'offline').length;
  const errorReaders = readers.filter((r) => r.status === 'error').length;

  const handleReaderClick = (reader: Reader) => {
    setSelectedZone(reader.zoneId);
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 pointer-events-auto">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-blue-500/30 shadow-2xl w-[600px] max-h-[500px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Radio className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">RFID Readers</h3>
                  <p className="text-xs text-gray-400">
                    {onlineReaders} online • {offlineReaders} offline • {errorReaders} errors
                  </p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Reader Grid */}
            <div className="overflow-y-auto max-h-[400px] p-4">
              <div className="grid grid-cols-3 gap-3">
                {readers.map((reader) => (
                  <ReaderCard
                    key={reader.readerId}
                    reader={reader}
                    onClick={() => handleReaderClick(reader)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onToggle}
            className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-blue-500/30 p-4 hover:bg-gray-800/95 transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Radio className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">Readers</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">{onlineReaders} online</span>
                  {(offlineReaders > 0 || errorReaders > 0) && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-red-400">{offlineReaders + errorReaders} issues</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronUp className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReaderCardProps {
  reader: Reader;
  onClick: () => void;
}

function ReaderCard({ reader, onClick }: ReaderCardProps) {
  const statusConfig = {
    online: {
      icon: Wifi,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      glow: 'shadow-green-500/20',
    },
    offline: {
      icon: WifiOff,
      color: 'text-gray-400',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/30',
      glow: 'shadow-gray-500/20',
    },
    error: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/20',
    },
    connecting: {
      icon: Radio,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      glow: 'shadow-yellow-500/20',
    },
  };

  const config = statusConfig[reader.status];
  const StatusIcon = config.icon;

  // Calculate signal strength from RSSI (-30 to -90 dBm typical range)
  const rssi = reader.configuration?.rssiThreshold || -60;
  const signalStrength = Math.max(0, Math.min(100, ((rssi + 90) / 60) * 100));

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 rounded-lg border ${config.border} ${config.bg} hover:${config.bg} transition-all text-left relative overflow-hidden shadow-lg ${config.glow}`}
    >
      {/* Status indicator pulse */}
      {reader.status === 'online' && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
      )}

      {/* Reader info */}
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
          <span className="text-xs font-bold text-white truncate">{reader.readerName}</span>
        </div>

        {/* Zone */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{reader.zoneName || `Zone ${reader.zoneId}`}</span>
        </div>

        {/* IP Address */}
        <div className="text-xs font-mono text-gray-500">{reader.ipAddress}</div>

        {/* Signal Strength Bar */}
        {reader.status === 'online' && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Signal</span>
              <span className={config.color}>{signalStrength.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${signalStrength}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full ${
                  signalStrength > 70
                    ? 'bg-green-500'
                    : signalStrength > 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Last Seen */}
        {reader.lastSeenAt && (
          <div className="text-xs text-gray-500">
            {reader.status === 'online' ? 'Active' : formatRelativeTime(reader.lastSeenAt)}
          </div>
        )}

        {/* Error Message */}
        {reader.status === 'error' && reader.errorMessage && (
          <div className="text-xs text-red-400 truncate" title={reader.errorMessage}>
            {reader.errorMessage}
          </div>
        )}

        {/* Config info */}
        {reader.status === 'online' && reader.configuration && (
          <div className="text-xs text-gray-600 pt-1 border-t border-gray-700">
            {reader.configuration.transmitPower}dBm • {reader.configuration.antennas?.length || 0}{' '}
            ant
          </div>
        )}
      </div>
    </motion.button>
  );
}
