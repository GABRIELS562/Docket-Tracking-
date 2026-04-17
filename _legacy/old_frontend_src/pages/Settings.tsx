import { Database, Wifi, WifiOff, Package, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Settings() {
  const { isDemoMode, setDemoMode, docketLimit, setDocketLimit } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

        {/* Data Source Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Source
          </h2>

          <div className="space-y-4">
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                {isDemoMode ? (
                  <WifiOff className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Wifi className="w-5 h-5 text-green-500" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {isDemoMode ? 'Demo Mode' : 'Live API Mode'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isDemoMode
                      ? 'Using simulated mock data for demonstration'
                      : 'Connected to live backend API at localhost:8080'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDemoMode(!isDemoMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDemoMode ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDemoMode ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                ℹ️ About Demo Mode
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• <strong>Demo Mode:</strong> Perfect for testing and demonstrations without a backend</li>
                <li>• <strong>Live Mode:</strong> Connects to your backend API and WebSocket server</li>
                <li>• Simulates real-time updates every 10-30 seconds in demo mode</li>
                <li>• All features work identically in both modes</li>
              </ul>
            </div>

            {/* API Status */}
            {!isDemoMode && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  API Configuration
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>• API URL: <code className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">http://localhost:8080/api</code></p>
                  <p>• WebSocket: <code className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">ws://localhost:8080</code></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Performance
          </h2>

          <div className="space-y-4">
            {/* Docket Limit Slider */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Visible Dockets in 3D View
                  </h3>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {docketLimit}
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Limit the number of RFID particles displayed in the 3D view for better performance.
                Total available: 670 dockets.
              </p>

              {/* Slider */}
              <div className="space-y-3">
                <input
                  type="range"
                  min="10"
                  max="670"
                  step="10"
                  value={docketLimit}
                  onChange={(e) => setDocketLimit(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                {/* Quick Presets */}
                <div className="flex gap-2">
                  {[10, 50, 100, 250, 500, 670].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDocketLimit(preset)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        docketLimit === preset
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Tips */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">
                💡 Performance Tips
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-400 space-y-1">
                <li>• <strong>10-50:</strong> Minimal view - Best for demos on slow devices</li>
                <li>• <strong>100:</strong> Balanced - Good performance with decent visualization (Default)</li>
                <li>• <strong>250-500:</strong> Dense - Shows busy labs, requires good GPU</li>
                <li>• <strong>670:</strong> Full view - All dockets visible, may impact performance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Settings Sections */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Additional Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            More settings coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
