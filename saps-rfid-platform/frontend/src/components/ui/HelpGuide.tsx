import { useState, useEffect } from 'react';
import { X, HelpCircle, Mouse, Search, Eye, Radio, MapPin, Keyboard, Layers, Zap } from 'lucide-react';

/**
 * Help Guide Overlay
 *
 * Interactive guide explaining how to use the 3D RFID tracking system
 */
const HelpGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'navigation' | 'tracking' | 'features' | 'shortcuts'>('navigation');

  // Show on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenGuide');
    if (!hasSeenGuide) {
      setTimeout(() => setIsOpen(true), 2000);
      localStorage.setItem('hasSeenGuide', 'true');
    }
  }, []);

  // Listen for H key to toggle help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          setIsOpen(prev => !prev);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const tabs = [
    { id: 'navigation', label: 'Navigation', icon: Mouse },
    { id: 'tracking', label: 'Tracking', icon: Eye },
    { id: 'features', label: 'Features', icon: Layers },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  ] as const;

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 left-1/2 translate-x-32 z-20 flex items-center gap-2 px-3 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full border border-white/10 text-gray-400 hover:text-white transition-all group"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-xs">Help</span>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] group-hover:bg-white/20">H</kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">How to Use RFID Platform</h2>
                <p className="text-sm text-gray-400 mt-1">Interactive 3D warehouse tracking guide</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 py-2 border-b border-white/5 flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {activeTab === 'navigation' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="text-4xl mb-2">🖱️</div>
                    <h3 className="text-lg font-semibold text-white">Camera Navigation</h3>
                    <p className="text-gray-400 text-sm">Control the 3D view with mouse and keyboard</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <GuideCard
                      icon="🔄"
                      title="Rotate View"
                      description="Click and drag to rotate the camera around the warehouse"
                      hint="Left mouse button"
                    />
                    <GuideCard
                      icon="🔍"
                      title="Zoom In/Out"
                      description="Scroll wheel to zoom closer or further away"
                      hint="Mouse wheel"
                    />
                    <GuideCard
                      icon="↔️"
                      title="Pan View"
                      description="Right-click and drag to pan the camera"
                      hint="Right mouse button"
                    />
                    <GuideCard
                      icon="🎬"
                      title="Camera Presets"
                      description="Use the Views panel on the left for quick camera positions"
                      hint="1-8 keys"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'tracking' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="text-4xl mb-2">📍</div>
                    <h3 className="text-lg font-semibold text-white">Item Tracking</h3>
                    <p className="text-gray-400 text-sm">Find and follow items in real-time</p>
                  </div>

                  <div className="space-y-4">
                    <StepCard
                      step={1}
                      title="Search for an Item"
                      description="Use the search bar at the top to find items by EPC code, zone, or ID. Type to see autocomplete suggestions."
                    />
                    <StepCard
                      step={2}
                      title="Click to Select"
                      description="Click on an item in the search results or directly on a 3D item in the warehouse to select it."
                    />
                    <StepCard
                      step={3}
                      title="Fly to Location"
                      description="Press 'Fly To Item' to smoothly animate the camera to the item's current position."
                    />
                    <StepCard
                      step={4}
                      title="Enable Tracking"
                      description="Press 'Track Item' to follow the item as it moves between zones. The camera will automatically follow."
                    />
                  </div>
                </div>
              )}

              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="text-4xl mb-2">⚡</div>
                    <h3 className="text-lg font-semibold text-white">Platform Features</h3>
                    <p className="text-gray-400 text-sm">Powerful tools for inventory management</p>
                  </div>

                  <div className="grid gap-4">
                    <FeatureCard
                      icon={<Radio className="w-5 h-5 text-green-400" />}
                      title="14 RFID Readers"
                      description="Strategically placed across all zones - Receiving (2), Shipping (2), Storage (4), Processing, Returns, Staging, Secure (2), Office"
                    />
                    <FeatureCard
                      icon={<Search className="w-5 h-5 text-cyan-400" />}
                      title="Real-Time Search"
                      description="Find any item in <300ms across the entire inventory with autocomplete and filters"
                    />
                    <FeatureCard
                      icon={<Layers className="w-5 h-5 text-purple-400" />}
                      title="Zone Heatmap"
                      description="Toggle heatmap view to see zone density and occupancy levels"
                    />
                    <FeatureCard
                      icon={<MapPin className="w-5 h-5 text-red-400" />}
                      title="Secure Storage"
                      description="High-security zone with special monitoring for critical items"
                    />
                    <FeatureCard
                      icon={<Zap className="w-5 h-5 text-yellow-400" />}
                      title="Demo Mode"
                      description="Simulated RFID events for presentations - works without backend connection"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="text-4xl mb-2">⌨️</div>
                    <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
                    <p className="text-gray-400 text-sm">Quick actions for power users</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <ShortcutRow keys={['1']} description="Overview camera" />
                    <ShortcutRow keys={['2']} description="Top-down view" />
                    <ShortcutRow keys={['3']} description="Loading docks" />
                    <ShortcutRow keys={['4']} description="Secure storage" />
                    <ShortcutRow keys={['5']} description="Storage areas" />
                    <ShortcutRow keys={['6']} description="Processing zone" />
                    <ShortcutRow keys={['7']} description="Cinematic view" />
                    <ShortcutRow keys={['8']} description="Isometric view" />
                    <ShortcutRow keys={['T']} description="Start zone tour" />
                    <ShortcutRow keys={['O']} description="Toggle orbit" />
                    <ShortcutRow keys={['H']} description="Toggle help" />
                    <ShortcutRow keys={['Esc']} description="Close panels" />
                    <ShortcutRow keys={['/']} description="Search commands" />
                    <ShortcutRow keys={['Enter']} description="Select result" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-black/20">
              <p className="text-xs text-gray-500">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded mx-1">H</kbd> anytime to toggle this guide
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Guide Card Component
 */
const GuideCard = ({ icon, title, description, hint }: {
  icon: string;
  title: string;
  description: string;
  hint: string;
}) => (
  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <h4 className="font-semibold text-white">{title}</h4>
    </div>
    <p className="text-sm text-gray-400 mb-2">{description}</p>
    <span className="inline-block px-2 py-1 bg-white/10 rounded text-xs text-gray-300">{hint}</span>
  </div>
);

/**
 * Step Card Component
 */
const StepCard = ({ step, title, description }: {
  step: number;
  title: string;
  description: string;
}) => (
  <div className="flex gap-4 items-start">
    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">
      {step}
    </div>
    <div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  </div>
);

/**
 * Feature Card Component
 */
const FeatureCard = ({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex gap-4 items-start p-4 bg-white/5 rounded-xl border border-white/10">
    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  </div>
);

/**
 * Shortcut Row Component
 */
const ShortcutRow = ({ keys, description }: {
  keys: string[];
  description: string;
}) => (
  <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
    <span className="text-sm text-gray-300">{description}</span>
    <div className="flex gap-1">
      {keys.map((key, i) => (
        <kbd key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300 font-mono">
          {key}
        </kbd>
      ))}
    </div>
  </div>
);

export default HelpGuide;
