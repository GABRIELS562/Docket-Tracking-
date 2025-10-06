import { Link, useLocation } from 'react-router-dom';
import { Box, BarChart3, Settings, Package } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const tabs = [
    { name: 'Dashboard', path: '/', icon: Box },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mr-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">SAPS RFID</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Evidence Tracking</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
