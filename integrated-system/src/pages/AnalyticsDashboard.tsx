import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Pages.css';

interface Metrics {
  totalDockets: number;
  activeDockets: number;
  activeUsers: number;
  rfidScans: number;
  storageUtilization: number;
  complianceScore: number;
  apiRequests: number;
  avgResponseTime: number;
}

interface KPI {
  kpiCode: string;
  kpiName: string;
  actualValue: number;
  targetValue: number;
  variance: number;
  status: string;
  trend: string;
}

interface DepartmentMetric {
  departmentName: string;
  totalDockets: number;
  efficiencyScore: number;
  complianceRate: number;
  avgProcessingTime: number;
}

const AnalyticsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'kpi' | 'trends' | 'departments' | 'reports'>('overview');
  
  // Data states
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [departments, setDepartments] = useState<DepartmentMetric[]>([]);
  const [trends, setTrends] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // Report configuration
  const [reportConfig, setReportConfig] = useState({
    metrics: ['total_dockets', 'active_users', 'rfid_scans'],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    groupBy: 'day',
    format: 'json'
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all data in parallel
      const [summaryRes, alertsRes] = await Promise.all([
        fetch('/api/analytics/summary', { headers }),
        fetch('/api/analytics/alerts', { headers })
      ]);

      const summaryData = await summaryRes.json();
      const alertsData = await alertsRes.json();

      if (summaryData.success) {
        setMetrics(summaryData.data.current);
        setKpis(summaryData.data.kpis);
        setDepartments(summaryData.data.departments);
        setTrends(summaryData.data.trends);
      }

      if (alertsData.success) {
        setAlerts(alertsData.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/analytics/report/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics: reportConfig.metrics,
          date_range: reportConfig.dateRange,
          group_by: reportConfig.groupBy,
          format: reportConfig.format
        })
      });

      if (reportConfig.format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_report_${Date.now()}.csv`;
        a.click();
      } else {
        const data = await response.json();
        if (data.success) {
          // Download JSON
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `analytics_report_${Date.now()}.json`;
          a.click();
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const getKPIColor = (status: string) => {
    switch (status) {
      case 'on_target': return theme.colors.success;
      case 'above_target': return theme.colors.info;
      case 'below_target': return theme.colors.warning;
      case 'critical': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '•';
    }
  };

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="page-subtitle">Real-time metrics and KPI tracking</p>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          <strong>⚠️ Active Alerts:</strong>
          {alerts.map((alert, idx) => (
            <div key={idx}>
              {alert.rule_name}: {alert.metric_name} is {alert.actual_value} (threshold: {alert.threshold_value})
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'kpi' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpi')}
        >
          🎯 KPIs
        </button>
        <button
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          📈 Trends
        </button>
        <button
          className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          🏢 Departments
        </button>
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📄 Reports
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="tab-content">
          {/* Metrics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-details">
                <div className="stat-value">{metrics.totalDockets.toLocaleString()}</div>
                <div className="stat-label">Total Dockets</div>
                <div className="stat-sub">{metrics.activeDockets} active</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-details">
                <div className="stat-value">{metrics.activeUsers}</div>
                <div className="stat-label">Active Users Today</div>
                <div className="stat-sub">{metrics.apiRequests} operations</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📡</div>
              <div className="stat-details">
                <div className="stat-value">{metrics.rfidScans.toLocaleString()}</div>
                <div className="stat-label">RFID Scans Today</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💾</div>
              <div className="stat-details">
                <div className="stat-value">{metrics.storageUtilization.toFixed(1)}%</div>
                <div className="stat-label">Storage Utilization</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${metrics.storageUtilization}%`,
                      backgroundColor: metrics.storageUtilization > 80 ? theme.colors.warning : theme.colors.success
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card">
            <div className="card-header">
              <h2>System Performance</h2>
            </div>
            <div className="card-body">
              <div className="performance-metrics">
                <div className="metric-item">
                  <span className="metric-label">Compliance Score</span>
                  <div className="metric-value-container">
                    <span className="metric-value">{metrics.complianceScore.toFixed(1)}%</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill"
                        style={{ 
                          width: `${metrics.complianceScore}%`,
                          backgroundColor: metrics.complianceScore > 95 ? theme.colors.success : theme.colors.warning
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Avg Response Time</span>
                  <div className="metric-value-container">
                    <span className="metric-value">{metrics.avgResponseTime.toFixed(0)}ms</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill"
                        style={{ 
                          width: `${Math.min((metrics.avgResponseTime / 500) * 100, 100)}%`,
                          backgroundColor: metrics.avgResponseTime < 200 ? theme.colors.success : theme.colors.warning
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Charts */}
          {trends.dockets && (
            <div className="card">
              <div className="card-header">
                <h2>7-Day Activity Overview</h2>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trends.dockets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                      name="Docket Activity"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Tab */}
      {activeTab === 'kpi' && (
        <div className="tab-content">
          <div className="kpi-grid">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="kpi-card">
                <div className="kpi-header">
                  <h3>{kpi.kpiName}</h3>
                  <span className="kpi-trend">{getTrendIcon(kpi.trend)}</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-value-section">
                    <div className="kpi-actual" style={{ color: getKPIColor(kpi.status) }}>
                      {kpi.actualValue.toFixed(1)}
                    </div>
                    <div className="kpi-target">
                      Target: {kpi.targetValue.toFixed(1)}
                    </div>
                  </div>
                  <div className="kpi-variance">
                    <span className={kpi.variance >= 0 ? 'positive' : 'negative'}>
                      {kpi.variance >= 0 ? '+' : ''}{kpi.variance.toFixed(1)}
                    </span>
                  </div>
                  <div 
                    className="kpi-status"
                    style={{ backgroundColor: getKPIColor(kpi.status) }}
                  >
                    {kpi.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trends && (
        <div className="tab-content">
          <div className="trends-grid">
            {/* Docket Activity Trend */}
            {trends.dockets && (
              <div className="card">
                <div className="card-header">
                  <h3>Docket Activity Trend</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trends.dockets}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Dockets"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* User Activity Trend */}
            {trends.users && (
              <div className="card">
                <div className="card-header">
                  <h3>User Activity Trend</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={trends.users}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#82ca9d" name="Active Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* RFID Scans Trend */}
            {trends.rfid && (
              <div className="card">
                <div className="card-header">
                  <h3>RFID Scanning Activity</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={trends.rfid}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#ffc658" 
                        fill="#ffc658"
                        fillOpacity={0.6}
                        name="RFID Scans"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Department Performance</h2>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total Dockets</th>
                      <th>Efficiency Score</th>
                      <th>Compliance Rate</th>
                      <th>Avg Processing Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept, idx) => (
                      <tr key={idx}>
                        <td className="department-name">{dept.departmentName}</td>
                        <td>{dept.totalDockets.toLocaleString()}</td>
                        <td>
                          <div className="score-cell">
                            <span style={{ 
                              color: dept.efficiencyScore > 80 ? theme.colors.success : theme.colors.warning 
                            }}>
                              {dept.efficiencyScore.toFixed(1)}%
                            </span>
                            <div className="score-bar">
                              <div 
                                className="score-fill"
                                style={{ 
                                  width: `${dept.efficiencyScore}%`,
                                  backgroundColor: dept.efficiencyScore > 80 ? theme.colors.success : theme.colors.warning
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ 
                            color: dept.complianceRate > 95 ? theme.colors.success : theme.colors.warning 
                          }}>
                            {dept.complianceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td>{dept.avgProcessingTime} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Department Comparison Chart */}
          <div className="card">
            <div className="card-header">
              <h2>Department Comparison</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={departments.slice(0, 6)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="departmentName" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar 
                    name="Efficiency" 
                    dataKey="efficiencyScore" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Compliance" 
                    dataKey="complianceRate" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.6} 
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Custom Report Builder</h2>
            </div>
            <div className="card-body">
              <div className="report-builder">
                <div className="form-group">
                  <label>Select Metrics:</label>
                  <div className="checkbox-group">
                    {['total_dockets', 'active_users', 'rfid_scans', 'storage_utilization', 'compliance_score'].map(metric => (
                      <label key={metric} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={reportConfig.metrics.includes(metric)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReportConfig({
                                ...reportConfig,
                                metrics: [...reportConfig.metrics, metric]
                              });
                            } else {
                              setReportConfig({
                                ...reportConfig,
                                metrics: reportConfig.metrics.filter(m => m !== metric)
                              });
                            }
                          }}
                        />
                        {metric.replace('_', ' ').toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date:</label>
                    <input
                      type="date"
                      value={reportConfig.dateRange.start}
                      onChange={(e) => setReportConfig({
                        ...reportConfig,
                        dateRange: { ...reportConfig.dateRange, start: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date:</label>
                    <input
                      type="date"
                      value={reportConfig.dateRange.end}
                      onChange={(e) => setReportConfig({
                        ...reportConfig,
                        dateRange: { ...reportConfig.dateRange, end: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Group By:</label>
                    <select
                      value={reportConfig.groupBy}
                      onChange={(e) => setReportConfig({
                        ...reportConfig,
                        groupBy: e.target.value
                      })}
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Format:</label>
                    <select
                      value={reportConfig.format}
                      onChange={(e) => setReportConfig({
                        ...reportConfig,
                        format: e.target.value
                      })}
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={generateReport}>
                  📥 Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Scheduled Reports */}
          <div className="card">
            <div className="card-header">
              <h2>Scheduled Reports</h2>
            </div>
            <div className="card-body">
              <p>Configure automated reports to be generated and emailed on a schedule.</p>
              <button className="btn btn-outline">
                ⚙️ Configure Scheduled Reports
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;