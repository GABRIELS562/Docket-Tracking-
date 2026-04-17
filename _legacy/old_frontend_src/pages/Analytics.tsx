import { useQuery } from '@tanstack/react-query';
import { BarChart3, PieChart, TrendingUp, Activity } from 'lucide-react';
import OccupancyChart from '@/components/charts/OccupancyChart';
import DistributionChart from '@/components/charts/DistributionChart';
import ReaderActivityChart from '@/components/charts/ReaderActivityChart';
import { analyticsApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { mockOccupancyData, mockDistribution, mockReaderActivity } from '@/lib/mockData';

export default function Analytics() {
  const { isDemoMode } = useStore();

  const { data: apiOccupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: ['analytics', 'occupancy'],
    queryFn: analyticsApi.getOccupancy,
    refetchInterval: 30000,
    enabled: !isDemoMode,
  });

  const { data: apiDistributionData, isLoading: distributionLoading } = useQuery({
    queryKey: ['analytics', 'distribution'],
    queryFn: analyticsApi.getDistribution,
    enabled: !isDemoMode,
  });

  const { data: apiReaderActivityData, isLoading: readerActivityLoading } = useQuery({
    queryKey: ['analytics', 'reader-activity'],
    queryFn: analyticsApi.getReaderActivity,
    enabled: !isDemoMode,
  });

  // Select data source based on mode
  const occupancyData = isDemoMode ? mockOccupancyData : apiOccupancyData;
  const distributionData = isDemoMode ? mockDistribution : apiDistributionData;
  const readerActivityData = isDemoMode ? mockReaderActivity : apiReaderActivityData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time insights and forensic evidence tracking metrics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Total Dockets"
            value={distributionData?.total || 0}
            change="+12%"
            changeType="positive"
          />
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            title="Active Zones"
            value={distributionData?.activeZones || 0}
            change="8/8"
            changeType="neutral"
          />
          <StatCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="Avg Occupancy"
            value={`${distributionData?.avgOccupancy || 0}%`}
            change="-3%"
            changeType="negative"
          />
          <StatCard
            icon={<PieChart className="w-6 h-6" />}
            title="Peak Zone"
            value={distributionData?.peakZone || 'N/A'}
            change="Biology"
            changeType="neutral"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Occupancy Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Occupancy Trends
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  24-hour zone occupancy
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            {occupancyLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                Loading...
              </div>
            ) : (
              <OccupancyChart data={occupancyData || []} />
            )}
          </div>

          {/* Zone Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Zone Distribution
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current docket allocation
                </p>
              </div>
              <PieChart className="w-5 h-5 text-purple-500" />
            </div>
            {distributionLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                Loading...
              </div>
            ) : (
              <DistributionChart data={distributionData?.zones || []} />
            )}
          </div>
        </div>

        {/* Reader Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Reader Activity
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tag reads per reader (last hour)
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-green-500" />
          </div>
          {readerActivityLoading ? (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Loading...
            </div>
          ) : (
            <ReaderActivityChart data={readerActivityData || []} />
          )}
        </div>

        {/* Top Cases Table */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Most Active Dockets
          </h2>
          <TopCasesTable />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

function StatCard({ icon, title, value, change, changeType }: StatCardProps) {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
        <p className={`text-sm ${changeColors[changeType]}`}>{change}</p>
      </div>
    </div>
  );
}

function TopCasesTable() {
  const mockData = [
    { labNumber: 'LAB-2024-001', moves: 15, lastZone: 'Biology Lab', status: 'active' },
    { labNumber: 'LAB-2024-002', moves: 12, lastZone: 'Chemistry Lab', status: 'active' },
    { labNumber: 'LAB-2024-003', moves: 9, lastZone: 'Ballistics Lab', status: 'active' },
    { labNumber: 'LAB-2024-004', moves: 7, lastZone: 'Fraud Lab', status: 'active' },
    { labNumber: 'LAB-2024-005', moves: 5, lastZone: 'Explosives Lab', status: 'active' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Lab Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Zone Changes
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Current Zone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {mockData.map((item) => (
            <tr key={item.labNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.labNumber}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.moves}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.lastZone}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
