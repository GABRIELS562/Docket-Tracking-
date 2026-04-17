import { Bell, User, ChevronDown, LogOut, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTenantConfig, useUnacknowledgedCount } from '../../stores/aiAnalyticsStore';

const Header = () => {
  const navigate = useNavigate();
  // Use individual selector to avoid re-renders
  const user = useAuthStore((s) => s.user);
  const tenantConfig = useTenantConfig();
  const unacknowledgedCount = useUnacknowledgedCount();

  const handleChangeTenant = () => {
    localStorage.removeItem('selectedTenant');
    navigate('/');
  };

  // Get tenant icon component
  const TenantIcon = tenantConfig?.icon || Brain;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left - Tenant Info */}
      <div className="flex items-center gap-4">
        {tenantConfig && (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tenantConfig.color}15` }}
            >
              <TenantIcon className="w-5 h-5" style={{ color: tenantConfig.color }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {tenantConfig.name}
              </h2>
              <p className="text-xs text-gray-500">{tenantConfig.industry}</p>
            </div>
          </div>
        )}

        {/* AI Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-100">
          <Brain className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-700 font-medium">AI Active</span>
          {unacknowledgedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
              {unacknowledgedCount}
            </span>
          )}
        </div>
      </div>

      {/* Right - User Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {unacknowledgedCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Change Client Button */}
        <button
          onClick={handleChangeTenant}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Change Client</span>
        </button>

        {/* User Menu */}
        <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">{user?.name || 'Demo User'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'Admin'}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </header>
  );
};

export default Header;
