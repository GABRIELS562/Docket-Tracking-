const DashboardPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">3D Facility View</h1>
        <p className="text-gray-600 mt-1">
          Real-time visualization of 1,247 tracked items across 6 zones
        </p>
      </div>

      {/* 3D Canvas Placeholder */}
      <div className="bg-slate-900 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-20 h-20 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">3D Scene Loading</h3>
          <p className="text-slate-400">
            Three.js + React Three Fiber integration coming next
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">1,247</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Active Zones</p>
          <p className="text-2xl font-bold text-gray-900">6</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">RFID Readers</p>
          <p className="text-2xl font-bold text-green-600">8 Online</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Last Update</p>
          <p className="text-2xl font-bold text-gray-900">2s ago</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
