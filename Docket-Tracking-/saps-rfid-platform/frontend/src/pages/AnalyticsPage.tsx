import { TrendingUp, Activity, MapPin } from 'lucide-react';

const AnalyticsPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Zone statistics, movement trends, and operational insights
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Item Movement</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">342</p>
          <p className="text-sm text-gray-600 mt-1">movements today</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Avg. Retrieval Time</h3>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">3.2m</p>
          <p className="text-sm text-green-600 mt-1">↓ 60% vs. baseline</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Busiest Zone</h3>
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">Zone 3</p>
          <p className="text-sm text-gray-600 mt-1">487 items</p>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Zone Occupancy Trends</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2" />
              <p>Recharts integration coming next</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Movement Heatmap</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-2" />
              <p>Time-series analysis coming next</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
