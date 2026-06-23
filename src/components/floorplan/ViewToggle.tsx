/**
 * ViewToggle - Toggle button to switch between 2D and 3D views
 * Provides primary navigation between floor plan and 3D visualization
 */

import { Map, Box, Columns } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

type ViewMode = '2d' | '3d' | 'split';

interface ViewToggleProps {
  className?: string;
  showLabels?: boolean;
}

export default function ViewToggle({ className, showLabels = true }: ViewToggleProps) {
  const { floorPlanMode, setFloorPlanMode } = useStore();

  const views: Array<{
    mode: ViewMode;
    icon: React.ReactNode;
    label: string;
    description: string;
  }> = [
    {
      mode: '2d',
      icon: <Map className="w-4 h-4" />,
      label: '2D',
      description: 'Floor Plan View',
    },
    {
      mode: '3d',
      icon: <Box className="w-4 h-4" />,
      label: '3D',
      description: '3D Visualization',
    },
    {
      mode: 'split',
      icon: <Columns className="w-4 h-4" />,
      label: 'Split',
      description: 'Side by Side',
    },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center bg-gray-800/90 backdrop-blur-sm rounded-lg p-1 border border-gray-700',
        className
      )}
    >
      {views.map((view) => (
        <button
          key={view.mode}
          onClick={() => setFloorPlanMode(view.mode)}
          title={view.description}
          className={cn(
            'relative flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200',
            'text-sm font-medium',
            floorPlanMode === view.mode
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          {view.icon}
          {showLabels && <span>{view.label}</span>}

          {/* Active indicator */}
          {floorPlanMode === view.mode && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * ViewToggleCompact - Minimal toggle for toolbar integration
 */
interface ViewToggleCompactProps {
  className?: string;
}

export function ViewToggleCompact({ className }: ViewToggleCompactProps) {
  const { floorPlanMode, setFloorPlanMode } = useStore();

  const toggleView = () => {
    const modes: ViewMode[] = ['2d', '3d', 'split'];
    const currentIndex = modes.indexOf(floorPlanMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFloorPlanMode(modes[nextIndex]);
  };

  const icons: Record<ViewMode, React.ReactNode> = {
    '2d': <Map className="w-5 h-5" />,
    '3d': <Box className="w-5 h-5" />,
    split: <Columns className="w-5 h-5" />,
  };

  const labels: Record<ViewMode, string> = {
    '2d': '2D Floor Plan',
    '3d': '3D View',
    split: 'Split View',
  };

  return (
    <button
      onClick={toggleView}
      title={`Current: ${labels[floorPlanMode]}. Click to switch view.`}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
        'transition-all duration-200',
        className
      )}
    >
      {icons[floorPlanMode]}
      <span className="text-sm font-medium">{labels[floorPlanMode]}</span>
    </button>
  );
}

/**
 * ViewTogglePrimary - Emphasized toggle for primary 2D view
 * Makes 2D the visually primary option as per requirements
 */
interface ViewTogglePrimaryProps {
  className?: string;
}

export function ViewTogglePrimary({ className }: ViewTogglePrimaryProps) {
  const { floorPlanMode, setFloorPlanMode } = useStore();

  return (
    <div
      className={cn(
        'flex flex-col gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700',
        className
      )}
    >
      <span className="text-xs text-gray-500 uppercase tracking-wider">View Mode</span>

      <div className="flex gap-1">
        {/* 2D Primary Button */}
        <button
          onClick={() => setFloorPlanMode('2d')}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-md transition-all duration-200',
            floorPlanMode === '2d'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-600'
          )}
        >
          <Map className="w-5 h-5" />
          <span className="text-xs font-medium">Floor Plan</span>
          {floorPlanMode === '2d' && <span className="text-[10px] text-blue-200">Primary</span>}
        </button>

        {/* 3D Secondary Button */}
        <button
          onClick={() => setFloorPlanMode('3d')}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-md transition-all duration-200',
            floorPlanMode === '3d'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          <Box className="w-5 h-5" />
          <span className="text-xs font-medium">3D View</span>
        </button>

        {/* Split View Button */}
        <button
          onClick={() => setFloorPlanMode('split')}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-md transition-all duration-200',
            floorPlanMode === 'split'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          <Columns className="w-5 h-5" />
          <span className="text-xs font-medium">Split</span>
        </button>
      </div>
    </div>
  );
}
