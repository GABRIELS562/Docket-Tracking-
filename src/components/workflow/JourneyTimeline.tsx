import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  ArrowRight,
  FlaskConical,
  Archive,
  ExternalLink,
  Clock,
  MapPin,
  Radio,
  ChevronDown,
  ChevronUp,
  Package,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { JourneyEvent, JourneyEventType, getJourneyEventColor } from './types';
import { useJourneyTimeline } from './useWorkflowState';

// ============================================================================
// Event Icon Component
// ============================================================================

interface EventIconProps {
  type: JourneyEventType;
  color: string;
  isActive?: boolean;
}

function EventIcon({ type, color, isActive = false }: EventIconProps) {
  const iconClass = 'w-5 h-5';

  const iconMap = {
    intake: <Inbox className={iconClass} />,
    movement: <ArrowRight className={iconClass} />,
    processing: <FlaskConical className={iconClass} />,
    storage: <Archive className={iconClass} />,
    retrieval: <ExternalLink className={iconClass} />,
  };

  return (
    <motion.div
      className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
        isActive && 'ring-4 ring-opacity-30'
      )}
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
        color: color,
      }}
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
    >
      {iconMap[type]}
    </motion.div>
  );
}

// ============================================================================
// Timeline Event Card
// ============================================================================

interface TimelineEventCardProps {
  event: JourneyEvent;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function TimelineEventCard({
  event,
  isFirst,
  isLast,
  isExpanded,
  onToggle,
}: TimelineEventCardProps) {
  const color = getJourneyEventColor(event.type);

  // Format duration if available
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      className="relative pl-16 pb-8"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Timeline connector */}
      {!isLast && (
        <div
          className="absolute left-5 top-10 w-0.5 h-full"
          style={{
            background: `linear-gradient(to bottom, ${color}, ${getJourneyEventColor(event.type)}40)`,
          }}
        />
      )}

      {/* Event icon */}
      <div className="absolute left-0 top-0">
        <EventIcon type={event.type} color={color} isActive={isLast} />
      </div>

      {/* Event card */}
      <div
        className={cn(
          'bg-gray-800/50 rounded-lg border transition-all cursor-pointer hover:bg-gray-800/70',
          isExpanded ? 'border-blue-500/50' : 'border-gray-700'
        )}
        onClick={onToggle}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                </span>
                {isFirst && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    Start
                  </span>
                )}
                {isLast && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    Current
                  </span>
                )}
              </div>
              <h4 className="text-white font-semibold text-lg">{event.zoneName}</h4>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{formatRelativeTime(event.timestamp)}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {/* Quick info */}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span className="capitalize">{event.zoneType}</span>
            </div>
            {event.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Duration: {formatDuration(event.duration)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-gray-700 space-y-3">
                {/* Timestamp */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Timestamp</span>
                  <span className="text-white font-mono">{formatDate(event.timestamp)}</span>
                </div>

                {/* Reader info */}
                {event.readerId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Radio className="w-4 h-4" />
                      Reader
                    </span>
                    <span className="text-white font-mono">
                      {event.readerName || event.readerId}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {event.notes && (
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-xs text-gray-400 block mb-1">Notes</span>
                    <span className="text-sm text-white">{event.notes}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Journey Summary
// ============================================================================

interface JourneySummaryProps {
  itemNumber: string;
  itemDescription: string;
  rfidEpc: string;
  currentZone: string | null;
  totalZones: number;
}

function JourneySummary({
  itemNumber,
  itemDescription,
  rfidEpc,
  currentZone,
  totalZones,
}: JourneySummaryProps) {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg mb-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-500/20 rounded-xl">
          <Package className="w-8 h-8 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{itemNumber}</h3>
          <p className="text-gray-400 text-sm mb-3">{itemDescription}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400 block">RFID EPC</span>
              <code className="text-blue-400 font-mono text-xs">{rfidEpc}</code>
            </div>
            <div>
              <span className="text-gray-400 block">Current Location</span>
              <span className="text-white flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {currentZone || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{totalZones}</div>
          <div className="text-xs text-gray-400">Zones Visited</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Search Input
// ============================================================================

interface JourneySearchInputProps {
  onSearch: (itemNumber: string) => void;
  isLoading: boolean;
}

function JourneySearchInput({ onSearch, isLoading }: JourneySearchInputProps) {
  const [itemNumber, setItemNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemNumber.trim()) {
      onSearch(itemNumber.trim());
    }
  };

  const handleDemo = () => {
    const mockNumber = `DOC-${Date.now().toString(36).toUpperCase()}`;
    setItemNumber(mockNumber);
    onSearch(mockNumber);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <label htmlFor="journeySearch" className="block text-sm font-medium text-gray-300 mb-2">
          Item Number
        </label>
        <div className="relative">
          <input
            id="journeySearch"
            type="text"
            value={itemNumber}
            onChange={(e) => setItemNumber(e.target.value)}
            placeholder="Enter docket number..."
            disabled={isLoading}
            className="w-full px-4 py-3 pl-11 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!itemNumber.trim() || isLoading}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <Clock className="w-5 h-5" />
              View Journey
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleDemo}
          disabled={isLoading}
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

export function JourneyTimeline() {
  const { journeyData, isLoading, loadJourney } = useJourneyTimeline();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const toggleEvent = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Clock className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Item Journey Timeline</h2>
          <p className="text-sm text-gray-400">Track the complete path of an item</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!journeyData ? (
          /* Search View */
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8"
          >
            <div className="w-24 h-24 mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
              <Clock className="w-12 h-12 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">View Item Journey</h3>
            <p className="text-gray-400 mb-6 text-center">
              Enter an item number to see its complete location history
            </p>
            <JourneySearchInput onSearch={loadJourney} isLoading={isLoading} />
          </motion.div>
        ) : (
          /* Journey View */
          <motion.div
            key="journey"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Summary */}
            <JourneySummary
              itemNumber={journeyData.itemNumber}
              itemDescription={journeyData.itemDescription}
              rfidEpc={journeyData.rfidEpc}
              currentZone={journeyData.currentZone}
              totalZones={journeyData.totalZonesVisited}
            />

            {/* Timeline Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getJourneyEventColor('intake') }}
                />
                Intake
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getJourneyEventColor('processing') }}
                />
                Processing
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getJourneyEventColor('storage') }}
                />
                Storage
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getJourneyEventColor('movement') }}
                />
                Movement
              </span>
            </div>

            {/* Timeline Events */}
            <div className="relative">
              {journeyData.events.map((event, index) => (
                <TimelineEventCard
                  key={event.id}
                  event={event}
                  isFirst={index === 0}
                  isLast={index === journeyData.events.length - 1}
                  isExpanded={expandedEventId === event.id}
                  onToggle={() => toggleEvent(event.id)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-gray-800 flex justify-center">
              <button
                onClick={() => loadJourney(journeyData.itemNumber)}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <motion.div
                  animate={{ rotate: isLoading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
                >
                  <Clock className="w-4 h-4" />
                </motion.div>
                Refresh Timeline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
