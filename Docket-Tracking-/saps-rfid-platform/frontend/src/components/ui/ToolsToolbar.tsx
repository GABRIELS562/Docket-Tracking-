import { useState, useEffect } from 'react';
import {
  Calculator,
  Sparkles,
  X,
  Menu,
} from 'lucide-react';

/**
 * Tools Toolbar
 *
 * Floating toolbar with toggle buttons for various panels.
 * Keeps the 3D view clean while providing easy access to tools.
 */

interface ToolsToolbarProps {
  showROI: boolean;
  setShowROI: (show: boolean) => void;
  showDemo: boolean;
  setShowDemo: (show: boolean) => void;
}

const ToolsToolbar = ({
  showROI,
  setShowROI,
  showDemo,
  setShowDemo,
}: ToolsToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard shortcut to toggle toolbar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Press 'M' to toggle menu
      if (e.key === 'm' || e.key === 'M') {
        setIsExpanded((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tools = [
    {
      id: 'roi',
      icon: Calculator,
      label: 'ROI Calculator',
      active: showROI,
      toggle: () => setShowROI(!showROI),
      color: 'emerald',
    },
    {
      id: 'demo',
      icon: Sparkles,
      label: 'Demo Controls',
      active: showDemo,
      toggle: () => setShowDemo(!showDemo),
      color: 'cyan',
    },
  ];

  const colorClasses: Record<string, { active: string; inactive: string }> = {
    emerald: {
      active: 'bg-emerald-500/30 text-emerald-400 border-emerald-500/50',
      inactive: 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10',
    },
    cyan: {
      active: 'bg-cyan-500/30 text-cyan-400 border-cyan-500/50',
      inactive: 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10',
    },
    blue: {
      active: 'bg-blue-500/30 text-blue-400 border-blue-500/50',
      inactive: 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10',
    },
  };

  return (
    <div className="absolute top-24 left-4 z-30">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-2.5 rounded-xl border backdrop-blur-sm transition-all ${
          isExpanded
            ? 'bg-white/10 border-white/20 text-white'
            : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-black/60'
        }`}
        title="Toggle tools (M)"
      >
        {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Expanded toolbar */}
      {isExpanded && (
        <div className="mt-2 p-2 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/20 space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colors = colorClasses[tool.color];

            return (
              <button
                key={tool.id}
                onClick={tool.toggle}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                  tool.active ? colors.active : colors.inactive
                }`}
                title={tool.label}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tool.label}</span>
              </button>
            );
          })}

          {/* Hint */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-[10px] text-gray-600 text-center">
              Press <kbd className="px-1 bg-white/10 rounded">P</kbd> for auto-demo
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsToolbar;
