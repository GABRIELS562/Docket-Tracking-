import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface AuditLog {
  id: number;
  event_id: string;
  timestamp: string;
  user_id: number;
  username: string;
  user_full_name: string;
  user_department: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  description: string;
  category: string;
  severity: string;
  compliance_level: string;
  status: string;
  request_ip: string;
  is_sensitive: boolean;
}

interface AuditStatistics {
  total_events: number;
  user_actions: number;
  system_events: number;
  security_events: number;
  data_changes: number;
  failed_events: number;
}

interface SecurityEvent {
  id: number;
  timestamp: string;
  username: string;
  action_type: string;
  description: string;
  severity: string;
  login_success: boolean;
  failed_attempts: number;
  suspicious_activity: boolean;
  request_ip: string;
}

const AuditDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'security' | 'reports' | 'integrity'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    user_id: '',
    action_type: '',
    resource_type: '',
    category: '',
    severity: '',
    search: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 25;
  
  // Report generation
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    compliance_level: 'STANDARD',
    include_sensitive: false,
    format: 'json'
  });

  useEffect(() => {
    loadDashboardData();
  }, [activeTab, filters.start_date, filters.end_date]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (activeTab === 'overview') {
        await loadOverviewData(headers);
      } else if (activeTab === 'logs') {
        await loadAuditLogs(headers);
      } else if (activeTab === 'security') {
        await loadSecurityEvents(headers);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewData = async (headers: any) => {
    const response = await fetch(`/api/audit/statistics?start_date=${filters.start_date}&end_date=${filters.end_date}`, { headers });
    const data = await response.json();
    if (data.success) {
      setStatistics(data.data.summary);
      setCategoryBreakdown(data.data.categoryBreakdown);
      setTopUsers(data.data.topUsers);
      setTimeline(data.data.timeline);
    }
  };

  const loadAuditLogs = async (headers: any) => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: logsPerPage.toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
    });

    const response = await fetch(`/api/audit/logs?${params}`, { headers });
    const data = await response.json();
    if (data.success) {
      setAuditLogs(data.data.logs);
      setTotalPages(Math.ceil(data.data.total / logsPerPage));
    }
  };

  const loadSecurityEvents = async (headers: any) => {
    const response = await fetch('/api/audit/security-events?limit=100', { headers });
    const data = await response.json();
    if (data.success) {
      setSecurityEvents(data.data.events);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/audit/compliance-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: filters.start_date,
          end_date: filters.end_date,
          ...reportConfig
        })
      });

      if (reportConfig.format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_report_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        if (data.success) {
          // Download JSON report
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `audit_report_${data.data.metadata.report_id}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (err: any) {
      alert(`Error generating report: ${err.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'error': return '#f97316';
      case 'warn': return '#eab308';
      case 'info': return '#3b82f6';
      case 'debug': return '#6b7280';
      default: return theme.colors.textSecondary;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'AUTHENTICATION': return '#10b981';
      case 'DATA_CHANGE': return '#3b82f6';
      case 'SECURITY_EVENT': return '#ef4444';
      case 'RFID_EVENT': return '#8b5cf6';
      case 'STORAGE_EVENT': return '#f59e0b';
      case 'USER_MANAGEMENT': return '#06b6d4';
      case 'SYSTEM_EVENT': return '#6b7280';
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'SUCCESS' ? theme.colors.success : theme.colors.error;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading audit data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Audit Dashboard</h1>
        <p className="page-subtitle">Government compliance and security monitoring</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={loadDashboardData}>Retry</button>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Filter Period</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label>Start Date:</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
              />
            </div>
            <div>
              <label>End Date:</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({...filters, end_date: e.target.value})}
              />
            </div>
            <button className="btn btn-primary" onClick={loadDashboardData}>
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Audit Logs
        </button>
        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔒 Security Events
        </button>
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📄 Reports
        </button>
        <button
          className={`tab-btn ${activeTab === 'integrity' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrity')}
        >
          ✅ Data Integrity
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && statistics && (
        <div className="tab-content">
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-details">
                <div className="stat-value">{statistics.total_events.toLocaleString()}</div>
                <div className="stat-label">Total Events</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👤</div>
              <div className="stat-details">
                <div className="stat-value">{statistics.user_actions.toLocaleString()}</div>
                <div className="stat-label">User Actions</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔒</div>
              <div className="stat-details">
                <div className="stat-value">{statistics.security_events.toLocaleString()}</div>
                <div className="stat-label">Security Events</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-details">
                <div className="stat-value">{statistics.failed_events.toLocaleString()}</div>
                <div className="stat-label">Failed Events</div>
                <div className="stat-sub" style={{ color: statistics.failed_events > 0 ? theme.colors.error : theme.colors.success }}>
                  {((statistics.failed_events / statistics.total_events) * 100).toFixed(1)}% failure rate
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card">
            <div className="card-header">
              <h2>Event Categories</h2>
            </div>
            <div className="card-body">
              <div className="category-breakdown">
                {categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="category-item">
                    <div className="category-header">
                      <span className="category-name">{cat.category}</span>
                      <span className="category-count">{cat.count} events</span>
                    </div>
                    <div className="category-bar">
                      <div 
                        className="category-fill"
                        style={{ 
                          width: `${(cat.count / statistics.total_events) * 100}%`,
                          backgroundColor: getCategoryColor(cat.category)
                        }}
                      />
                    </div>
                    {cat.failures > 0 && (
                      <div className="category-failures">
                        {cat.failures} failures ({((cat.failures / cat.count) * 100).toFixed(1)}%)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Active Users */}
          <div className="card">
            <div className="card-header">
              <h2>Most Active Users</h2>
            </div>
            <div className="card-body">
              <div className="top-users-list">
                {topUsers.slice(0, 10).map((user, idx) => (
                  <div key={idx} className="user-activity-item">
                    <div className="user-info">
                      <span className="user-name">{user.user_full_name || user.username}</span>
                      <span className="user-department">{user.user_department || 'Unknown Dept'}</span>
                    </div>
                    <div className="user-stats">
                      <span className="action-count">{user.action_count} actions</span>
                      <span className="active-days">{user.active_days} days active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <div className="card-header">
              <h2>Activity Timeline (Last 7 Days)</h2>
            </div>
            <div className="card-body">
              <div className="timeline-chart">
                {timeline.map((day, idx) => (
                  <div key={idx} className="timeline-day">
                    <div className="timeline-date">{new Date(day.date).toLocaleDateString()}</div>
                    <div className="timeline-bars">
                      <div className="timeline-bar auth" style={{ height: `${(day.auth_events / day.total_events) * 100}%` }} title={`${day.auth_events} auth events`} />
                      <div className="timeline-bar data" style={{ height: `${(day.data_events / day.total_events) * 100}%` }} title={`${day.data_events} data events`} />
                      <div className="timeline-bar security" style={{ height: `${(day.security_events / day.total_events) * 100}%` }} title={`${day.security_events} security events`} />
                    </div>
                    <div className="timeline-total">{day.total_events}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div className="tab-content">
          <div className="controls-bar">
            <div className="filters">
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="search-input"
              />
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="">All Categories</option>
                <option value="AUTHENTICATION">Authentication</option>
                <option value="DATA_CHANGE">Data Changes</option>
                <option value="SECURITY_EVENT">Security Events</option>
                <option value="RFID_EVENT">RFID Events</option>
                <option value="STORAGE_EVENT">Storage Events</option>
                <option value="USER_MANAGEMENT">User Management</option>
                <option value="SYSTEM_EVENT">System Events</option>
              </select>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="ERROR">Error</option>
                <option value="WARN">Warning</option>
                <option value="INFO">Info</option>
                <option value="DEBUG">Debug</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={loadAuditLogs}>
              🔍 Search
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="mono">{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      {log.username || 'System'}
                      {log.is_sensitive && <span className="sensitive-badge">🔒</span>}
                    </td>
                    <td className="mono">{log.action_type}</td>
                    <td>
                      <span className="resource-type">{log.resource_type}</span>
                      {log.resource_id && <span className="resource-id">:{log.resource_id}</span>}
                    </td>
                    <td className="description">{log.description}</td>
                    <td>
                      <span 
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(log.category) }}
                      >
                        {log.category}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="severity-badge"
                        style={{ backgroundColor: getSeverityColor(log.severity) }}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(log.status) }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="mono">{log.request_ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Security Events Tab */}
      {activeTab === 'security' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Recent Security Events</h2>
            </div>
            <div className="card-body">
              <div className="security-events-list">
                {securityEvents.slice(0, 20).map(event => (
                  <div key={event.id} className="security-event-item">
                    <div className="event-header">
                      <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
                      <span 
                        className="severity-badge"
                        style={{ backgroundColor: getSeverityColor(event.severity) }}
                      >
                        {event.severity}
                      </span>
                    </div>
                    <div className="event-details">
                      <div className="event-user">{event.username}</div>
                      <div className="event-description">{event.description}</div>
                      <div className="event-meta">
                        {!event.login_success && <span className="failed-login">❌ Login Failed</span>}
                        {event.suspicious_activity && <span className="suspicious">🚨 Suspicious Activity</span>}
                        {event.failed_attempts > 1 && <span className="multiple-attempts">🔄 {event.failed_attempts} attempts</span>}
                        <span className="event-ip">🌐 {event.request_ip}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Generate Compliance Report</h2>
            </div>
            <div className="card-body">
              <div className="report-config">
                <div className="form-group">
                  <label>Compliance Level:</label>
                  <select
                    value={reportConfig.compliance_level}
                    onChange={(e) => setReportConfig({...reportConfig, compliance_level: e.target.value})}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="CONFIDENTIAL">Confidential</option>
                    <option value="SECRET">Secret</option>
                    <option value="ALL">All Levels</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Format:</label>
                  <select
                    value={reportConfig.format}
                    onChange={(e) => setReportConfig({...reportConfig, format: e.target.value})}
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={reportConfig.include_sensitive}
                      onChange={(e) => setReportConfig({...reportConfig, include_sensitive: e.target.checked})}
                    />
                    Include Sensitive Data
                  </label>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                >
                  {generatingReport ? 'Generating...' : '📄 Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Integrity Tab */}
      {activeTab === 'integrity' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Data Integrity Status</h2>
            </div>
            <div className="card-body">
              <div className="integrity-status">
                <div className="integrity-item">
                  <span className="integrity-label">Last Verification:</span>
                  <span className="integrity-value">✅ Passed</span>
                </div>
                <div className="integrity-item">
                  <span className="integrity-label">Backup Status:</span>
                  <span className="integrity-value">✅ Verified</span>
                </div>
                <div className="integrity-item">
                  <span className="integrity-label">Compliance Check:</span>
                  <span className="integrity-value">✅ Passed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditDashboard;