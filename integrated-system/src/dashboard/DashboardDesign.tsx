/**
 * Dashboard Design for RFID Docket Tracking System
 * With Managed Storage Service
 */

import React from 'react';

// This is a design template showing the dashboard structure
// In production, this would be a full React component with state management

const DashboardDesign = () => {
  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="logo">
          <h1>Docket Tracking System</h1>
        </div>
        <div className="user-info">
          <span>Admin User</span>
          <button>Logout</button>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="main-nav">
        <ul>
          <li className="active">Dashboard</li>
          <li>Docket Search</li>
          <li>Storage Management</li>
          <li>RFID Tracking</li>
          <li>Reports</li>
          <li>Billing</li>
          <li>Settings</li>
        </ul>
      </nav>

      {/* Dashboard Content */}
      <main className="dashboard-main">
        
        {/* Key Metrics Row */}
        <section className="metrics-row">
          <div className="metric-card">
            <div className="metric-icon">📁</div>
            <div className="metric-content">
              <h3>Total Dockets</h3>
              <p className="metric-value">487,234</p>
              <span className="metric-change positive">+2.3% this month</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📦</div>
            <div className="metric-content">
              <h3>Storage Boxes</h3>
              <p className="metric-value">4,872</p>
              <span className="metric-subtitle">73% utilization</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🔍</div>
            <div className="metric-content">
              <h3>Active Retrievals</h3>
              <p className="metric-value">23</p>
              <span className="metric-subtitle">5 urgent</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <h3>Monthly Revenue</h3>
              <p className="metric-value">R194,880</p>
              <span className="metric-change positive">+8.5% vs last month</span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn primary">
              <span className="icon">🔍</span>
              Find Docket
            </button>
            <button className="action-btn">
              <span className="icon">📦</span>
              Create Storage Box
            </button>
            <button className="action-btn">
              <span className="icon">📤</span>
              Request Retrieval
            </button>
            <button className="action-btn">
              <span className="icon">📊</span>
              Generate Report
            </button>
          </div>
        </section>

        {/* Main Dashboard Grid */}
        <div className="dashboard-grid">
          
          {/* Live RFID Activity */}
          <section className="grid-item rfid-activity">
            <h2>Live RFID Activity</h2>
            <div className="activity-feed">
              <div className="activity-item">
                <span className="time">14:32</span>
                <span className="tag">DOCKET-2024-1234</span>
                <span className="action">Entered</span>
                <span className="location">Evidence Room</span>
              </div>
              <div className="activity-item">
                <span className="time">14:31</span>
                <span className="tag">BOX-2024-0456</span>
                <span className="action">Moved to</span>
                <span className="location">Storage Shelf A-15</span>
              </div>
              <div className="activity-item">
                <span className="time">14:29</span>
                <span className="tag">DOCKET-2024-5678</span>
                <span className="action">Retrieved from</span>
                <span className="location">Storage Box 234</span>
              </div>
            </div>
          </section>

          {/* Storage Utilization */}
          <section className="grid-item storage-util">
            <h2>Storage Utilization</h2>
            <div className="utilization-chart">
              <div className="storage-zones">
                <div className="zone">
                  <span className="zone-name">Zone A</span>
                  <div className="progress-bar">
                    <div className="progress" style={{width: '85%'}}></div>
                  </div>
                  <span className="percentage">85%</span>
                </div>
                <div className="zone">
                  <span className="zone-name">Zone B</span>
                  <div className="progress-bar">
                    <div className="progress" style={{width: '72%'}}></div>
                  </div>
                  <span className="percentage">72%</span>
                </div>
                <div className="zone">
                  <span className="zone-name">Zone C</span>
                  <div className="progress-bar">
                    <div className="progress" style={{width: '68%'}}></div>
                  </div>
                  <span className="percentage">68%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Searches */}
          <section className="grid-item recent-searches">
            <h2>Recent Searches</h2>
            <table className="search-table">
              <thead>
                <tr>
                  <th>Docket Code</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>DOCKET-2024-1234</td>
                  <td>Forensics Zone B</td>
                  <td><span className="status on-site">On Site</span></td>
                  <td><button className="btn-small">Track</button></td>
                </tr>
                <tr>
                  <td>DOCKET-2024-5678</td>
                  <td>Storage Box 456</td>
                  <td><span className="status stored">Stored</span></td>
                  <td><button className="btn-small">Retrieve</button></td>
                </tr>
                <tr>
                  <td>DOCKET-2023-9012</td>
                  <td>Court Transfer</td>
                  <td><span className="status transit">In Transit</span></td>
                  <td><button className="btn-small">Track</button></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Pending Requests */}
          <section className="grid-item pending-requests">
            <h2>Pending Storage Requests</h2>
            <div className="request-list">
              <div className="request-item urgent">
                <div className="request-header">
                  <span className="request-id">REQ-20240115-001</span>
                  <span className="badge urgent">URGENT</span>
                </div>
                <div className="request-details">
                  <p>5 dockets requested by Legal Dept</p>
                  <p className="time-remaining">Due in 15 minutes</p>
                </div>
                <button className="btn-process">Process</button>
              </div>
              <div className="request-item">
                <div className="request-header">
                  <span className="request-id">REQ-20240115-002</span>
                  <span className="badge normal">Normal</span>
                </div>
                <div className="request-details">
                  <p>12 dockets for archive review</p>
                  <p className="time-remaining">Due in 2 hours</p>
                </div>
                <button className="btn-process">Process</button>
              </div>
            </div>
          </section>

          {/* System Health */}
          <section className="grid-item system-health">
            <h2>System Health</h2>
            <div className="health-indicators">
              <div className="health-item">
                <span className="indicator green"></span>
                <span className="label">RFID Readers</span>
                <span className="status">All Online (25/25)</span>
              </div>
              <div className="health-item">
                <span className="indicator green"></span>
                <span className="label">Database</span>
                <span className="status">Healthy</span>
              </div>
              <div className="health-item">
                <span className="indicator yellow"></span>
                <span className="label">Storage Service</span>
                <span className="status">High Load</span>
              </div>
              <div className="health-item">
                <span className="indicator green"></span>
                <span className="label">Backup Power</span>
                <span className="status">UPS Active</span>
              </div>
            </div>
          </section>

        </div>

        {/* Monthly Billing Summary */}
        <section className="billing-summary">
          <h2>Monthly Billing Summary</h2>
          <div className="billing-grid">
            <div className="billing-card">
              <h3>Storage Fees</h3>
              <p className="amount">R194,880</p>
              <p className="detail">4,872 boxes @ R40/month</p>
            </div>
            <div className="billing-card">
              <h3>Retrieval Fees</h3>
              <p className="amount">R12,500</p>
              <p className="detail">125 standard, 25 urgent</p>
            </div>
            <div className="billing-card">
              <h3>Outstanding</h3>
              <p className="amount">R45,230</p>
              <p className="detail">3 invoices pending</p>
            </div>
            <div className="billing-card">
              <h3>Next Invoice Date</h3>
              <p className="amount">31 Jan 2024</p>
              <button className="btn-small">Preview Invoice</button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>© 2024 RFID Docket Tracking System | Version 2.0 | Support: support@dockettrack.co.za</p>
      </footer>
    </div>
  );
};

// CSS Styles (in production, use separate CSS file or styled-components)
const dashboardStyles = `
.dashboard-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f7fa;
  min-height: 100vh;
}

.dashboard-header {
  background: #1e3a8a;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.main-nav {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 2rem;
}

.main-nav ul {
  display: flex;
  gap: 2rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.main-nav li {
  padding: 1rem 0;
  cursor: pointer;
  border-bottom: 3px solid transparent;
}

.main-nav li.active {
  color: #1e3a8a;
  border-bottom-color: #1e3a8a;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.metric-icon {
  font-size: 2rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.metric-change.positive {
  color: #10b981;
}

.quick-actions {
  padding: 0 2rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn.primary {
  background: #1e3a8a;
  color: white;
  border-color: #1e3a8a;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.grid-item {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.grid-item h2 {
  margin-top: 0;
  color: #1f2937;
  font-size: 1.25rem;
}

.activity-feed {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: grid;
  grid-template-columns: 60px 150px 80px 1fr;
  gap: 1rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 4px;
  font-size: 0.875rem;
}

.progress-bar {
  height: 20px;
  background: #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status.on-site {
  background: #dbeafe;
  color: #1e40af;
}

.status.stored {
  background: #f3e8ff;
  color: #6b21a8;
}

.status.transit {
  background: #fed7aa;
  color: #c2410c;
}

.badge.urgent {
  background: #ef4444;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.indicator.green {
  background: #10b981;
}

.indicator.yellow {
  background: #f59e0b;
}

.indicator.red {
  background: #ef4444;
}

.billing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.billing-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.billing-card .amount {
  font-size: 1.75rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0.5rem 0;
}

.dashboard-footer {
  background: #f9fafb;
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  margin-top: 2rem;
}
`;

export default DashboardDesign;