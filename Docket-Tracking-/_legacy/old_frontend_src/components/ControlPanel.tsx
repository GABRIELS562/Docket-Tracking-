import { Eye, Map, User, PanelLeft, PanelRight, Flame, Clock, Building2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

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
    setFloorPlanMode
  } = useStore();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-full border border-blue-500/30 p-2 flex gap-2">
        {/* Panel Toggles */}
        <ViewButton
          icon={<PanelLeft className="w-5 h-5" />}
          label="Zones"
          active={isZonePanelOpen}
          onClick={() => setZonePanelOpen(!isZonePanelOpen)}
        />

        <div className="w-px bg-gray-700" />

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

        <div className="w-px bg-gray-700" />

        {/* Heat Map Toggle */}
        <ViewButton
          icon={<Flame className="w-5 h-5" />}
          label="Heat Map"
          active={heatMapEnabled}
          onClick={() => setHeatMapEnabled(!heatMapEnabled)}
        />

        <div className="w-px bg-gray-700" />

        {/* Timeline Playback Toggle */}
        <ViewButton
          icon={<Clock className="w-5 h-5" />}
          label="Timeline"
          active={isPlaybackMode}
          onClick={() => setPlaybackMode(!isPlaybackMode)}
        />

        <div className="w-px bg-gray-700" />

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

        <div className="w-px bg-gray-700" />

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

interface ViewButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ViewButton({ icon, label, active, onClick }: ViewButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
