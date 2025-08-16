import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Docket Search', path: '/search', icon: '🔍' },
    { name: 'Storage Management', path: '/storage', icon: '📦' },
    { name: 'RFID Tracking', path: '/rfid', icon: '📡' },
    { name: 'Reports', path: '/reports', icon: '📈' },
    { name: 'Billing', path: '/billing', icon: '💳' },
    { name: 'User Management', path: '/users', icon: '👥' },
    { name: 'Audit Dashboard', path: '/audit', icon: '🔒' },
    { name: 'Analytics', path: '/analytics', icon: '📊' },
    { name: 'RFID Live Tracking', path: '/rfid-live', icon: '📡' },
    { name: 'Mobile Field Ops', path: '/mobile', icon: '📱' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
    window.location.reload();
  };

  return (
    <div className="layout" data-theme={theme.mode}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">📦</span>
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h2>DocketTrack</h2>
                <span className="logo-subtitle">Professional Edition</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              title={sidebarCollapsed ? item.name : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-text">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="storage-status">
            {!sidebarCollapsed && (
              <>
                <div className="status-item">
                  <span className="status-label">Storage</span>
                  <span className="status-value">487,234 Dockets</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Active</span>
                  <span className="status-value success">● Online</span>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-container">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">
              {navigation.find(n => n.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="topbar-right">
            {/* Search Bar */}
            <div className="global-search">
              <input
                type="text"
                placeholder="Quick search (Ctrl+K)"
                className="search-input"
              />
            </div>

            {/* Theme Toggle */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Notifications */}
            <button className="notification-btn">
              <span className="notification-icon">🔔</span>
              <span className="notification-badge">3</span>
            </button>

            {/* User Menu */}
            <div className="user-menu">
              <button
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar">
                  <span>AD</span>
                </div>
                <div className="user-info">
                  <span className="user-name">Admin User</span>
                  <span className="user-role">System Administrator</span>
                </div>
                <span className="dropdown-arrow">▼</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item">
                    <span>👤</span> Profile
                  </Link>
                  <Link to="/settings" className="dropdown-item">
                    <span>⚙️</span> Settings
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="dropdown-item logout">
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;