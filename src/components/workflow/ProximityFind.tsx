import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Search,
  Radio,
  Target,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { ProximityLevel, getProximityColor, getProximityLabel } from './types';
import { useProximityFind } from './useWorkflowState';

// ============================================================================
// Signal Strength Ring Animation
// ============================================================================

interface SignalRingsProps {
  level: ProximityLevel;
}

function SignalRings({ level }: SignalRingsProps) {
  const color = getProximityColor(level);
  const ringCount =
    level === 'found' ? 5 : level === 'hot' ? 4 : level === 'warm' ? 3 : level === 'cool' ? 2 : 1;
  const pulseSpeed =
    level === 'found'
      ? 0.3
      : level === 'hot'
        ? 0.5
        : level === 'warm'
          ? 0.8
          : level === 'cool'
            ? 1.2
            : 1.5;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background rings */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`bg-${i}`}
          className="absolute rounded-full border border-gray-700/50"
          style={{
            width: `${(i + 1) * 20}%`,
            height: `${(i + 1) * 20}%`,
          }}
        />
      ))}

      {/* Active pulsing rings */}
      {Array.from({ length: ringCount }).map((_, i) => (
        <motion.div
          key={`active-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${(i + 1) * 20}%`,
            height: `${(i + 1) * 20}%`,
            border: `2px solid ${color}`,
            boxShadow: `0 0 ${10 + i * 5}px ${color}40`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{
            duration: pulseSpeed,
            repeat: Infinity,
            delay: i * (pulseSpeed / ringCount),
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Center indicator */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: `${color}20`,
          border: `3px solid ${color}`,
          boxShadow: `0 0 30px ${color}60`,
        }}
        animate={level === 'found' ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: level === 'found' ? Infinity : 0 }}
      >
        {level === 'found' ? (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            <Target className="w-10 h-10" style={{ color }} />
          </motion.div>
        ) : (
          <Radio className="w-10 h-10" style={{ color }} />
        )}
      </motion.div>

      {/* Sparkles for 'found' state */}
      {level === 'found' && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: Math.cos((i * 45 * Math.PI) / 180) * 80,
                y: Math.sin((i * 45 * Math.PI) / 180) * 80,
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            >
              <Sparkles className="w-4 h-4 text-green-400" />
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}

// ============================================================================
// RSSI Meter
// ============================================================================

interface RssiMeterProps {
  rssi: number;
  level: ProximityLevel;
}

function RssiMeter({ rssi, level }: RssiMeterProps) {
  // Convert RSSI (-100 to -10) to percentage (0 to 100)
  const percentage = Math.max(0, Math.min(100, ((rssi + 100) / 90) * 100));
  const color = getProximityColor(level);

  return (
    <div className="w-full max-w-md">
      {/* Meter bar */}
      <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
        {/* Gradient background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(to right, #6366f1, #3b82f6, #f97316, #ef4444, #22c55e)',
          }}
        />

        {/* Active fill */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            background: `linear-gradient(to right, ${color}80, ${color})`,
            boxShadow: `0 0 20px ${color}60`,
          }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        />

        {/* Indicator */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-white rounded-full shadow-lg"
          animate={{ left: `calc(${percentage}% - 6px)` }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 px-1">
        <span>Cold</span>
        <span>Cool</span>
        <span>Warm</span>
        <span>Hot</span>
        <span>Found</span>
      </div>
    </div>
  );
}

// ============================================================================
// Status Display
// ============================================================================

interface StatusDisplayProps {
  level: ProximityLevel;
  rssi: number;
  isSearching: boolean;
}

function StatusDisplay({ level, rssi, isSearching }: StatusDisplayProps) {
  const color = getProximityColor(level);
  const label = getProximityLabel(level);

  return (
    <div className="text-center space-y-2">
      <motion.div
        className="text-4xl font-bold"
        style={{ color }}
        animate={level === 'found' ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: level === 'found' ? Infinity : 0 }}
      >
        {label}
      </motion.div>
      <div className="text-lg text-gray-400">
        Signal Strength: <span className="font-mono text-white">{rssi.toFixed(0)} dBm</span>
      </div>
      {isSearching && level !== 'found' && (
        <motion.p
          className="text-sm text-gray-500"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Move around to locate the item...
        </motion.p>
      )}
    </div>
  );
}

// ============================================================================
// Movement Controls (for demo)
// ============================================================================

interface MovementControlsProps {
  onMove: (direction: 'closer' | 'farther') => void;
  onFound: () => void;
  disabled: boolean;
}

function MovementControls({ onMove, onFound, disabled }: MovementControlsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-400 mb-2">Simulate Movement (Demo)</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onMove('farther')}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900/50 hover:bg-blue-800/50 disabled:opacity-50 text-blue-300 rounded-lg border border-blue-700 transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
          Move Away
        </button>
        <button
          onClick={() => onMove('closer')}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-800/50 disabled:opacity-50 text-red-300 rounded-lg border border-red-700 transition-colors"
        >
          <ChevronUp className="w-5 h-5" />
          Move Closer
        </button>
      </div>
      <button
        onClick={onFound}
        disabled={disabled}
        className="mt-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
      >
        Simulate Found
      </button>
    </div>
  );
}

// ============================================================================
// Search Input
// ============================================================================

interface SearchInputProps {
  onSearch: (itemNumber: string, rfidEpc: string) => void;
  isSearching: boolean;
}

function SearchInput({ onSearch, isSearching }: SearchInputProps) {
  const [itemNumber, setItemNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemNumber.trim()) {
      // Generate a mock EPC for demo
      const mockEpc = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16))
        .join('')
        .toUpperCase();
      onSearch(itemNumber.trim(), mockEpc);
    }
  };

  const handleQuickSearch = () => {
    const mockNumber = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const mockEpc = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16))
      .join('')
      .toUpperCase();
    setItemNumber(mockNumber);
    onSearch(mockNumber, mockEpc);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <label htmlFor="searchItem" className="block text-sm font-medium text-gray-300 mb-2">
          Item Number or RFID EPC
        </label>
        <div className="relative">
          <input
            id="searchItem"
            type="text"
            value={itemNumber}
            onChange={(e) => setItemNumber(e.target.value)}
            placeholder="Enter docket number..."
            disabled={isSearching}
            className="w-full px-4 py-3 pl-11 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!itemNumber.trim() || isSearching}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Wifi className="w-5 h-5" />
          Start Search
        </button>
        <button
          type="button"
          onClick={handleQuickSearch}
          disabled={isSearching}
          className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          Demo
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ProximityFind() {
  const { state, startSearch, stopSearch, simulateMovement, simulateFound } = useProximityFind();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Wifi className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Proximity Find</h2>
            <p className="text-sm text-gray-400">Locate items using RFID signal strength</p>
          </div>
        </div>
        {state.isSearching && (
          <button
            onClick={stopSearch}
            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg border border-red-600/30 transition-colors"
          >
            <WifiOff className="w-4 h-4" />
            Stop
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!state.isSearching ? (
          /* Search Input View */
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8"
          >
            <div className="w-24 h-24 mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <Search className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Find an Item</h3>
            <p className="text-gray-400 mb-6 text-center">
              Enter an item number to start proximity searching
            </p>
            <SearchInput onSearch={startSearch} isSearching={state.isSearching} />
          </motion.div>
        ) : (
          /* Active Search View */
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-6 space-y-6"
          >
            {/* Target Info */}
            <div className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Searching for:</span>
                <span className="text-white font-mono">{state.targetItemNumber}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-400">RFID EPC:</span>
                <code className="text-blue-400 font-mono text-xs">{state.targetRfidEpc}</code>
              </div>
            </div>

            {/* Signal Rings */}
            <SignalRings level={state.level} />

            {/* Status Display */}
            <StatusDisplay level={state.level} rssi={state.rssi} isSearching={state.isSearching} />

            {/* RSSI Meter */}
            <RssiMeter rssi={state.rssi} level={state.level} />

            {/* Movement Controls (for demo) */}
            <div className="pt-4 border-t border-gray-800 w-full">
              <MovementControls
                onMove={simulateMovement}
                onFound={simulateFound}
                disabled={state.level === 'found'}
              />
            </div>

            {/* Found Message */}
            {state.level === 'found' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center"
              >
                <div className="flex items-center justify-center gap-2 text-green-400 font-semibold mb-1">
                  <Target className="w-5 h-5" />
                  Item Located!
                </div>
                <p className="text-sm text-gray-400">
                  The item is within reach. Check your immediate surroundings.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
