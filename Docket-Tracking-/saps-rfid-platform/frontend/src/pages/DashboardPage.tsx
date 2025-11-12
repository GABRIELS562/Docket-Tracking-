import Scene from '../components/3d/Scene';

const DashboardPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">3D Facility View</h1>
        <p className="text-gray-600 mt-1">
          Real-time visualization of 1,247 tracked items across 6 zones
        </p>
      </div>

      {/* 3D Scene */}
      <div className="bg-slate-900 rounded-xl h-[calc(100vh-200px)] overflow-hidden">
        <Scene />
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
