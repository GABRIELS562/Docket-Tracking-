import { Eye, Map, User, PanelLeft, PanelRight, Flame, Clock, Building2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

/**
 * UI POLISH - ControlPanel
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Transition Scope: specific properties (transform, background-color, box-shadow, border-color)
 * 2. Motion: scale(0.96) press state for tactile feedback
 * 3. Hit Areas: minimum 44px height for touch targets
 * 4. Shadows: layered shadows for the container, glow for active states
 * 5. Concentric Radius: outer container rounded-full (9999px), inner buttons rounded-full
 */

export default function ControlPanel() {
  const {
    viewMode,
    setViewMode,
    isZonePanelOpen,
    isDocketPanelOpen,
    setZonePanelOpen,
    setDocketPanelOpen,
    heatMapEnabled,
    setHeatMapEnabled,
    isPlaybackMode,
    setPlaybackMode,
    floorPlanMode,
    setFloorPlanMode,
  } = useStore();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
      {/* Container with layered shadow for depth */}
      <div
        className="bg-gray-900/90 backdrop-blur-md rounded-full border border-blue-500/30 p-2 flex gap-2"
        style={{
          // Layered shadow: immediate depth + ambient + glow
          boxShadow: `
            0 2px 4px 0 rgba(0, 0, 0, 0.3),
            0 8px 16px -4px rgba(0, 0, 0, 0.2),
            0 0 32px -8px rgba(59, 130, 246, 0.15)
          `,
        }}
      >
        {/* Panel Toggles */}
        <ViewButton
          icon={<PanelLeft className="w-5 h-5" />}
          label="Zones"
          active={isZonePanelOpen}
          onClick={() => setZonePanelOpen(!isZonePanelOpen)}
        />

        <Divider />

        {/* View Mode Buttons */}
        <ViewButton
          icon={<Eye className="w-5 h-5" />}
          label="3D View"
          active={viewMode === '3d'}
          onClick={() => setViewMode('3d')}
        />
        <ViewButton
          icon={<Map className="w-5 h-5" />}
          label="Top View"
          active={viewMode === 'top'}
          onClick={() => setViewMode('top')}
        />
        <ViewButton
          icon={<User className="w-5 h-5" />}
          label="Walk Mode"
          active={viewMode === 'firstPerson'}
          onClick={() => setViewMode('firstPerson')}
        />

        <Divider />

        {/* Heat Map Toggle */}
        <ViewButton
          icon={<Flame className="w-5 h-5" />}
          label="Heat Map"
          active={heatMapEnabled}
          onClick={() => setHeatMapEnabled(!heatMapEnabled)}
        />

        <Divider />

        {/* Timeline Playback Toggle */}
        <ViewButton
          icon={<Clock className="w-5 h-5" />}
          label="Timeline"
          active={isPlaybackMode}
          onClick={() => setPlaybackMode(!isPlaybackMode)}
        />

        <Divider />

        {/* Floor Plan Mode Toggle */}
        <div className="flex gap-1">
          <ViewButton
            icon={<Building2 className="w-5 h-5" />}
            label="3D"
            active={floorPlanMode === '3d'}
            onClick={() => setFloorPlanMode('3d')}
          />
          <ViewButton
            icon={<Map className="w-5 h-5" />}
            label="2D"
            active={floorPlanMode === '2d'}
            onClick={() => setFloorPlanMode('2d')}
          />
          <ViewButton
            icon={<Eye className="w-5 h-5" />}
            label="Split"
            active={floorPlanMode === 'split'}
            onClick={() => setFloorPlanMode('split')}
          />
        </div>

        <Divider />

        {/* Docket Panel Toggle */}
        <ViewButton
          icon={<PanelRight className="w-5 h-5" />}
          label="Dockets"
          active={isDocketPanelOpen}
          onClick={() => setDocketPanelOpen(!isDocketPanelOpen)}
        />
      </div>
    </div>
  );
}

/**
 * Divider between button groups
 */
function Divider() {
  return <div className="w-px bg-gray-700/50" />;
}

interface ViewButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * ViewButton with polished interactions
 *
 * BEFORE:
 * - Used transition-all (inefficient, can cause stutter)
 * - No press state feedback
 *
 * AFTER:
 * - Specific transition properties only
 * - scale(0.96) press state for tactile feedback
 * - Minimum 44px height for touch accessibility
 * - Glow shadow on active state
 */
function ViewButton({ icon, label, active, onClick }: ViewButtonProps) {
  return (
    <button
      onClick={onClick}
      title={active ? `${label} (active - click to close)` : label}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-full
        min-h-[44px]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
        ${/* Transition: specific properties only (never transition-all) */ ''}
        transition-[transform,background-color,box-shadow,color] duration-150 ease-out
        ${/* Press state: scale(0.96) for tactile feedback */ ''}
        active:scale-[0.96]
        ${
          active
            ? 'bg-blue-500 text-white shadow-[0_2px_8px_0_rgba(59,130,246,0.4),0_0_20px_-4px_rgba(59,130,246,0.5)]'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
        }
      `}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {/* Active indicator dot with subtle pulse - uses animate-pulse-subtle from tailwind config */}
      {active && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse-subtle" />
      )}
    </button>
  );
}
