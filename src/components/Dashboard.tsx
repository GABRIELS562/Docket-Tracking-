import { Package, MapPin, Radio } from 'lucide-react';
import { Zone, Docket, Reader } from '@/lib/api';
import { useStore } from '@/store/useStore';

/**
 * UI POLISH - Dashboard
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Tabular Numbers: font-variant-numeric: tabular-nums for stat values
 * 2. Shadows: layered shadows for card depth
 * 3. Text Wrapping: balance for headings (applied globally in index.css)
 * 4. Transition Scope: specific properties for status badge animations
 */

interface Props {
  zones: Zone[];
  dockets: Docket[];
  readers: Reader[];
}

export default function Dashboard({ zones, dockets, readers }: Props) {
  const { isConnected, isDemoMode } = useStore();

  const onlineReaders = readers.filter((r) => r.status === 'online').length;
  const totalDockets = isDemoMode ? 670 : dockets.length;

  return (
    <div className="absolute top-4 left-4 right-4 pointer-events-none">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          {/* Header card with layered shadow */}
          <div
            className="bg-gray-900/90 backdrop-blur-md px-6 py-3 rounded-xl border border-blue-500/30 pointer-events-auto"
            style={{
              boxShadow: `
                0 1px 2px 0 rgba(0, 0, 0, 0.3),
                0 4px 8px -2px rgba(0, 0, 0, 0.2),
                0 0 24px -8px rgba(59, 130, 246, 0.15)
              `,
            }}
          >
            {/* text-wrap: balance applied globally to h1 in index.css */}
            <h1 className="text-2xl font-bold text-white">SAPS Forensic 3D Dashboard</h1>
            <p className="text-blue-400 text-sm">Real-time Evidence Tracking</p>
          </div>

          <div className="flex gap-2">
            {isDemoMode && <StatusBadge variant="warning" label="Demo Mode" />}
            <StatusBadge
              variant={isConnected ? 'success' : 'error'}
              label={isConnected ? 'Connected' : 'Disconnected'}
              showDot
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pointer-events-auto">
          <StatCard
            icon={<Package className="w-6 h-6" />}
            title="Total Dockets"
            value={totalDockets}
            subtitle={`Showing ${dockets.length} in 3D view`}
            color="blue"
          />
          <StatCard
            icon={<MapPin className="w-6 h-6" />}
            title="Active Zones"
            value={zones.length}
            subtitle={`${zones.filter((z) => z.currentOccupancy > 0).length} zones with evidence`}
            color="purple"
          />
          <StatCard
            icon={<Radio className="w-6 h-6" />}
            title="RFID Readers"
            value={readers.length}
            subtitle={`${onlineReaders} online`}
            color="green"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * StatusBadge - Connection/mode status indicator
 *
 * Polish: specific transition properties, minimum touch target
 */
interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'error';
  label: string;
  showDot?: boolean;
}

function StatusBadge({ variant, label, showDot = false }: StatusBadgeProps) {
  const variants = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const dotColors = {
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full
        text-sm font-medium border pointer-events-auto
        min-h-[36px]
        ${/* Transition: specific properties only */ ''}
        transition-[background-color,border-color,opacity] duration-150 ease-out
        ${variants[variant]}
      `}
    >
      {showDot && (
        <span
          className={`w-2 h-2 rounded-full ${dotColors[variant]}`}
          style={{
            // Subtle pulse for connected state
            animation: variant === 'success' ? 'pulseSubtle 2s ease-in-out infinite' : undefined,
          }}
        />
      )}
      <span>{label}</span>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'purple' | 'green';
}

/**
 * StatCard - Metric display card
 *
 * BEFORE:
 * - No tabular-nums on values (numbers shift when updating)
 * - No layered shadows
 *
 * AFTER:
 * - tabular-nums for stable number widths
 * - Layered shadows for depth
 * - Concentric radius harmony
 */
function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} backdrop-blur-sm p-6 rounded-xl border`}
      style={{
        // Layered shadow for realistic depth
        boxShadow: `
          0 1px 2px 0 rgba(0, 0, 0, 0.3),
          0 4px 8px -2px rgba(0, 0, 0, 0.2),
          0 12px 24px -4px rgba(0, 0, 0, 0.15)
        `,
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-white">{icon}</div>
        <span className="text-gray-400 text-sm font-medium">{title}</span>
      </div>
      {/* tabular-nums ensures numbers don't shift when value changes */}
      <div className="text-3xl font-bold text-white mb-1 tabular-nums">
        {value.toLocaleString()}
      </div>
      {/* text-wrap: pretty applied globally to p in index.css */}
      <div className="text-gray-400 text-sm">{subtitle}</div>
    </div>
  );
}
