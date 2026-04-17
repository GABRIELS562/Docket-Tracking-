import { useState } from 'react';
import {
  Users,
  Building,
  Shield,
  Database,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Key,
  Lock,
  Activity,
  Server,
  Wifi,
  RefreshCw,
  Download,
  Settings,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  LogIn,
  FileText,
  Briefcase,
} from 'lucide-react';

// Types
type AdminView = 'dashboard' | 'tenants' | 'tenant-detail' | 'users' | 'security' | 'system';

type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';

interface Tenant {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'enterprise' | 'professional' | 'starter';
  users: number;
  items: number;
  zones: number;
  readers: number;
  createdAt: string;
  lastActive: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  address: string;
  logo: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  permissions: {
    viewItems: boolean;
    editItems: boolean;
    deleteItems: boolean;
    viewReports: boolean;
    exportData: boolean;
    manageUsers: boolean;
    manageZones: boolean;
    viewAuditLog: boolean;
  };
  avatar: string;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  tenantId: string;
  details: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  ip: string;
}

// Demo Data
const DEMO_TENANTS: Tenant[] = [
  {
    id: 'saps-forensics',
    name: 'SAPS Forensic Science Lab',
    industry: 'Law Enforcement',
    status: 'active',
    plan: 'enterprise',
    users: 24,
    items: 1247,
    zones: 6,
    readers: 11,
    createdAt: '2024-01-15',
    lastActive: '2 minutes ago',
    contact: { name: 'Col. J. van der Merwe', email: 'jvandermerwe@saps.gov.za', phone: '+27 12 393 1000' },
    address: 'Silverton, Pretoria, Gauteng',
    logo: '🔬',
  },
  {
    id: 'pharma-biotech',
    name: 'PharmaCure Biotech',
    industry: 'Pharmaceutical',
    status: 'active',
    plan: 'professional',
    users: 18,
    items: 3420,
    zones: 8,
    readers: 15,
    createdAt: '2024-03-22',
    lastActive: '15 minutes ago',
    contact: { name: 'Dr. Sarah Chen', email: 'schen@pharmacure.co.za', phone: '+27 11 555 0123' },
    address: 'Midrand, Johannesburg, Gauteng',
    logo: '💊',
  },
  {
    id: 'retail-warehouse',
    name: 'MegaMart Distribution',
    industry: 'Retail & Logistics',
    status: 'trial',
    plan: 'starter',
    users: 8,
    items: 15600,
    zones: 12,
    readers: 24,
    createdAt: '2024-11-01',
    lastActive: '1 hour ago',
    contact: { name: 'Mike Johnson', email: 'mjohnson@megamart.co.za', phone: '+27 21 444 5678' },
    address: 'Cape Town, Western Cape',
    logo: '🏪',
  },
];

const DEMO_USERS: User[] = [
  // SAPS Users
  { id: 'u1', name: 'Col. J. van der Merwe', email: 'jvandermerwe@saps.gov.za', role: 'admin', tenantId: 'saps-forensics', status: 'active', lastLogin: '2 min ago', permissions: { viewItems: true, editItems: true, deleteItems: true, viewReports: true, exportData: true, manageUsers: true, manageZones: true, viewAuditLog: true }, avatar: '👨‍✈️' },
  { id: 'u2', name: 'Dr. Thandi Nkosi', email: 'tnkosi@saps.gov.za', role: 'manager', tenantId: 'saps-forensics', status: 'active', lastLogin: '1 hour ago', permissions: { viewItems: true, editItems: true, deleteItems: false, viewReports: true, exportData: true, manageUsers: false, manageZones: true, viewAuditLog: true }, avatar: '👩‍🔬' },
  { id: 'u3', name: 'Sgt. Pieter Botha', email: 'pbotha@saps.gov.za', role: 'analyst', tenantId: 'saps-forensics', status: 'active', lastLogin: '3 hours ago', permissions: { viewItems: true, editItems: true, deleteItems: false, viewReports: true, exportData: false, manageUsers: false, manageZones: false, viewAuditLog: false }, avatar: '👮' },
  { id: 'u4', name: 'Const. Ayanda Dlamini', email: 'adlamini@saps.gov.za', role: 'viewer', tenantId: 'saps-forensics', status: 'active', lastLogin: '1 day ago', permissions: { viewItems: true, editItems: false, deleteItems: false, viewReports: true, exportData: false, manageUsers: false, manageZones: false, viewAuditLog: false }, avatar: '👮‍♀️' },
  { id: 'u5', name: 'Dr. Willem Pretorius', email: 'wpretorius@saps.gov.za', role: 'analyst', tenantId: 'saps-forensics', status: 'pending', lastLogin: 'Never', permissions: { viewItems: true, editItems: true, deleteItems: false, viewReports: true, exportData: false, manageUsers: false, manageZones: false, viewAuditLog: false }, avatar: '🧑‍🔬' },
  // PharmaCure Users
  { id: 'u6', name: 'Dr. Sarah Chen', email: 'schen@pharmacure.co.za', role: 'admin', tenantId: 'pharma-biotech', status: 'active', lastLogin: '15 min ago', permissions: { viewItems: true, editItems: true, deleteItems: true, viewReports: true, exportData: true, manageUsers: true, manageZones: true, viewAuditLog: true }, avatar: '👩‍⚕️' },
  { id: 'u7', name: 'James Mokoena', email: 'jmokoena@pharmacure.co.za', role: 'manager', tenantId: 'pharma-biotech', status: 'active', lastLogin: '2 hours ago', permissions: { viewItems: true, editItems: true, deleteItems: false, viewReports: true, exportData: true, manageUsers: false, manageZones: true, viewAuditLog: true }, avatar: '👨‍💼' },
  // MegaMart Users
  { id: 'u8', name: 'Mike Johnson', email: 'mjohnson@megamart.co.za', role: 'admin', tenantId: 'retail-warehouse', status: 'active', lastLogin: '1 hour ago', permissions: { viewItems: true, editItems: true, deleteItems: true, viewReports: true, exportData: true, manageUsers: true, manageZones: true, viewAuditLog: true }, avatar: '👨‍💼' },
  { id: 'u9', name: 'Lisa van Wyk', email: 'lvanwyk@megamart.co.za', role: 'viewer', tenantId: 'retail-warehouse', status: 'inactive', lastLogin: '2 weeks ago', permissions: { viewItems: true, editItems: false, deleteItems: false, viewReports: true, exportData: false, manageUsers: false, manageZones: false, viewAuditLog: false }, avatar: '👩‍💻' },
];

const DEMO_AUDIT_LOGS: AuditLog[] = [
  { id: 'a1', action: 'User Login', user: 'Col. J. van der Merwe', tenantId: 'saps-forensics', details: 'Successful login from authorized device', timestamp: '2 min ago', severity: 'info', ip: '196.21.45.xxx' },
  { id: 'a2', action: 'Evidence Export', user: 'Dr. Thandi Nkosi', tenantId: 'saps-forensics', details: 'Exported 45 evidence records for case #CR-2024-1847', timestamp: '1 hour ago', severity: 'info', ip: '196.21.45.xxx' },
  { id: 'a3', action: 'Failed Login Attempt', user: 'Unknown', tenantId: 'saps-forensics', details: '3 failed attempts - account locked for 15 min', timestamp: '2 hours ago', severity: 'warning', ip: '102.65.23.xxx' },
  { id: 'a4', action: 'Permission Changed', user: 'System Admin', tenantId: 'pharma-biotech', details: 'Role updated for user James Mokoena', timestamp: '4 hours ago', severity: 'info', ip: '196.21.45.xxx' },
  { id: 'a5', action: 'Unauthorized Zone Access', user: 'Const. Ayanda Dlamini', tenantId: 'saps-forensics', details: 'Attempted access to restricted GeneMapper zone', timestamp: '6 hours ago', severity: 'critical', ip: '196.21.45.xxx' },
  { id: 'a6', action: 'Bulk Data Delete', user: 'Dr. Sarah Chen', tenantId: 'pharma-biotech', details: 'Deleted 120 expired batch records', timestamp: '1 day ago', severity: 'warning', ip: '196.21.45.xxx' },
  { id: 'a7', action: 'New User Created', user: 'Col. J. van der Merwe', tenantId: 'saps-forensics', details: 'Created user Dr. Willem Pretorius', timestamp: '2 days ago', severity: 'info', ip: '196.21.45.xxx' },
  { id: 'a8', action: 'System Backup', user: 'System', tenantId: 'all', details: 'Automated daily backup completed successfully', timestamp: '3 days ago', severity: 'info', ip: 'localhost' },
];

// Role configuration
const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin: { label: 'Administrator', color: 'text-red-600', bg: 'bg-red-100' },
  manager: { label: 'Manager', color: 'text-purple-600', bg: 'bg-purple-100' },
  analyst: { label: 'Analyst', color: 'text-blue-600', bg: 'bg-blue-100' },
  viewer: { label: 'Viewer', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const AdminPage = () => {
  const [view, setView] = useState<AdminView>('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<UserRole | 'all'>('all');

  // Navigation helpers
  const goToTenants = () => setView('tenants');
  const goToTenantDetail = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setView('tenant-detail');
  };
  const goToUsers = (tenant?: Tenant) => {
    if (tenant) setSelectedTenant(tenant);
    setView('users');
  };
  const goToSecurity = () => setView('security');
  const goToSystem = () => setView('system');
  const goBack = () => {
    if (view === 'tenant-detail') setView('tenants');
    else if (view === 'users' && selectedTenant) setView('tenant-detail');
    else setView('dashboard');
  };

  // Filter users
  const filteredUsers = DEMO_USERS.filter(u => {
    const matchesTenant = !selectedTenant || u.tenantId === selectedTenant.id;
    const matchesRole = userFilter === 'all' || u.role === userFilter;
    const matchesSearch = !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTenant && matchesRole && matchesSearch;
  });

  // Render breadcrumb
  const renderBreadcrumb = () => {
    const crumbs: { label: string; onClick?: () => void }[] = [
      { label: 'Admin', onClick: () => setView('dashboard') },
    ];

    if (view === 'tenants') {
      crumbs.push({ label: 'Tenants' });
    } else if (view === 'tenant-detail' && selectedTenant) {
      crumbs.push({ label: 'Tenants', onClick: goToTenants });
      crumbs.push({ label: selectedTenant.name });
    } else if (view === 'users') {
      crumbs.push({ label: 'Tenants', onClick: goToTenants });
      if (selectedTenant) {
        crumbs.push({ label: selectedTenant.name, onClick: () => setView('tenant-detail') });
      }
      crumbs.push({ label: 'Users' });
    } else if (view === 'security') {
      crumbs.push({ label: 'Security' });
    } else if (view === 'system') {
      crumbs.push({ label: 'System Health' });
    }

    return (
      <div className="flex items-center gap-2 text-sm mb-4">
        {crumbs.map((crumb, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            {crumb.onClick ? (
              <button onClick={crumb.onClick} className="text-blue-600 hover:text-blue-800 hover:underline">
                {crumb.label}
              </button>
            ) : (
              <span className="text-gray-600 font-medium">{crumb.label}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Dashboard View
  const renderDashboard = () => (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Platform administration, tenant management, and security controls
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tenants', value: '3', sub: '2 active, 1 trial', color: 'blue' },
          { label: 'Total Users', value: '50', sub: '47 active', color: 'green' },
          { label: 'Items Tracked', value: '20,267', sub: 'Across all tenants', color: 'purple' },
          { label: 'RFID Readers', value: '50', sub: 'All operational', color: 'orange' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-gray-600 text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Admin Cards */}
      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={goToTenants}
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Tenant Management</h3>
                <p className="text-sm text-gray-600">3 active tenants</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-sm text-gray-500">
            View and manage all tenant organizations, their subscriptions, and configurations.
          </p>
        </button>

        <button
          onClick={() => goToUsers()}
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">User Management</h3>
                <p className="text-sm text-gray-600">50 total users</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-sm text-gray-500">
            Manage users, roles, and permissions across all tenant organizations.
          </p>
        </button>

        <button
          onClick={goToSecurity}
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Security & Audit</h3>
                <p className="text-sm text-gray-600">1 alert pending</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-sm text-gray-500">
            Security settings, access control, and comprehensive audit logs.
          </p>
        </button>

        <button
          onClick={goToSystem}
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <Database className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">System Health</h3>
                <p className="text-sm text-gray-600">All systems operational</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-sm text-gray-500">
            Monitor system performance, database health, and RFID infrastructure.
          </p>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Admin Activity</h3>
          <button onClick={goToSecurity} className="text-sm text-blue-600 hover:text-blue-800">
            View All Logs →
          </button>
        </div>
        <div className="space-y-3">
          {DEMO_AUDIT_LOGS.slice(0, 4).map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  log.severity === 'critical' ? 'bg-red-500' :
                  log.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{log.action}</p>
                  <p className="text-sm text-gray-600">{log.user} • {log.details.slice(0, 50)}...</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // Tenants List View
  const renderTenants = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600">Manage all tenant organizations on the platform</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search tenants..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        />
      </div>

      {/* Tenant Cards */}
      <div className="space-y-4">
        {DEMO_TENANTS.map((tenant) => (
          <div
            key={tenant.id}
            className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                  {tenant.logo}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 text-lg">{tenant.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                      tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tenant.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      tenant.plan === 'professional' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{tenant.industry}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {tenant.users} users</span>
                    <span className="flex items-center gap-1"><Database className="w-4 h-4" /> {tenant.items.toLocaleString()} items</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {tenant.zones} zones</span>
                    <span className="flex items-center gap-1"><Wifi className="w-4 h-4" /> {tenant.readers} readers</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToUsers(tenant)}
                  className="px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Users className="w-4 h-4" />
                  Users
                </button>
                <button
                  onClick={() => goToTenantDetail(tenant)}
                  className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Details
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-gray-500">
                <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {tenant.contact.email}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {tenant.address}</span>
              </div>
              <span className="text-gray-400">Last active: {tenant.lastActive}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // Tenant Detail View
  const renderTenantDetail = () => {
    if (!selectedTenant) return null;
    const tenantUsers = DEMO_USERS.filter(u => u.tenantId === selectedTenant.id);

    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">
              {selectedTenant.logo}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{selectedTenant.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedTenant.status === 'active' ? 'bg-green-100 text-green-700' :
                  selectedTenant.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedTenant.status.charAt(0).toUpperCase() + selectedTenant.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-600">{selectedTenant.industry} • {selectedTenant.plan.charAt(0).toUpperCase() + selectedTenant.plan.slice(1)} Plan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Tenant
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Users', value: selectedTenant.users, icon: Users, color: 'blue' },
            { label: 'Items Tracked', value: selectedTenant.items.toLocaleString(), icon: Database, color: 'green' },
            { label: 'Zones', value: selectedTenant.zones, icon: MapPin, color: 'purple' },
            { label: 'RFID Readers', value: selectedTenant.readers, icon: Wifi, color: 'orange' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <stat.icon className="w-4 h-4" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-400" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{selectedTenant.contact.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{selectedTenant.contact.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{selectedTenant.contact.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{selectedTenant.address}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-gray-400" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => goToUsers(selectedTenant)}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors text-left"
              >
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Manage Users</p>
                  <p className="text-xs text-gray-500">{tenantUsers.length} users</p>
                </div>
              </button>
              <button className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left">
                <FileText className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">View Reports</p>
                  <p className="text-xs text-gray-500">Analytics & exports</p>
                </div>
              </button>
              <button className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                <Key className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">API Keys</p>
                  <p className="text-xs text-gray-500">Manage integrations</p>
                </div>
              </button>
              <button className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                <Download className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Export Data</p>
                  <p className="text-xs text-gray-500">Backup & export</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Users Preview */}
        <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Tenant Users ({tenantUsers.length})
            </h3>
            <button
              onClick={() => goToUsers(selectedTenant)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {tenantUsers.slice(0, 4).map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                    {user.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_CONFIG[user.role].bg} ${ROLE_CONFIG[user.role].color}`}>
                    {ROLE_CONFIG[user.role].label}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : user.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  // Users View
  const renderUsers = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">
            {selectedTenant ? `Users for ${selectedTenant.name}` : 'All users across tenants'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value as UserRole | 'all')}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:border-green-500 outline-none"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="manager">Managers</option>
            <option value="analyst">Analysts</option>
            <option value="viewer">Viewers</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">User</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Tenant</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Last Login</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => {
              const tenant = DEMO_TENANTS.find(t => t.id === user.tenantId);
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_CONFIG[user.role].bg} ${ROLE_CONFIG[user.role].color}`}>
                      {ROLE_CONFIG[user.role].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tenant?.logo}</span>
                      <span className="text-sm text-gray-600">{tenant?.name.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-sm ${
                      user.status === 'active' ? 'text-green-600' :
                      user.status === 'pending' ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {user.status === 'active' ? <CheckCircle className="w-4 h-4" /> :
                       user.status === 'pending' ? <Clock className="w-4 h-4" /> :
                       <XCircle className="w-4 h-4" />}
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.lastLogin}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit User">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Permissions">
                        <Key className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permissions Legend */}
      <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-gray-400" />
          Role Permissions Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Permission</th>
                <th className="text-center py-2 px-3 font-medium text-red-600">Admin</th>
                <th className="text-center py-2 px-3 font-medium text-purple-600">Manager</th>
                <th className="text-center py-2 px-3 font-medium text-blue-600">Analyst</th>
                <th className="text-center py-2 px-3 font-medium text-gray-600">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { perm: 'View Items', admin: true, manager: true, analyst: true, viewer: true },
                { perm: 'Edit Items', admin: true, manager: true, analyst: true, viewer: false },
                { perm: 'Delete Items', admin: true, manager: false, analyst: false, viewer: false },
                { perm: 'View Reports', admin: true, manager: true, analyst: true, viewer: true },
                { perm: 'Export Data', admin: true, manager: true, analyst: false, viewer: false },
                { perm: 'Manage Users', admin: true, manager: false, analyst: false, viewer: false },
                { perm: 'Manage Zones', admin: true, manager: true, analyst: false, viewer: false },
                { perm: 'View Audit Log', admin: true, manager: true, analyst: false, viewer: false },
              ].map((row, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3 text-gray-700">{row.perm}</td>
                  <td className="py-2 px-3 text-center">{row.admin ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                  <td className="py-2 px-3 text-center">{row.manager ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                  <td className="py-2 px-3 text-center">{row.analyst ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                  <td className="py-2 px-3 text-center">{row.viewer ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // Security View
  const renderSecurity = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security & Audit</h1>
          <p className="text-gray-600">Access control, security settings, and audit logs</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Settings className="w-4 h-4" />
            Security Settings
          </button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Login Attempts Today', value: '156', sub: '3 failed', color: 'blue', icon: LogIn },
          { label: 'Active Sessions', value: '24', sub: 'Across all tenants', color: 'green', icon: Users },
          { label: 'Security Alerts', value: '2', sub: '1 critical', color: 'red', icon: AlertTriangle },
          { label: 'API Calls (24h)', value: '12,847', sub: 'All authenticated', color: 'purple', icon: Activity },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <stat.icon className={`w-4 h-4 text-${stat.color}-500`} />
              <span className="text-sm">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Security Controls */}
        <div className="col-span-1 bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-400" />
            Security Controls
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Two-Factor Authentication', enabled: true },
              { label: 'Session Timeout (30 min)', enabled: true },
              { label: 'IP Whitelisting', enabled: false },
              { label: 'Password Expiry (90 days)', enabled: true },
              { label: 'Audit Log Retention', enabled: true },
            ].map((control, idx) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{control.label}</span>
                <button className={`w-10 h-6 rounded-full transition-colors ${control.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${control.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Security Events */}
        <div className="col-span-2 bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            Recent Security Events
          </h3>
          <div className="space-y-3">
            {DEMO_AUDIT_LOGS.filter(l => l.severity !== 'info').map((log) => (
              <div key={log.id} className={`p-3 rounded-lg border ${
                log.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${log.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}`}>
                    {log.action}
                  </span>
                  <span className="text-sm text-gray-500">{log.timestamp}</span>
                </div>
                <p className="text-sm text-gray-600">{log.details}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>User: {log.user}</span>
                  <span>IP: {log.ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Audit Log */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Audit Log
          </h3>
          <div className="flex items-center gap-2">
            <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
              <option>All Actions</option>
              <option>Logins</option>
              <option>Data Changes</option>
              <option>Permission Changes</option>
            </select>
            <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
              <option>All Severities</option>
              <option>Critical</option>
              <option>Warning</option>
              <option>Info</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {DEMO_AUDIT_LOGS.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  log.severity === 'critical' ? 'bg-red-500' :
                  log.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{log.action}</p>
                  <p className="text-sm text-gray-500">{log.details}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{log.user}</p>
                <p className="text-xs text-gray-400">{log.timestamp} • {log.ip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // System Health View
  const renderSystem = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600">Monitor system performance and infrastructure status</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Refresh Status
        </button>
      </div>

      {/* Overall Status */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-xl text-white mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">All Systems Operational</h2>
              <p className="text-green-100">No issues detected • Last checked: 30 seconds ago</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">99.9%</p>
            <p className="text-green-100">Uptime (30 days)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Infrastructure Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-400" />
            Infrastructure Status
          </h3>
          <div className="space-y-4">
            {[
              { name: 'API Server', status: 'healthy', latency: '24ms', uptime: '99.99%' },
              { name: 'Database (Primary)', status: 'healthy', latency: '8ms', uptime: '99.99%' },
              { name: 'Database (Replica)', status: 'healthy', latency: '12ms', uptime: '99.98%' },
              { name: 'Cache Server', status: 'healthy', latency: '2ms', uptime: '100%' },
              { name: 'Message Queue', status: 'healthy', latency: '15ms', uptime: '99.95%' },
            ].map((service, idx) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium text-gray-700">{service.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{service.latency}</span>
                  <span className="text-green-600">{service.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RFID Infrastructure */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-gray-400" />
            RFID Infrastructure
          </h3>
          <div className="space-y-4">
            {DEMO_TENANTS.map((tenant) => (
              <div key={tenant.id} className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tenant.logo}</span>
                    <span className="font-medium text-gray-700">{tenant.name.split(' ')[0]}</span>
                  </div>
                  <span className="text-sm text-green-600">{tenant.readers} readers online</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: tenant.readers }).map((_, idx) => (
                    <div key={idx} className="w-2 h-4 rounded-sm bg-green-500" title={`Reader ${idx + 1}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'CPU Usage', value: 32, max: 100, unit: '%', color: 'blue' },
          { label: 'Memory', value: 6.2, max: 16, unit: 'GB', color: 'green' },
          { label: 'Storage', value: 234, max: 500, unit: 'GB', color: 'purple' },
          { label: 'Network I/O', value: 145, max: 1000, unit: 'Mbps', color: 'orange' },
        ].map((resource, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{resource.label}</span>
              <span className={`text-sm font-medium text-${resource.color}-600`}>
                {resource.value}{resource.unit}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-${resource.color}-500 rounded-full transition-all`}
                style={{ width: `${(resource.value / resource.max) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">of {resource.max}{resource.unit}</p>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="p-6 max-h-screen overflow-y-auto">
      {/* Breadcrumb */}
      {view !== 'dashboard' && (
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          {renderBreadcrumb()}
        </div>
      )}

      {/* Content */}
      {view === 'dashboard' && renderDashboard()}
      {view === 'tenants' && renderTenants()}
      {view === 'tenant-detail' && renderTenantDetail()}
      {view === 'users' && renderUsers()}
      {view === 'security' && renderSecurity()}
      {view === 'system' && renderSystem()}
    </div>
  );
};

// Add Zap icon component for quick actions
const Zap = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export default AdminPage;
