import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  BarChart3,
  Settings,
  Package,
  Radio,
  Shield,
  Building2,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  comingSoon?: boolean;
}

const Sidebar = () => {
  // Use individual selector to avoid re-renders
  const tenant = useAuthStore((s) => s.tenant);

  const navItems: NavItem[] = [
    { path: '/dashboard', icon: LayoutDashboard, label: '3D Dashboard' },
    { path: '/search', icon: Search, label: 'Search Items' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/setup', icon: Building2, label: 'Warehouse Setup', comingSoon: true },
    { path: '/admin', icon: Settings, label: 'Admin', comingSoon: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">RFID Track</h1>
            <p className="text-xs text-slate-400">Spatial Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              {item.comingSoon ? (
                // Disabled "Coming Soon" item
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 cursor-not-allowed relative group"
                  title="Coming Soon"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  <Lock className="w-3 h-3 ml-auto" />
                  {/* Coming Soon tooltip */}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Coming Soon
                  </div>
                </div>
              ) : (
                // Active navigation item
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer - Connection Status & Tenant */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-slate-400">RFID Gateway Connected</span>
        </div>
        {tenant && (
          <div className="mt-3 p-2 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              {tenant.slug === 'saps-forensics' ? (
                <Shield className="w-4 h-4 text-blue-400" />
              ) : (
                <Package className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-slate-300 font-medium">{tenant.name}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 capitalize">
              {tenant.plan} Plan
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
