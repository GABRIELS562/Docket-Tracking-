import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Shield,
  Stethoscope,
  HardHat,
  ShoppingBag,
  ArrowRight,
  Cpu,
  BarChart3,
  Bell,
  Zap
} from 'lucide-react';

/**
 * Tenant/Industry configurations
 * Each tenant has customized settings for their industry
 */
export const TENANTS = {
  'saps-forensics': {
    id: 'saps-forensics',
    name: 'SAPS Forensics',
    fullName: 'South African Police Service - Forensic Laboratory',
    industry: 'Law Enforcement',
    icon: Shield,
    color: '#1e40af',
    gradient: 'from-blue-900 to-blue-700',
    description: 'Evidence chain-of-custody tracking for forensic laboratories',
    itemTerm: 'Evidence Docket',
    itemTermPlural: 'Evidence Dockets',
    zones: ['Receiving', 'Processing', 'Analysis', 'Secure Storage', 'Court Prep', 'Shipping'],
    alertThresholds: {
      dwellWarningDays: 14,
      dwellCriticalDays: 30,
      secureZoneExitAlert: true,
    },
    features: ['Chain of Custody', 'Court Case Integration', 'Tamper Detection'],
  },
  'meditrack': {
    id: 'meditrack',
    name: 'MediTrack',
    fullName: 'Hospital Equipment Tracking System',
    industry: 'Healthcare',
    icon: Stethoscope,
    color: '#059669',
    gradient: 'from-emerald-800 to-emerald-600',
    description: 'Medical equipment and asset tracking for hospitals',
    itemTerm: 'Medical Asset',
    itemTermPlural: 'Medical Assets',
    zones: ['Central Store', 'ICU', 'Theatre', 'Ward A', 'Ward B', 'Sterilization', 'Maintenance'],
    alertThresholds: {
      dwellWarningDays: 7,
      dwellCriticalDays: 14,
      secureZoneExitAlert: false,
    },
    features: ['Equipment Utilization', 'Maintenance Scheduling', 'Sterilization Tracking'],
  },
  'minesecure': {
    id: 'minesecure',
    name: 'MineSecure',
    fullName: 'Mining Equipment & Safety Tracking',
    industry: 'Mining',
    icon: HardHat,
    color: '#d97706',
    gradient: 'from-amber-800 to-amber-600',
    description: 'High-value equipment and PPE tracking for mining operations',
    itemTerm: 'Asset',
    itemTermPlural: 'Assets',
    zones: ['Surface Store', 'Underground', 'Workshop', 'Shaft 1', 'Shaft 2', 'Safety Station'],
    alertThresholds: {
      dwellWarningDays: 3,
      dwellCriticalDays: 7,
      secureZoneExitAlert: true,
    },
    features: ['PPE Compliance', 'Tool Tracking', 'Safety Zone Monitoring'],
  },
  'retailguard': {
    id: 'retailguard',
    name: 'RetailGuard',
    fullName: 'Retail Inventory Protection System',
    industry: 'Retail',
    icon: ShoppingBag,
    color: '#7c3aed',
    gradient: 'from-violet-800 to-violet-600',
    description: 'Shrinkage prevention and inventory tracking for retail',
    itemTerm: 'Product',
    itemTermPlural: 'Products',
    zones: ['Receiving', 'Stockroom', 'Sales Floor', 'Fitting Room', 'Returns', 'Shipping'],
    alertThresholds: {
      dwellWarningDays: 1,
      dwellCriticalDays: 3,
      secureZoneExitAlert: true,
    },
    features: ['Shrinkage Prevention', 'Real-time Stock Levels', 'Theft Alerts'],
  },
};

export type TenantId = keyof typeof TENANTS;
export type Tenant = typeof TENANTS[TenantId];

/**
 * Tenant Selection Landing Page
 *
 * Showcases the multi-tenant capability of the platform.
 * Users select their industry/client to enter the customized dashboard.
 */
const TenantSelectPage = () => {
  const navigate = useNavigate();

  const handleSelectTenant = (tenantId: TenantId) => {
    // Store selected tenant
    localStorage.setItem('selectedTenant', tenantId);
    // Navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">RFID Track Pro</h1>
                <p className="text-xs text-gray-500">Multi-Tenant Asset Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm font-medium">AI-Powered</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
          <span className="text-gray-400 text-sm">South African Innovation</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Made in SA</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Intelligent Asset Tracking
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            For Every Industry
          </span>
        </h2>

        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          Real-time 3D visualization, AI-powered anomaly detection, and predictive analytics.
          One platform, unlimited possibilities.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {[
            { icon: Building2, label: '3D Digital Twin' },
            { icon: Bell, label: 'AI Anomaly Detection' },
            { icon: BarChart3, label: 'Predictive Analytics' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              <feature.icon className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-300 text-sm">{feature.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tenant Selection */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-semibold text-white mb-2">Select Your Industry</h3>
          <p className="text-gray-500">Choose a demo environment to explore</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(TENANTS).map((tenant) => {
            const Icon = tenant.icon;
            return (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id as TenantId)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all hover:border-white/20 hover:bg-white/10"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tenant.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${tenant.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: tenant.color }} />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{tenant.name}</h4>
                        <p className="text-sm text-gray-500">{tenant.industry}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4">{tenant.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {tenant.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-400"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Demo Badge for SAPS */}
                  {tenant.id === 'saps-forensics' && (
                    <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl rounded-tr-xl bg-cyan-500 text-white text-xs font-medium">
                      Featured Demo
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Footer Stats */}
      <section className="border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10,000+', label: 'Items Tracked' },
              { value: '99.9%', label: 'Uptime' },
              { value: '<300ms', label: 'Response Time' },
              { value: '4', label: 'Industries Served' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>RFID Track Pro - South African Innovation</span>
            <span>Powered by AI Analytics Engine v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TenantSelectPage;
