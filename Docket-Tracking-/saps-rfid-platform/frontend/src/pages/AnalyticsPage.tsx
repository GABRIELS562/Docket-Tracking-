import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  MapPin,
  Package,
  Clock,
  AlertTriangle,
  RefreshCw,
  Zap,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

/**
 * Analytics Dashboard Page
 *
 * Professional analytics dashboard with Recharts visualizations:
 * - Zone occupancy trends (area chart)
 * - Item distribution by zone (pie chart)
 * - Movement activity over time (line chart)
 * - Reader performance metrics (bar chart)
 * - Key performance indicators (stat cards)
 */

// Zone colors matching the 3D visualization
const ZONE_COLORS: Record<string, string> = {
  'receiving': '#22c55e',
  'shipping': '#8b5cf6',
  'office': '#6366f1',
  'returns': '#f97316',
  'processing': '#eab308',
  'storage-a': '#3b82f6',
  'storage-b': '#0ea5e9',
  'staging': '#14b8a6',
  'secure-storage': '#ef4444',
};

// Generate realistic mock data for the last 24 hours
const generateOccupancyData = () => {
  const data = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    const isBusinessHours = hour >= 6 && hour <= 20;
    const baseMultiplier = isBusinessHours ? 1 : 0.3;

    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      hour: `${hour}:00`,
      'Storage A': Math.round(180 + Math.random() * 80 * baseMultiplier),
      'Storage B': Math.round(150 + Math.random() * 70 * baseMultiplier),
      Receiving: Math.round(30 + Math.random() * 50 * baseMultiplier),
      Processing: Math.round(40 + Math.random() * 30 * baseMultiplier),
      Shipping: Math.round(25 + Math.random() * 45 * baseMultiplier),
      'Secure Storage': Math.round(15 + Math.random() * 10),
    });
  }
  return data;
};

// Zone distribution data for pie chart
const generateZoneDistribution = () => [
  { name: 'Storage A', value: 245, color: ZONE_COLORS['storage-a'] },
  { name: 'Storage B', value: 198, color: ZONE_COLORS['storage-b'] },
  { name: 'Receiving', value: 67, color: ZONE_COLORS['receiving'] },
  { name: 'Shipping', value: 52, color: ZONE_COLORS['shipping'] },
  { name: 'Processing', value: 43, color: ZONE_COLORS['processing'] },
  { name: 'Staging', value: 38, color: ZONE_COLORS['staging'] },
  { name: 'Secure', value: 24, color: ZONE_COLORS['secure-storage'] },
  { name: 'Returns', value: 18, color: ZONE_COLORS['returns'] },
];

// Movement activity data
const generateMovementData = () => {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const hour = (24 - i) % 24;
    const isBusinessHours = hour >= 6 && hour <= 20;
    const baseActivity = isBusinessHours ? 80 : 15;

    data.push({
      hour: `${hour}:00`,
      movements: Math.round(baseActivity + Math.random() * 40),
      scans: Math.round(baseActivity * 3 + Math.random() * 100),
      alerts: Math.round(Math.random() * (isBusinessHours ? 5 : 1)),
    });
  }
  return data;
};

// Reader performance data
const generateReaderData = () => [
  { name: 'R1 (Receiving)', reads: 1245, uptime: 99.8, latency: 12 },
  { name: 'R2 (Receiving)', reads: 1189, uptime: 99.9, latency: 11 },
  { name: 'S1 (Shipping)', reads: 987, uptime: 99.7, latency: 14 },
  { name: 'S2 (Shipping)', reads: 1034, uptime: 99.5, latency: 13 },
  { name: 'A-N (Storage A)', reads: 567, uptime: 99.9, latency: 10 },
  { name: 'A-S (Storage A)', reads: 534, uptime: 99.8, latency: 11 },
  { name: 'B-N (Storage B)', reads: 612, uptime: 99.6, latency: 15 },
  { name: 'B-S (Storage B)', reads: 589, uptime: 98.2, latency: 18 },
  { name: 'PROC', reads: 423, uptime: 99.9, latency: 9 },
  { name: 'SEC1', reads: 234, uptime: 99.9, latency: 8 },
  { name: 'SEC2', reads: 198, uptime: 99.9, latency: 9 },
  { name: 'STG', reads: 345, uptime: 99.7, latency: 12 },
];

const AnalyticsPage = () => {
  const [occupancyData, setOccupancyData] = useState(generateOccupancyData());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const zoneDistribution = useMemo(() => generateZoneDistribution(), []);
  const movementData = useMemo(() => generateMovementData(), []);
  const readerData = useMemo(() => generateReaderData(), []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalItems = zoneDistribution.reduce((sum, z) => sum + z.value, 0);
    const totalMovements = movementData.reduce((sum, m) => sum + m.movements, 0);
    const totalScans = movementData.reduce((sum, m) => sum + m.scans, 0);
    const totalAlerts = movementData.reduce((sum, m) => sum + m.alerts, 0);
    const avgLatency = readerData.reduce((sum, r) => sum + r.latency, 0) / readerData.length;

    return {
      totalItems,
      totalMovements,
      totalScans,
      totalAlerts,
      avgLatency: avgLatency.toFixed(1),
      readersOnline: readerData.filter((r) => r.uptime > 95).length,
      totalReaders: readerData.length,
    };
  }, [zoneDistribution, movementData, readerData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setOccupancyData(generateOccupancyData());
      setLastUpdated(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setOccupancyData(generateOccupancyData());
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Real-time zone statistics, movement trends, and operational insights
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<Package className="w-5 h-5" />}
          label="Total Items"
          value={kpis.totalItems.toLocaleString()}
          trend="+12%"
          trendUp={true}
          color="cyan"
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Movements (24h)"
          value={kpis.totalMovements.toLocaleString()}
          trend="+8%"
          trendUp={true}
          color="green"
        />
        <KPICard
          icon={<Zap className="w-5 h-5" />}
          label="RFID Scans (24h)"
          value={kpis.totalScans.toLocaleString()}
          trend="Normal"
          color="blue"
        />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Alerts (24h)"
          value={kpis.totalAlerts.toString()}
          trend={kpis.totalAlerts < 20 ? 'Low' : 'High'}
          trendUp={kpis.totalAlerts < 20}
          color={kpis.totalAlerts < 20 ? 'emerald' : 'red'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Zone Occupancy Trends - Area Chart */}
        <div className="col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">Zone Occupancy Trends</h3>
              <p className="text-sm text-gray-500">Items per zone over 24 hours</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={occupancyData}>
              <defs>
                <linearGradient id="colorStorageA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorStorageB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReceiving" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f8fafc' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="Storage A"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorStorageA)"
              />
              <Area
                type="monotone"
                dataKey="Storage B"
                stroke="#0ea5e9"
                fillOpacity={1}
                fill="url(#colorStorageB)"
              />
              <Area
                type="monotone"
                dataKey="Receiving"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorReceiving)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Distribution - Pie Chart */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-white">Item Distribution</h3>
            <p className="text-sm text-gray-500">Current items by zone</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={zoneDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {zoneDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {zoneDistribution.slice(0, 4).map((zone) => (
              <div key={zone.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="text-gray-400">{zone.name}</span>
                <span className="text-white font-medium ml-auto">{zone.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Movement Activity - Line Chart */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-white">Movement Activity</h3>
            <p className="text-sm text-gray-500">Item movements and RFID scans over 24 hours</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={movementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="movements"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                name="Movements"
              />
              <Line
                type="monotone"
                dataKey="alerts"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Alerts"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Reader Performance - Bar Chart */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">Reader Performance</h3>
              <p className="text-sm text-gray-500">Reads per reader today</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400">
                {kpis.readersOnline}/{kpis.totalReaders} Online
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={readerData.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="reads" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5 text-cyan-400" />}
          label="Avg. Retrieval Time"
          value="3.2 min"
          subtext="60% faster than baseline"
          color="cyan"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
          label="System Uptime"
          value="99.8%"
          subtext="Last 30 days"
          color="emerald"
        />
        <StatCard
          icon={<MapPin className="w-5 h-5 text-purple-400" />}
          label="Busiest Zone"
          value="Storage A"
          subtext="245 items tracked"
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
          label="Avg. Latency"
          value={`${kpis.avgLatency}ms`}
          subtext="RFID read latency"
          color="amber"
        />
      </div>
    </div>
  );
};

/**
 * KPI Card Component
 */
const KPICard = ({
  icon,
  label,
  value,
  trend,
  trendUp,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  trendUp?: boolean;
  color: string;
}) => {
  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
  };

  const iconColors: Record<string, string> = {
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm rounded-xl border p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={iconColors[color]}>{icon}</span>
        <span
          className={`text-xs font-medium ${
            trendUp === true
              ? 'text-emerald-400'
              : trendUp === false
              ? 'text-red-400'
              : 'text-gray-400'
          }`}
        >
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
};

/**
 * Stat Card Component
 */
const StatCard = ({
  icon,
  label,
  value,
  subtext,
  color: _color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: string;
}) => (
  <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <span className="text-sm text-gray-400">{label}</span>
    </div>
    <p className="text-xl font-bold text-white">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{subtext}</p>
  </div>
);

export default AnalyticsPage;
