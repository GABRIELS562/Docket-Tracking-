import { Bell, User, ChevronDown } from 'lucide-react';

const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left - Page Context */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Real-Time Tracking
        </h2>
        <div className="text-sm text-gray-500">
          <span className="font-medium">1,247</span> items tracked
        </div>
      </div>

      {/* Right - User Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Tenant Switcher */}
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <span>SAPS Forensics</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* User Menu */}
        <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">J. Gabriels</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </header>
  );
};

export default Header;
