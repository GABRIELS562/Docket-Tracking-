import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface ReportMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

const Reports: React.FC = () => {
  const { theme } = useTheme();
  const [reportType, setReportType] = useState<'overview' | 'activity' | 'storage' | 'billing' | 'audit'>('overview');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [showExportModal, setShowExportModal] = useState(false);

  const metrics: ReportMetric[] = [
    { label: 'Total Dockets', value: '487,234', change: 5.2, trend: 'up' },
    { label: 'Active Retrievals', value: '1,245', change: -2.1, trend: 'down' },
    { label: 'Storage Utilization', value: '72.5%', change: 3.8, trend: 'up' },
    { label: 'Monthly Revenue', value: 'R498,240', change: 8.5, trend: 'up' },
    { label: 'Avg. Retrieval Time', value: '1.8 hrs', change: -15, trend: 'down' },
    { label: 'Client Satisfaction', value: '94.2%', change: 1.2, trend: 'up' }
  ];

  const activityData: ChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Dockets In',
        data: [145, 189, 156, 201, 178, 98, 45],
        color: theme.colors.primary
      },
      {
        label: 'Dockets Out',
        data: [89, 123, 98, 156, 145, 67, 34],
        color: theme.colors.secondary
      }
    ]
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = (trend?: string, change?: number) => {
    if (!trend || !change) return theme.colors.textSecondary;
    if (trend === 'up') return change > 0 ? theme.colors.success : theme.colors.error;
    if (trend === 'down') return change < 0 ? theme.colors.success : theme.colors.error;
    return theme.colors.textSecondary;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Comprehensive insights into your docket management system</p>
      </div>

      {/* Report Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['overview', 'activity', 'storage', 'billing', 'audit'] as const).map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={reportType === type ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ textTransform: 'capitalize' }}
              >
                {type === 'overview' && '📊 '}
                {type === 'activity' && '📈 '}
                {type === 'storage' && '📦 '}
                {type === 'billing' && '💰 '}
                {type === 'audit' && '🔍 '}
                {type}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.textPrimary,
                fontSize: '0.875rem'
              }}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowExportModal(true)}>
              📥 Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Overview Report */}
      {reportType === 'overview' && (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {metrics.map((metric, idx) => (
              <div key={idx} className="card">
                <div className="card-body" style={{ padding: '1.25rem' }}>
                  <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {metric.label}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                      {metric.value}
                    </h3>
                  </div>
                  {metric.change !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                      <span style={{ color: getTrendColor(metric.trend, metric.change) }}>
                        {getTrendIcon(metric.trend)} {Math.abs(metric.change)}%
                      </span>
                      <span style={{ color: theme.colors.textDisabled }}>vs last period</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Activity Chart */}
            <div className="card">
              <div className="card-header">
                <h2>Weekly Activity</h2>
              </div>
              <div className="card-body">
                <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                  {activityData.labels.map((label, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div
                          style={{
                            width: '100%',
                            height: `${activityData.datasets[1].data[idx] * 1.5}px`,
                            background: activityData.datasets[1].color,
                            borderRadius: '4px 4px 0 0',
                            opacity: 0.8
                          }}
                        ></div>
                        <div
                          style={{
                            width: '100%',
                            height: `${activityData.datasets[0].data[idx] * 1.5}px`,
                            background: activityData.datasets[0].color,
                            borderRadius: '0 0 4px 4px'
                          }}
                        ></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, marginTop: '0.5rem' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', background: activityData.datasets[0].color, borderRadius: '2px' }}></div>
                    <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>Dockets In</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', background: activityData.datasets[1].color, borderRadius: '2px' }}></div>
                    <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>Dockets Out</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Distribution */}
            <div className="card">
              <div className="card-header">
                <h2>Storage Distribution</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke={theme.colors.backgroundElevated} strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={theme.colors.primary}
                        strokeWidth="8"
                        strokeDasharray={`${72.5 * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700' }}>72.5%</div>
                      <div style={{ fontSize: '0.75rem', color: theme.colors.textSecondary }}>Utilized</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: '0.25rem' }}>Zone A</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: theme.colors.backgroundElevated, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: '78%', height: '100%', background: theme.colors.primary }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem' }}>78%</span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: '0.25rem' }}>Zone B</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: theme.colors.backgroundElevated, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: '92%', height: '100%', background: theme.colors.warning }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem' }}>92%</span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: '0.25rem' }}>Zone C</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: theme.colors.backgroundElevated, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: '65%', height: '100%', background: theme.colors.success }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem' }}>65%</span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: '0.25rem' }}>Zone D</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: theme.colors.backgroundElevated, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: '45%', height: '100%', background: theme.colors.success }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem' }}>45%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Clients */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h2>Top Clients by Volume</h2>
            </div>
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Client</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Total Dockets</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Active Storage</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Monthly Retrievals</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>Department of Justice</td>
                      <td style={{ padding: '0.75rem' }}>156,234</td>
                      <td style={{ padding: '0.75rem' }}>3,456 boxes</td>
                      <td style={{ padding: '0.75rem' }}>234</td>
                      <td style={{ padding: '0.75rem', fontWeight: '600', color: theme.colors.success }}>R138,240</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>Metro Police Department</td>
                      <td style={{ padding: '0.75rem' }}>98,567</td>
                      <td style={{ padding: '0.75rem' }}>2,189 boxes</td>
                      <td style={{ padding: '0.75rem' }}>456</td>
                      <td style={{ padding: '0.75rem', fontWeight: '600', color: theme.colors.success }}>R87,560</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>Provincial Court</td>
                      <td style={{ padding: '0.75rem' }}>76,432</td>
                      <td style={{ padding: '0.75rem' }}>1,678 boxes</td>
                      <td style={{ padding: '0.75rem' }}>189</td>
                      <td style={{ padding: '0.75rem', fontWeight: '600', color: theme.colors.success }}>R67,120</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Activity Report */}
      {reportType === 'activity' && (
        <div className="card">
          <div className="card-header">
            <h2>Activity Report</h2>
          </div>
          <div className="card-body">
            <p style={{ color: theme.colors.textSecondary }}>Detailed activity tracking and movement analysis</p>
            {/* Activity report content would go here */}
          </div>
        </div>
      )}

      {/* Storage Report */}
      {reportType === 'storage' && (
        <div className="card">
          <div className="card-header">
            <h2>Storage Report</h2>
          </div>
          <div className="card-body">
            <p style={{ color: theme.colors.textSecondary }}>Storage utilization and capacity planning</p>
            {/* Storage report content would go here */}
          </div>
        </div>
      )}

      {/* Billing Report */}
      {reportType === 'billing' && (
        <div className="card">
          <div className="card-header">
            <h2>Billing Report</h2>
          </div>
          <div className="card-body">
            <p style={{ color: theme.colors.textSecondary }}>Revenue analysis and billing details</p>
            {/* Billing report content would go here */}
          </div>
        </div>
      )}

      {/* Audit Report */}
      {reportType === 'audit' && (
        <div className="card">
          <div className="card-header">
            <h2>Audit Trail Report</h2>
          </div>
          <div className="card-body">
            <p style={{ color: theme.colors.textSecondary }}>System access logs and compliance tracking</p>
            {/* Audit report content would go here */}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export Report</h2>
              <button className="close-btn" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Select Export Format</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button className="btn btn-outline" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    📄 PDF Report
                  </button>
                  <button className="btn btn-outline" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    📊 Excel Spreadsheet
                  </button>
                  <button className="btn btn-outline" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    📈 CSV Data
                  </button>
                  <button className="btn btn-outline" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    🖼️ PNG Charts
                  </button>
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Email Report To:</h3>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%' }}
                  placeholder="email@example.com"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>Download</button>
                <button className="btn btn-secondary" style={{ flex: 1 }}>Email Report</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;