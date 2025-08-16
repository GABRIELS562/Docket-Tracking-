import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  department: string;
  position: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string;
  roles: string[];
  active_sessions: number;
}

interface Role {
  id: number;
  name: string;
  description: string;
  user_count: number;
  permissions: string[];
}

interface Department {
  department: string;
  user_count: number;
  active_users: number;
}

interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string;
}

const UserManagement: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'departments' | 'permissions'>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<any>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    department: '',
    position: '',
    is_admin: false,
    roles: [] as number[]
  });
  
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as number[]
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      switch (activeTab) {
        case 'users':
          await loadUsers(headers);
          break;
        case 'roles':
          await loadRoles(headers);
          break;
        case 'departments':
          await loadDepartments(headers);
          break;
        case 'permissions':
          await loadPermissions(headers);
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (headers: any) => {
    const response = await fetch('/api/users', { headers });
    const data = await response.json();
    if (data.success) {
      setUsers(data.data);
      // Also load roles for the form
      const rolesResponse = await fetch('/api/users/roles/list', { headers });
      const rolesData = await rolesResponse.json();
      if (rolesData.success) {
        setRoles(rolesData.data);
      }
    }
  };

  const loadRoles = async (headers: any) => {
    const response = await fetch('/api/users/roles/list', { headers });
    const data = await response.json();
    if (data.success) {
      setRoles(data.data);
      // Also load permissions for the form
      const permResponse = await fetch('/api/users/permissions/list', { headers });
      const permData = await permResponse.json();
      if (permData.success) {
        setPermissions(permData.data);
      }
    }
  };

  const loadDepartments = async (headers: any) => {
    const response = await fetch('/api/users/departments/list', { headers });
    const data = await response.json();
    if (data.success) {
      setDepartments(data.data);
    }
  };

  const loadPermissions = async (headers: any) => {
    const response = await fetch('/api/users/permissions/matrix', { headers });
    const data = await response.json();
    if (data.success) {
      setPermissionMatrix(data.data);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowAddUserModal(false);
        loadData();
        alert('User created successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error creating user: ${err.message}`);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowEditUserModal(false);
        loadData();
        alert('User updated successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error updating user: ${err.message}`);
    }
  };

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Password reset successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error resetting password: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        loadData();
        alert('User deactivated successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error deactivating user: ${err.message}`);
    }
  };

  const handleCreateRole = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowRoleModal(false);
        loadData();
        alert('Role created successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error creating role: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? theme.colors.success : theme.colors.error;
  };

  const getRoleColor = (role: string) => {
    if (role.toLowerCase().includes('admin')) return theme.colors.error;
    if (role.toLowerCase().includes('manager')) return theme.colors.warning;
    if (role.toLowerCase().includes('operator')) return theme.colors.info;
    return theme.colors.textSecondary;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Manage users, roles, departments, and permissions</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          🎭 Roles
        </button>
        <button
          className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          🏢 Departments
        </button>
        <button
          className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          🔐 Permissions
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="controls-bar">
            <div className="filters">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">All Departments</option>
                {[...new Set(users.map(u => u.department).filter(Boolean))].map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddUserModal(true)}>
              ➕ Add User
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="mono">
                      {user.username}
                      {user.is_admin && <span className="admin-badge"> 👑</span>}
                    </td>
                    <td>{user.full_name || '-'}</td>
                    <td>{user.email}</td>
                    <td>{user.department || '-'}</td>
                    <td>{user.position || '-'}</td>
                    <td>
                      <div className="role-tags">
                        {user.roles?.map(role => (
                          <span 
                            key={role} 
                            className="role-tag"
                            style={{ backgroundColor: getRoleColor(role) }}
                          >
                            {role}
                          </span>
                        )) || '-'}
                      </div>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(user.is_active) }}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {user.active_sessions > 0 && (
                        <span className="session-indicator"> 🟢 {user.active_sessions}</span>
                      )}
                    </td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-xs"
                          onClick={() => {
                            setSelectedUser(user);
                            setUserForm({
                              username: user.username,
                              email: user.email,
                              password: '',
                              full_name: user.full_name,
                              department: user.department,
                              position: user.position,
                              is_admin: user.is_admin,
                              roles: []
                            });
                            setShowEditUserModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-xs"
                          onClick={() => handleResetPassword(user.id)}
                        >
                          Reset Pwd
                        </button>
                        <button 
                          className="btn btn-xs btn-danger"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="tab-content">
          <div className="controls-bar">
            <h2>System Roles</h2>
            <button className="btn btn-primary" onClick={() => setShowRoleModal(true)}>
              ➕ Add Role
            </button>
          </div>

          <div className="roles-grid">
            {roles.map(role => (
              <div key={role.id} className="role-card">
                <div className="role-header">
                  <h3>{role.name}</h3>
                  <span className="user-count">{role.user_count} users</span>
                </div>
                <div className="role-description">
                  {role.description || 'No description provided'}
                </div>
                <div className="role-permissions">
                  <h4>Permissions:</h4>
                  <div className="permission-list">
                    {role.permissions?.slice(0, 5).map(perm => (
                      <span key={perm} className="permission-tag">{perm}</span>
                    ))}
                    {role.permissions?.length > 5 && (
                      <span className="permission-tag">+{role.permissions.length - 5} more</span>
                    )}
                  </div>
                </div>
                <div className="role-actions">
                  <button className="btn btn-sm">Edit</button>
                  <button className="btn btn-sm btn-outline">View Users</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Department Overview</h2>
            </div>
            <div className="card-body">
              <div className="departments-grid">
                {departments.map(dept => (
                  <div key={dept.department} className="department-card">
                    <div className="department-icon">🏢</div>
                    <div className="department-details">
                      <h3>{dept.department}</h3>
                      <div className="department-stats">
                        <div className="stat">
                          <span className="label">Total Users:</span>
                          <span className="value">{dept.user_count}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Active:</span>
                          <span className="value">{dept.active_users}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Inactive:</span>
                          <span className="value">{dept.user_count - dept.active_users}</span>
                        </div>
                      </div>
                      <div className="department-progress">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${(dept.active_users / dept.user_count) * 100}%`,
                            backgroundColor: theme.colors.success
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Permission Matrix</h2>
              <button className="btn btn-primary" onClick={() => setShowPermissionModal(true)}>
                Edit Permissions
              </button>
            </div>
            <div className="card-body">
              {permissionMatrix && (
                <div className="permission-matrix">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th>Role / Permission</th>
                        {permissionMatrix.permissions.map((perm: any) => (
                          <th key={perm.id} className="rotate">
                            <span>{perm.resource}:{perm.action}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permissionMatrix.roles.map((role: any) => (
                        <tr key={role.id}>
                          <td className="role-name">{role.name}</td>
                          {permissionMatrix.permissions.map((perm: any) => (
                            <td key={perm.id} className="permission-cell">
                              {permissionMatrix.matrix[role.id][perm.id] ? (
                                <span className="granted">✓</span>
                              ) : (
                                <span className="denied">×</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="close-btn" onClick={() => setShowAddUserModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={userForm.department}
                    onChange={(e) => setUserForm({...userForm, department: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={userForm.position}
                    onChange={(e) => setUserForm({...userForm, position: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Roles</label>
                  <div className="checkbox-group">
                    {roles.map(role => (
                      <label key={role.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={userForm.roles.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserForm({...userForm, roles: [...userForm.roles, role.id]});
                            } else {
                              setUserForm({...userForm, roles: userForm.roles.filter(r => r !== role.id)});
                            }
                          }}
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={userForm.is_admin}
                      onChange={(e) => setUserForm({...userForm, is_admin: e.target.checked})}
                    />
                    System Administrator
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateUser}>
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Role</h2>
              <button className="close-btn" onClick={() => setShowRoleModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Role Name *</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Permissions</label>
                <div className="permission-grid">
                  {permissions.map(perm => (
                    <label key={perm.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={roleForm.permissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRoleForm({...roleForm, permissions: [...roleForm.permissions, perm.id]});
                          } else {
                            setRoleForm({...roleForm, permissions: roleForm.permissions.filter(p => p !== perm.id)});
                          }
                        }}
                      />
                      {perm.resource}:{perm.action}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateRole}>
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;