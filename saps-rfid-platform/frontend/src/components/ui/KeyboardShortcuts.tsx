import { useState, useEffect } from 'react';
import {
  Keyboard,
  X,
  Camera,
  Search,
  Move,
  Eye,
  Presentation,
  HelpCircle,
} from 'lucide-react';

/**
 * Keyboard Shortcuts Overlay
 *
 * Professional keyboard shortcut reference.
 * Press ? to open, ESC to close.
 */

interface ShortcutGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcuts: { key: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Camera Views',
    icon: Camera,
    shortcuts: [
      { key: '1', description: 'Overview (default)' },
      { key: '2', description: 'Top-down view' },
      { key: '3', description: 'Loading docks' },
      { key: '4', description: 'Receiving area' },
      { key: '5', description: 'Shipping area' },
      { key: '6', description: 'Storage zones' },
      { key: '7', description: 'Secure vault' },
      { key: '8', description: 'Processing' },
      { key: '9', description: 'Cinematic view' },
      { key: '0', description: 'Isometric view' },
    ],
  },
  {
    title: 'Orbit Mode (Default)',
    icon: Move,
    shortcuts: [
      { key: 'Drag', description: 'Rotate camera' },
      { key: 'Scroll', description: 'Zoom in/out' },
      { key: 'Right-drag', description: 'Pan camera' },
      { key: 'G', description: 'Enter walk mode' },
    ],
  },
  {
    title: 'Walk Mode (FPS)',
    icon: Eye,
    shortcuts: [
      { key: '↑/↓', description: 'Move forward/backward' },
      { key: '←/→', description: 'Turn left/right' },
      { key: 'A/D', description: 'Strafe left/right' },
      { key: 'Shift', description: 'Sprint (hold)' },
      { key: 'G', description: 'Exit walk mode' },
    ],
  },
  {
    title: 'Demo & Tours',
    icon: Presentation,
    shortcuts: [
      { key: 'T', description: 'Start cinematic tour' },
      { key: 'P', description: 'Open auto-play demo' },
      { key: 'Space', description: 'Play/pause demo' },
      { key: 'ESC', description: 'Stop tour/close panels' },
    ],
  },
  {
    title: 'Search & Help',
    icon: Search,
    shortcuts: [
      { key: '/', description: 'Focus search bar' },
      { key: '?', description: 'Show this help' },
    ],
  },
];

const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    // Small floating hint button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full border border-white/10 text-gray-400 hover:text-white text-xs transition-all"
        title="Press ? for keyboard shortcuts"
      >
        <Keyboard className="w-3 h-3" />
        <span>Press</span>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">?</kbd>
        <span>for shortcuts</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-900/50 to-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-cyan-400/70 text-sm">Quick reference guide</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {SHORTCUT_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center gap-2 text-gray-400">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">
                      {group.title}
                    </span>
                  </div>

                  {/* Shortcuts */}
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <span className="text-gray-300 text-sm">
                          {shortcut.description}
                        </span>
                        <kbd className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-xs font-mono text-cyan-400 min-w-[40px] text-center">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pro Tips */}
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-amber-400 font-medium mb-1">Pro Tips</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Press <kbd className="px-1 bg-white/10 rounded text-xs">P</kbd> to start a hands-free demo presentation</li>
                  <li>• Press <kbd className="px-1 bg-white/10 rounded text-xs">T</kbd> for an automated tour of all zones</li>
                  <li>• Click on any item in the 3D view to see its details</li>
                  <li>• Use the search bar to find and fly to specific items</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            RFID Spatial Intelligence Platform
          </span>
          <span className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
