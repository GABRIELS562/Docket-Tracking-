import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './dashboard/Dashboard';
import Login from './dashboard/Login';
import DocketSearch from './pages/DocketSearch';
import StorageManagementV2 from './pages/StorageManagementV2';
import RFIDTracking from './pages/RFIDTracking';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import AuditDashboard from './pages/AuditDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import RFIDLiveTracking from './pages/RFIDLiveTracking';
import MobileFieldOps from './pages/MobileFieldOps';
import AIClassificationDashboard from './pages/AIClassificationDashboard';
import AdvancedVisualization from './pages/AdvancedVisualization';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has a valid token
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token is still valid
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token: string) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="App">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          {isAuthenticated ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/search" element={<DocketSearch />} />
                <Route path="/storage" element={<StorageManagementV2 />} />
                <Route path="/rfid" element={<RFIDTracking />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/audit" element={<AuditDashboard />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/rfid-live" element={<RFIDLiveTracking />} />
                <Route path="/mobile" element={<MobileFieldOps />} />
                <Route path="/ai-classification" element={<AIClassificationDashboard />} />
                <Route path="/visualization" element={<AdvancedVisualization />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Routes>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          )}
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;