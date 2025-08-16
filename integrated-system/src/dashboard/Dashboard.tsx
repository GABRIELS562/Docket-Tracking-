import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import './Dashboard.css';

interface DashboardMetrics {
  totalDockets: number;
  storageBoxes: number;
  monthlyRevenue: number;
  activeRetrievals: number;
  urgentRequests: number;
}

interface ActivityItem {
  id: string;
  time: string;
  type: 'entry' | 'exit' | 'storage' | 'retrieval';
  docket?: string;
  box?: string;
  location: string;
  action: string;
}

interface StorageZone {
  name: string;
  utilization: number;
}

interface PendingRequest {
  id: string;
  urgent: boolean;
  dockets: number;
  client: string;
  timeRemaining: string;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDockets: 0,
    storageBoxes: 0,
    monthlyRevenue: 0,
    activeRetrievals: 0,
    urgentRequests: 0
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [storageZones, setStorageZones] = useState<StorageZone[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Subscribe to real-time updates
      newSocket.emit('subscribe:rfid', { locationId: 'all' });
      newSocket.emit('subscribe:storage', {});
    });

    // Real-time RFID activity
    newSocket.on('rfid:activity', (data: any) => {
      const newActivity: ActivityItem = {
        id: `activity-${Date.now()}`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: data.type,
        docket: data.docketCode,
        location: data.location,
        action: data.action
      };
      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    });

    // Storage updates
    newSocket.on('storage:docket_added', (data: any) => {
      console.log('Docket added to storage:', data);
      fetchMetrics();
    });

    newSocket.on('storage:new_request', (data: any) => {
      console.log('New storage request:', data);
      fetchPendingRequests();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchMetrics(),
        fetchStorageZones(),
        fetchPendingRequests(),
        fetchRecentActivity()
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/storage/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setMetrics({
          totalDockets: data.data.summary.total_dockets_stored || 487234,
          storageBoxes: data.data.summary.total_boxes || 4872,
          monthlyRevenue: data.data.metrics.totalRevenue || 194880,
          activeRetrievals: data.data.metrics.activeRequests || 23,
          urgentRequests: 5 // This would come from pending requests
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchStorageZones = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/storage/boxes/utilization', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const zones = [
          { name: 'Zone A', utilization: 85 },
          { name: 'Zone B', utilization: 72 },
          { name: 'Zone C', utilization: 68 },
          { name: 'Forensics', utilization: 91 }
        ];
        setStorageZones(zones);
      }
    } catch (error) {
      console.error('Error fetching storage zones:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      // In production, this would fetch from /api/storage/requests/pending
      const mockRequests: PendingRequest[] = [
        { id: 'REQ-20240115-001', urgent: true, dockets: 5, client: 'Legal Department', timeRemaining: '15 minutes' },
        { id: 'REQ-20240115-002', urgent: false, dockets: 12, client: 'Archive Review', timeRemaining: '2 hours' },
        { id: 'REQ-20240115-003', urgent: true, dockets: 3, client: 'Court Preparation', timeRemaining: '30 minutes' },
        { id: 'REQ-20240115-004', urgent: false, dockets: 8, client: 'Audit Team', timeRemaining: '4 hours' }
      ];
      setPendingRequests(mockRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // In production, this would fetch from /api/rfid/events/recent
      const mockActivities: ActivityItem[] = [
        { id: '1', time: '14:32', type: 'entry', docket: 'DOCKET-2024-1234', location: 'Evidence Room', action: 'Entered' },
        { id: '2', time: '14:31', type: 'storage', box: 'BOX-2024-0456', location: 'Zone A, Shelf 15', action: 'Stored' },
        { id: '3', time: '14:29', type: 'retrieval', docket: 'DOCKET-2024-5678', location: 'Storage Box 234', action: 'Retrieved' }
      ];
      setActivities(mockActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const searchDocket = async () => {
    if (!searchQuery) {
      alert('Please enter a docket number');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/search/docket?query=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setSearchResult({
          found: true,
          docket: data.data[0],
          location: data.data[0].current_location || 'Forensics Zone B, Storage Box 234',
          lastAccessed: '2 hours ago'
        });
      } else {
        setSearchResult({
          found: false,
          message: 'Docket not found'
        });
      }

      // Auto-hide after 10 seconds
      setTimeout(() => setSearchResult(null), 10000);
    } catch (error) {
      console.error('Error searching docket:', error);
      setSearchResult({
        found: false,
        message: 'Error searching for docket'
      });
    }
  };

  const processRequest = async (requestId: string) => {
    if (!window.confirm(`Process request ${requestId}?\n\nThis will mark the items for retrieval and notify the requester.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/storage/requests/${requestId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert(`Request ${requestId} is being processed...\n\nItems will be ready for collection in the designated timeframe.`);
        fetchPendingRequests();
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request');
    }
  };

  const quickAction = (action: string) => {
    switch (action) {
      case 'findDocket':
        const docketNumber = prompt('Enter docket number:');
        if (docketNumber) {
          setSearchQuery(docketNumber);
          searchDocket();
        }
        break;
      case 'createBox':
        alert('Opening storage box creation form...\n\nBox Type: Standard\nCapacity: 100 dockets\nMonthly Rate: R40');
        break;
      case 'requestRetrieval':
        const docketNumbers = prompt('Enter docket numbers (comma separated):');
        if (docketNumbers) {
          const urgent = window.confirm('Is this an urgent request?\n\nUrgent: R100 (30 minutes)\nNormal: R0 (2 hours)');
          alert(`Retrieval request created!\n\nDockets: ${docketNumbers}\nPriority: ${urgent ? 'URGENT' : 'NORMAL'}\nEstimated time: ${urgent ? '30 minutes' : '2 hours'}`);
          fetchPendingRequests();
        }
        break;
      case 'generateReport':
        alert('Select report type:\n\n1. Monthly Storage Report\n2. Retrieval Analytics\n3. Revenue Summary\n4. Docket Movement History\n5. Client Billing Statement');
        break;
      case 'scanBarcode':
        alert('Barcode scanner activated...\n\nPlace barcode in front of camera\nOr enter barcode manually');
        break;
      case 'bulkImport':
        alert('Bulk Import Options:\n\n1. Upload CSV file\n2. Upload Excel file\n3. Scan multiple barcodes\n4. Import from external system');
        break;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">📦</div>
            <div>
              <h1>Docket Tracking System</h1>
              <p>Managed Storage Service</p>
            </div>
          </div>
          <div className="user-menu">
            <div className="notification-bell">
              🔔
              <span className="notification-badge">{metrics.urgentRequests}</span>
            </div>
            <div className="user-info">
              <div>
                <div className="user-name">Admin User</div>
                <div className="user-role">System Administrator</div>
              </div>
              <div className="user-avatar">👤</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item">Docket Search</div>
          <div className="nav-item">Storage Management</div>
          <div className="nav-item">RFID Tracking</div>
          <div className="nav-item">Reports</div>
          <div className="nav-item">Billing</div>
          <div className="nav-item">Settings</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Quick Search Bar */}
        <div className="search-bar">
          <h2>Quick Docket Search</h2>
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="Enter docket number, case number, or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchDocket()}
            />
            <button className="search-btn" onClick={searchDocket}>
              🔍 Find Docket
            </button>
          </div>
          {searchResult && (
            <div className={`search-result ${searchResult.found ? 'found' : 'not-found'}`}>
              {searchResult.found ? (
                <div className="result-content">
                  <div>
                    <div className="result-title">Found: {searchQuery}</div>
                    <div className="result-location">Location: {searchResult.location}</div>
                    <div className="result-time">Last accessed: {searchResult.lastAccessed}</div>
                  </div>
                  <button className="track-btn">Track Location</button>
                </div>
              ) : (
                <div className="result-message">{searchResult.message}</div>
              )}
            </div>
          )}
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <div>
                <div className="metric-value">{metrics.totalDockets.toLocaleString()}</div>
                <div className="metric-label">Total Dockets</div>
              </div>
              <div className="metric-icon blue">📁</div>
            </div>
            <div className="metric-change positive">↑ 2.3% from last month</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div>
                <div className="metric-value">{metrics.storageBoxes.toLocaleString()}</div>
                <div className="metric-label">Active Storage Boxes</div>
              </div>
              <div className="metric-icon green">📦</div>
            </div>
            <div className="metric-change positive">↑ 73% utilization</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div>
                <div className="metric-value">R{metrics.monthlyRevenue.toLocaleString()}</div>
                <div className="metric-label">Monthly Revenue</div>
              </div>
              <div className="metric-icon purple">💰</div>
            </div>
            <div className="metric-change positive">↑ 8.5% growth</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div>
                <div className="metric-value">{metrics.activeRetrievals}</div>
                <div className="metric-label">Active Retrievals</div>
              </div>
              <div className="metric-icon orange">🔄</div>
            </div>
            <div className="metric-change negative">{metrics.urgentRequests} urgent pending</div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Live RFID Activity */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Live RFID Activity</h3>
              <span className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </span>
            </div>
            <div className="activity-feed">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <span className="activity-time">{activity.time}</span>
                  <span className={`activity-badge badge-${activity.type}`}>
                    {activity.action.toUpperCase()}
                  </span>
                  <span className="activity-docket">{activity.docket || activity.box}</span>
                  <span className="activity-location">{activity.location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Utilization */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Storage Zone Utilization</h3>
              <span className="real-time">Real-time</span>
            </div>
            <div className="storage-zones">
              {storageZones.map((zone) => (
                <div key={zone.name} className="zone-item">
                  <span className="zone-name">{zone.name}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${zone.utilization}%` }}>
                      <span className="progress-text">{zone.utilization}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Requests */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Pending Storage Requests</h3>
              <span className="urgent-count">{metrics.urgentRequests} Urgent</span>
            </div>
            <div className="request-list">
              {pendingRequests.map((request) => (
                <div key={request.id} className={`request-item ${request.urgent ? 'urgent' : ''}`}>
                  <div className="request-header">
                    <span className="request-id">{request.id}</span>
                    <span className={`urgency-badge ${request.urgent ? 'urgent' : 'normal'}`}>
                      {request.urgent ? 'URGENT' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="request-details">
                    <p>{request.dockets} dockets requested by {request.client}</p>
                    <p className="time-remaining">Due in {request.timeRemaining}</p>
                  </div>
                  <button className="btn-process" onClick={() => processRequest(request.id)}>
                    Process Request
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="quick-actions">
              <button className="action-btn" onClick={() => quickAction('findDocket')}>
                <div className="action-icon">🔍</div>
                <div className="action-label">Find Docket</div>
              </button>
              <button className="action-btn" onClick={() => quickAction('createBox')}>
                <div className="action-icon">📦</div>
                <div className="action-label">Create Box</div>
              </button>
              <button className="action-btn" onClick={() => quickAction('requestRetrieval')}>
                <div className="action-icon">📤</div>
                <div className="action-label">Request Retrieval</div>
              </button>
              <button className="action-btn" onClick={() => quickAction('generateReport')}>
                <div className="action-icon">📊</div>
                <div className="action-label">Generate Report</div>
              </button>
              <button className="action-btn" onClick={() => quickAction('scanBarcode')}>
                <div className="action-icon">📷</div>
                <div className="action-label">Scan Barcode</div>
              </button>
              <button className="action-btn" onClick={() => quickAction('bulkImport')}>
                <div className="action-icon">📥</div>
                <div className="action-label">Bulk Import</div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;