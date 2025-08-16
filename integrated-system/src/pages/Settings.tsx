import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

const Settings: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'integrations' | 'backup'>('general');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'retrieval',
      label: 'Retrieval Requests',
      description: 'Get notified when new retrieval requests are created',
      enabled: true,
      channels: { email: true, sms: false, inApp: true }
    },
    {
      id: 'storage',
      label: 'Storage Alerts',
      description: 'Receive alerts for storage capacity and environmental changes',
      enabled: true,
      channels: { email: true, sms: true, inApp: true }
    },
    {
      id: 'billing',
      label: 'Billing & Invoices',
      description: 'Updates about invoices, payments, and billing cycles',
      enabled: true,
      channels: { email: true, sms: false, inApp: false }
    },
    {
      id: 'rfid',
      label: 'RFID System',
      description: 'Alerts for RFID reader status and tracking events',
      enabled: false,
      channels: { email: false, sms: false, inApp: true }
    }
  ]);

  const handleNotificationToggle = (id: string, field: 'enabled' | 'email' | 'sms' | 'inApp') => {
    setNotifications(prev => prev.map(notif => {
      if (notif.id === id) {
        if (field === 'enabled') {
          return { ...notif, enabled: !notif.enabled };
        } else {
          return {
            ...notif,
            channels: { ...notif.channels, [field]: !notif.channels[field as keyof typeof notif.channels] }
          };
        }
      }
      return notif;
    }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage system preferences and configurations</p>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="card-header" style={{ padding: '0' }}>
          <div style={{ display: 'flex', gap: '0', width: '100%' }}>
            {(['general', 'notifications', 'security', 'integrations', 'backup'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: activeTab === tab ? theme.colors.backgroundPaper : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${theme.colors.primary}` : `2px solid transparent`,
                  color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'general' && '⚙️ '}
                {tab === 'notifications' && '🔔 '}
                {tab === 'security' && '🔒 '}
                {tab === 'integrations' && '🔗 '}
                {tab === 'backup' && '💾 '}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>System Preferences</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Theme Setting */}
                <div style={{ paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Appearance</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Choose your preferred color theme
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.background,
                        color: theme.colors.textPrimary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {isDark ? '🌙 Dark' : '☀️ Light'}
                    </button>
                  </div>
                </div>

                {/* Language Setting */}
                <div style={{ paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Language</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Select your preferred language
                      </p>
                    </div>
                    <select
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.background,
                        color: theme.colors.textPrimary,
                        fontSize: '0.875rem'
                      }}
                    >
                      <option>English</option>
                      <option>Afrikaans</option>
                      <option>Zulu</option>
                    </select>
                  </div>
                </div>

                {/* Time Zone */}
                <div style={{ paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Time Zone</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Set your local time zone for accurate timestamps
                      </p>
                    </div>
                    <select
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.background,
                        color: theme.colors.textPrimary,
                        fontSize: '0.875rem'
                      }}
                    >
                      <option>Africa/Johannesburg (GMT+2)</option>
                      <option>Africa/Cape_Town (GMT+2)</option>
                    </select>
                  </div>
                </div>

                {/* Date Format */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Date Format</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Choose how dates are displayed throughout the system
                      </p>
                    </div>
                    <select
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.background,
                        color: theme.colors.textPrimary,
                        fontSize: '0.875rem'
                      }}
                    >
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Organization Details</h2>
            </div>
            <div className="card-body">
              <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Organization Name
                  </label>
                  <input type="text" className="search-input" style={{ width: '100%' }} defaultValue="Government Storage Services" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Registration Number
                  </label>
                  <input type="text" className="search-input" style={{ width: '100%' }} defaultValue="2024/123456/07" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Contact Email
                  </label>
                  <input type="email" className="search-input" style={{ width: '100%' }} defaultValue="admin@govstorageservices.gov.za" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Contact Phone
                  </label>
                  <input type="tel" className="search-input" style={{ width: '100%' }} defaultValue="+27 11 123 4567" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Address
                  </label>
                  <textarea
                    className="search-input"
                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                    defaultValue="123 Government Street, Pretoria, 0001, South Africa"
                  />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                  <button type="button" className="btn btn-outline">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>Notification Preferences</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{ paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{notif.label}</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                          {notif.description}
                        </p>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={notif.enabled}
                          onChange={() => handleNotificationToggle(notif.id, 'enabled')}
                        />
                        <span style={{ fontSize: '0.875rem' }}>Enabled</span>
                      </label>
                    </div>
                    {notif.enabled && (
                      <div style={{ display: 'flex', gap: '2rem', marginLeft: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notif.channels.email}
                            onChange={() => handleNotificationToggle(notif.id, 'email')}
                          />
                          <span style={{ fontSize: '0.875rem' }}>📧 Email</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notif.channels.sms}
                            onChange={() => handleNotificationToggle(notif.id, 'sms')}
                          />
                          <span style={{ fontSize: '0.875rem' }}>📱 SMS</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notif.channels.inApp}
                            onChange={() => handleNotificationToggle(notif.id, 'inApp')}
                          />
                          <span style={{ fontSize: '0.875rem' }}>🔔 In-App</span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Alert Thresholds</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Storage Capacity Alert (%)
                  </label>
                  <input type="number" className="search-input" style={{ width: '100%' }} defaultValue="90" min="50" max="100" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Temperature Alert (°C)
                  </label>
                  <input type="number" className="search-input" style={{ width: '100%' }} defaultValue="25" min="15" max="35" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Humidity Alert (%)
                  </label>
                  <input type="number" className="search-input" style={{ width: '100%' }} defaultValue="60" min="30" max="80" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Reader Offline Alert (minutes)
                  </label>
                  <input type="number" className="search-input" style={{ width: '100%' }} defaultValue="15" min="5" max="60" />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Save Alert Settings</button>
            </div>
          </div>
        </>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>Account Security</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Password</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Last changed 30 days ago
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowPasswordModal(true)}>
                      Change Password
                    </button>
                  </div>
                </div>

                <div style={{ paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Two-Factor Authentication</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <button className="btn btn-outline">Enable 2FA</button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Session Timeout</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Automatically log out after period of inactivity
                      </p>
                    </div>
                    <select
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.background,
                        color: theme.colors.textPrimary,
                        fontSize: '0.875rem'
                      }}
                    >
                      <option>15 minutes</option>
                      <option>30 minutes</option>
                      <option>1 hour</option>
                      <option>2 hours</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Access Control</h2>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>IP Whitelist</h3>
                <p style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, marginBottom: '1rem' }}>
                  Restrict system access to specific IP addresses
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    className="search-input"
                    style={{ flex: 1 }}
                    placeholder="Enter IP address (e.g., 192.168.1.1)"
                  />
                  <button className="btn btn-primary">Add IP</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: theme.colors.background, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: theme.fonts.mono, fontSize: '0.875rem' }}>192.168.1.100</span>
                    <button className="btn btn-sm btn-outline">Remove</button>
                  </div>
                  <div style={{ padding: '0.75rem', background: theme.colors.background, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: theme.fonts.mono, fontSize: '0.875rem' }}>10.0.0.0/24</span>
                    <button className="btn btn-sm btn-outline">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="card">
          <div className="card-header">
            <h2>System Integrations</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>📊</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem' }}>SAP Integration</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Sync billing and inventory data with SAP ERP
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="status-badge" style={{ backgroundColor: theme.colors.success, fontSize: '0.75rem' }}>
                          Connected
                        </span>
                        <span style={{ fontSize: '0.75rem', color: theme.colors.textSecondary }}>
                          Last sync: 2 hours ago
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline">Configure</button>
                </div>
              </div>

              <div style={{ padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>📧</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Email Service (SendGrid)</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Send automated notifications and reports
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="status-badge" style={{ backgroundColor: theme.colors.success, fontSize: '0.75rem' }}>
                          Active
                        </span>
                        <span style={{ fontSize: '0.75rem', color: theme.colors.textSecondary }}>
                          1,234 emails sent this month
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline">Configure</button>
                </div>
              </div>

              <div style={{ padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>📱</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem' }}>SMS Gateway (Twilio)</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Send SMS alerts for urgent notifications
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="status-badge" style={{ backgroundColor: theme.colors.warning, fontSize: '0.75rem' }}>
                          Not Configured
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-primary">Setup</button>
                </div>
              </div>

              <div style={{ padding: '1.5rem', background: theme.colors.background, borderRadius: '12px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>🔗</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem' }}>API Access</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Enable third-party access via REST API
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="status-badge" style={{ backgroundColor: theme.colors.info, fontSize: '0.75rem' }}>
                          2 Active Keys
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline">Manage Keys</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>Backup Configuration</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>Automatic Backups</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                        Schedule regular automated backups
                      </p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked />
                      <span style={{ fontSize: '0.875rem' }}>Enabled</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Backup Frequency
                    </label>
                    <select className="search-input" style={{ width: '100%' }}>
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Backup Time
                    </label>
                    <input type="time" className="search-input" style={{ width: '100%' }} defaultValue="02:00" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Retention Period
                    </label>
                    <select className="search-input" style={{ width: '100%' }}>
                      <option>30 days</option>
                      <option>60 days</option>
                      <option>90 days</option>
                      <option>1 year</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Storage Location
                    </label>
                    <select className="search-input" style={{ width: '100%' }}>
                      <option>Cloud Storage (AWS S3)</option>
                      <option>Local Network Storage</option>
                    </select>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save Backup Settings</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Backup History</h2>
              <button className="btn btn-primary">Backup Now</button>
            </div>
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Type</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Size</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem' }}>2024-01-30 02:00</td>
                      <td style={{ padding: '0.75rem' }}>Automatic</td>
                      <td style={{ padding: '0.75rem' }}>4.2 GB</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="status-badge" style={{ backgroundColor: theme.colors.success }}>Completed</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-sm btn-outline">Download</button>
                          <button className="btn btn-sm btn-outline">Restore</button>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem' }}>2024-01-29 02:00</td>
                      <td style={{ padding: '0.75rem' }}>Automatic</td>
                      <td style={{ padding: '0.75rem' }}>4.1 GB</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="status-badge" style={{ backgroundColor: theme.colors.success }}>Completed</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-sm btn-outline">Download</button>
                          <button className="btn btn-sm btn-outline">Restore</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Current Password
                  </label>
                  <input type="password" className="search-input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    New Password
                  </label>
                  <input type="password" className="search-input" style={{ width: '100%' }} />
                  <p style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                    Must be at least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Confirm New Password
                  </label>
                  <input type="password" className="search-input" style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Password</button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;