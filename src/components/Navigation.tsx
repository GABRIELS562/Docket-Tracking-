import { Link, useLocation } from 'react-router-dom';
import { Box, BarChart3, Settings, Package, Search, Command, Workflow } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

/**
 * UI POLISH - Navigation
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Hit Areas: Nav links have 44px minimum height
 * 2. Transition Scope: specific properties only (never transition-all)
 * 3. Motion: Press state with scale(0.96)
 * 4. Shadows: Logo icon has subtle shadow
 * 5. Concentric Radius: Logo container rounded-lg (8px) with inner icon
 */

export default function Navigation() {
  const location = useLocation();
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);

  const tabs = [
    { name: 'Dashboard', path: '/', icon: Box },
    { name: 'Workflow', path: '/workflow', icon: Workflow },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* Logo with shadow */}
            <div className="flex items-center gap-3 mr-8">
              <div
                className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center"
                style={{
                  // Subtle shadow for logo
                  boxShadow: '0 2px 4px 0 rgba(37, 99, 235, 0.3)',
                }}
              >
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                {/* text-wrap: balance applied globally to h1 */}
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">RFID Tracker</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Item Tracking System</p>
              </div>
            </div>

            {/* Tabs with 44px hit areas */}
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;

                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg
                      min-h-[44px]
                      text-sm font-medium
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800
                      transition-[background-color,color,transform] duration-150 ease-out
                      active:scale-[0.96]
                      ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Search button with proper hit area and transitions */}
          <button
            onClick={() => setSearchOpen(true)}
            className="
              flex items-center gap-2 px-3 py-2
              min-h-[44px]
              bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
              text-gray-600 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800
              transition-[background-color,border-color,transform] duration-150 ease-out
              active:scale-[0.96]
            "
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search items...</span>
            <div className="flex items-center gap-0.5 ml-2 text-xs text-gray-400">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
}
