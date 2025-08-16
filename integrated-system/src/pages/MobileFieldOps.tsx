import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  action: () => void;
}

interface PendingTask {
  id: string;
  type: 'retrieval' | 'storage' | 'audit' | 'transfer';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  location: string;
  dueTime: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

interface OfflineData {
  scans: Array<{
    tagId: string;
    timestamp: Date;
    location: string | { lat: number; lng: number } | null;
    action: string;
  }>;
  tasks: PendingTask[];
  lastSync: Date;
}

const MobileFieldOps: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  
  // State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    scans: [],
    tasks: [],
    lastSync: new Date()
  });

  // Mobile-specific state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GeolocationPosition | null>(null);
  const [batteryLevel, setBatteryLevel] = useState(100);

  useEffect(() => {
    loadUserData();
    loadPendingTasks();
    checkOfflineData();
    requestLocationPermission();
    monitorBattery();
    
    // Monitor online/offline status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadPendingTasks = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/mobile/tasks/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPendingTasks(data.data);
        // Cache for offline
        localStorage.setItem('mobile_tasks', JSON.stringify(data.data));
      }
    } catch (error) {
      // Load from cache if offline
      const cached = localStorage.getItem('mobile_tasks');
      if (cached) {
        setPendingTasks(JSON.parse(cached));
      }
    }
  };

  const checkOfflineData = () => {
    const stored = localStorage.getItem('offline_data');
    if (stored) {
      setOfflineData(JSON.parse(stored));
    }
  };

  const requestLocationPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setGpsLocation(position),
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true }
      );
      
      // Watch position for real-time updates
      navigator.geolocation.watchPosition(
        (position) => setGpsLocation(position),
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  const monitorBattery = async () => {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      setBatteryLevel(Math.round(battery.level * 100));
      
      battery.addEventListener('levelchange', () => {
        setBatteryLevel(Math.round(battery.level * 100));
      });
    }
  };

  const handleOnline = () => {
    setOfflineMode(false);
    syncOfflineData();
  };

  const handleOffline = () => {
    setOfflineMode(true);
  };

  const syncOfflineData = async () => {
    if (offlineData.scans.length === 0) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/mobile/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(offlineData)
      });
      
      if (response.ok) {
        // Clear offline data after successful sync
        setOfflineData({
          scans: [],
          tasks: [],
          lastSync: new Date()
        });
        localStorage.removeItem('offline_data');
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    
    try {
      // Simulate RFID scan (in real app, this would interface with device)
      const mockTagId = `TAG${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const scanData = {
        tagId: mockTagId,
        timestamp: new Date(),
        location: gpsLocation ? {
          lat: gpsLocation.coords.latitude,
          lng: gpsLocation.coords.longitude
        } : null,
        action: 'scan'
      };
      
      if (offlineMode) {
        // Store offline
        const newOfflineData = {
          ...offlineData,
          scans: [...offlineData.scans, scanData]
        };
        setOfflineData(newOfflineData);
        localStorage.setItem('offline_data', JSON.stringify(newOfflineData));
        
        setScanResult({
          success: true,
          offline: true,
          data: scanData
        });
      } else {
        // Send to server
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/mobile/scan', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(scanData)
        });
        
        const result = await response.json();
        setScanResult(result);
      }
      
      // Add to recent scans
      setRecentScans(prev => [scanData, ...prev].slice(0, 10));
      
    } catch (error) {
      console.error('Scan error:', error);
      setScanResult({ success: false, error: 'Scan failed' });
    } finally {
      setScanning(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      if (offlineMode) {
        // Mark for offline sync
        setPendingTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: 'completed' } : t
        ));
      } else {
        const token = localStorage.getItem('authToken');
        await fetch(`/api/mobile/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'scan',
      title: 'Quick Scan',
      icon: '📡',
      color: theme.colors.primary,
      action: handleScan
    },
    {
      id: 'search',
      title: 'Find Docket',
      icon: '🔍',
      color: theme.colors.info,
      action: () => console.log('Search')
    },
    {
      id: 'checkin',
      title: 'Check In',
      icon: '📥',
      color: theme.colors.success,
      action: () => console.log('Check in')
    },
    {
      id: 'checkout',
      title: 'Check Out',
      icon: '📤',
      color: theme.colors.warning,
      action: () => console.log('Check out')
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return theme.colors.error;
      case 'high': return theme.colors.warning;
      case 'medium': return theme.colors.info;
      default: return theme.colors.textSecondary;
    }
  };

  const getBatteryIcon = () => {
    if (batteryLevel > 80) return '🔋';
    if (batteryLevel > 60) return '🔋';
    if (batteryLevel > 40) return '🪫';
    if (batteryLevel > 20) return '🪫';
    return '🔴';
  };

  return (
    <div className="mobile-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="header-top">
          <h1 className="mobile-title">Field Operations</h1>
          <div className="status-indicators">
            {offlineMode && (
              <span className="offline-indicator">📵 Offline</span>
            )}
            <span className="battery-indicator">
              {getBatteryIcon()} {batteryLevel}%
            </span>
          </div>
        </div>
        
        {currentUser && (
          <div className="user-info-bar">
            <span>👤 {currentUser.full_name}</span>
            <span>📍 {currentUser.department}</span>
            {gpsLocation && (
              <span>🗺 Location Active</span>
            )}
          </div>
        )}
      </div>

      {/* Offline Mode Banner */}
      {offlineMode && (
        <div className="alert alert-warning">
          <strong>Offline Mode</strong> - {offlineData.scans.length} scans pending sync
          <button 
            className="btn btn-sm btn-outline"
            onClick={syncOfflineData}
            style={{ marginLeft: '1rem' }}
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map(action => (
            <button
              key={action.id}
              className="quick-action-btn"
              onClick={action.action}
              style={{ borderColor: action.color }}
            >
              <span className="action-icon" style={{ fontSize: '2rem' }}>
                {action.icon}
              </span>
              <span className="action-title">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scanner Section */}
      <div className="scanner-section">
        <div className="scanner-card">
          <h3>RFID Scanner</h3>
          <div className="scanner-display">
            {scanning ? (
              <div className="scanning-animation">
                <div className="scan-line"></div>
                <p>Scanning...</p>
              </div>
            ) : scanResult ? (
              <div className={`scan-result ${scanResult.success ? 'success' : 'error'}`}>
                {scanResult.success ? (
                  <>
                    <span className="result-icon">✅</span>
                    <p>Tag: {scanResult.data?.tagId}</p>
                    {scanResult.offline && <p className="offline-note">Saved for sync</p>}
                  </>
                ) : (
                  <>
                    <span className="result-icon">❌</span>
                    <p>{scanResult.error}</p>
                  </>
                )}
              </div>
            ) : (
              <div className="scanner-ready">
                <span className="scanner-icon">📡</span>
                <p>Ready to scan</p>
              </div>
            )}
          </div>
          <button 
            className="btn btn-primary btn-large"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Start Scan'}
          </button>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="tasks-section">
        <div className="section-header">
          <h2 className="section-title">Pending Tasks ({pendingTasks.length})</h2>
          <button className="btn btn-sm btn-outline" onClick={loadPendingTasks}>
            🔄 Refresh
          </button>
        </div>
        
        <div className="task-list">
          {pendingTasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <p>No pending tasks</p>
            </div>
          ) : (
            pendingTasks.map(task => (
              <div 
                key={task.id}
                className="task-card"
                onClick={() => setSelectedTask(task)}
              >
                <div className="task-header">
                  <span 
                    className="task-priority"
                    style={{ color: getPriorityColor(task.priority) }}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                  <span className="task-type">{task.type}</span>
                </div>
                <h4 className="task-title">{task.title}</h4>
                <div className="task-details">
                  <span>📍 {task.location}</span>
                  <span>⏰ {new Date(task.dueTime).toLocaleTimeString()}</span>
                </div>
                {task.status === 'in_progress' && (
                  <div className="task-progress">In Progress...</div>
                )}
                <div className="task-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      completeTask(task.id);
                    }}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Scans */}
      <div className="recent-scans-section">
        <h2 className="section-title">Recent Scans</h2>
        <div className="scan-history">
          {recentScans.length === 0 ? (
            <p className="no-scans">No recent scans</p>
          ) : (
            recentScans.map((scan, idx) => (
              <div key={idx} className="scan-item">
                <span className="scan-tag">{scan.tagId}</span>
                <span className="scan-time">
                  {new Date(scan.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal mobile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Task Details</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedTask(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="task-detail-content">
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{selectedTask.type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Priority:</span>
                  <span 
                    className="detail-value"
                    style={{ color: getPriorityColor(selectedTask.priority) }}
                  >
                    {selectedTask.priority}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Title:</span>
                  <span className="detail-value">{selectedTask.title}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedTask.location}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due:</span>
                  <span className="detail-value">
                    {new Date(selectedTask.dueTime).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn btn-primary btn-large"
                  onClick={() => {
                    completeTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                >
                  Mark Complete
                </button>
                <button 
                  className="btn btn-outline btn-large"
                  onClick={() => setSelectedTask(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mobile-container {
          max-width: 100%;
          padding: 1rem;
          background: ${theme.colors.background};
          min-height: 100vh;
        }
        
        .mobile-header {
          background: ${theme.colors.backgroundPaper};
          margin: -1rem -1rem 1rem;
          padding: 1rem;
          border-bottom: 2px solid ${theme.colors.primary};
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .mobile-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0;
        }
        
        .status-indicators {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }
        
        .offline-indicator {
          color: ${theme.colors.warning};
          font-weight: 500;
        }
        
        .battery-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .user-info-bar {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: ${theme.colors.textSecondary};
        }
        
        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .quick-actions-section {
          margin-bottom: 2rem;
        }
        
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        @media (min-width: 768px) {
          .quick-actions-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        .quick-action-btn {
          padding: 1.5rem 1rem;
          background: ${theme.colors.backgroundPaper};
          border: 2px solid ${theme.colors.border};
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .quick-action-btn:active {
          transform: scale(0.95);
        }
        
        .action-icon {
          font-size: 2rem;
        }
        
        .action-title {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .scanner-section {
          margin-bottom: 2rem;
        }
        
        .scanner-card {
          background: ${theme.colors.backgroundPaper};
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid ${theme.colors.border};
        }
        
        .scanner-display {
          height: 200px;
          background: ${theme.colors.backgroundElevated};
          border-radius: 8px;
          margin: 1rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        
        .scanning-animation {
          text-align: center;
        }
        
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: ${theme.colors.primary};
          animation: scan 2s linear infinite;
        }
        
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(200px); }
        }
        
        .scanner-ready,
        .scan-result {
          text-align: center;
        }
        
        .scanner-icon,
        .result-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .scan-result.success {
          color: ${theme.colors.success};
        }
        
        .scan-result.error {
          color: ${theme.colors.error};
        }
        
        .offline-note {
          font-size: 0.875rem;
          color: ${theme.colors.warning};
        }
        
        .btn-large {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .tasks-section {
          margin-bottom: 2rem;
        }
        
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .task-card {
          background: ${theme.colors.backgroundPaper};
          border: 1px solid ${theme.colors.border};
          border-radius: 12px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .task-card:active {
          transform: scale(0.98);
        }
        
        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .task-priority {
          font-size: 0.75rem;
          font-weight: bold;
        }
        
        .task-type {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: ${theme.colors.backgroundElevated};
          border-radius: 12px;
        }
        
        .task-title {
          margin: 0.5rem 0;
          font-size: 1rem;
        }
        
        .task-details {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: ${theme.colors.textSecondary};
          margin-bottom: 0.75rem;
        }
        
        .task-progress {
          font-size: 0.875rem;
          color: ${theme.colors.info};
          margin-bottom: 0.5rem;
        }
        
        .task-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .recent-scans-section {
          margin-bottom: 2rem;
        }
        
        .scan-history {
          background: ${theme.colors.backgroundPaper};
          border-radius: 12px;
          padding: 1rem;
        }
        
        .scan-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid ${theme.colors.border};
        }
        
        .scan-item:last-child {
          border-bottom: none;
        }
        
        .scan-tag {
          font-family: monospace;
          font-weight: 500;
        }
        
        .scan-time {
          font-size: 0.875rem;
          color: ${theme.colors.textSecondary};
        }
        
        .no-scans {
          text-align: center;
          color: ${theme.colors.textSecondary};
        }
        
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: ${theme.colors.textSecondary};
        }
        
        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .mobile-modal {
          width: 90%;
          max-width: 500px;
        }
        
        .task-detail-content {
          margin-bottom: 1.5rem;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid ${theme.colors.border};
        }
        
        .detail-label {
          font-weight: 500;
          color: ${theme.colors.textSecondary};
        }
        
        .detail-value {
          font-weight: 500;
        }
        
        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default MobileFieldOps;