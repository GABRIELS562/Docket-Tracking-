import { Users, Building, Shield, Database } from 'lucide-react';

const AdminPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Tenant management, user roles, and system configuration
        </p>
      </div>

      {/* Admin Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Tenant Management</h3>
              <p className="text-sm text-gray-600">3 active tenants</p>
            </div>
          </div>
          <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Manage Tenants
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">User Management</h3>
              <p className="text-sm text-gray-600">24 active users</p>
            </div>
          </div>
          <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Manage Users
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-600">Access control & logs</p>
            </div>
          </div>
          <button className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Security Console
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">System Health</h3>
              <p className="text-sm text-gray-600">All systems operational</p>
            </div>
          </div>
          <button className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            View Metrics
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Admin Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'New tenant created', user: 'J. Gabriels', time: '2 hours ago' },
            { action: 'User role updated', user: 'System', time: '4 hours ago' },
            { action: 'Database backup completed', user: 'System', time: '1 day ago' },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.user}</p>
              </div>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
