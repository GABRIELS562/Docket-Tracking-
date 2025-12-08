import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Shield,
  Stethoscope,
  HardHat,
  ShoppingBag,
  Check,
  Building2,
} from 'lucide-react';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import { TENANTS, type TenantId } from '../../pages/TenantSelectPage';

/**
 * Quick Tenant Switcher
 *
 * Allows switching between tenants without leaving the 3D view.
 * Demonstrates multi-tenant capability during presentations.
 */

const TENANT_ICONS: Record<TenantId, React.ComponentType<{ className?: string }>> = {
  'saps-forensics': Shield,
  'meditrack': Stethoscope,
  'minesecure': HardHat,
  'retailguard': ShoppingBag,
};

const QuickTenantSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const setTenant = useAIAnalyticsStore((s) => s.setTenant);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTenant = (tenantId: TenantId) => {
    setTenant(tenantId);
    localStorage.setItem('selectedTenant', tenantId);
    setIsOpen(false);
  };

  const CurrentIcon = currentTenant ? TENANT_ICONS[currentTenant] : Building2;
  const currentColor = tenantConfig?.color || '#3b82f6';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${currentColor}30` }}
        >
          <CurrentIcon className="w-4 h-4" style={{ color: currentColor }} />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-white text-sm font-medium">
            {tenantConfig?.name || 'Select Tenant'}
          </div>
          <div className="text-gray-500 text-xs">
            {tenantConfig?.industry || 'Multi-tenant'}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
            <h4 className="text-white font-medium text-sm">Switch Industry</h4>
            <p className="text-gray-500 text-xs">
              Demonstrate multi-tenant capability
            </p>
          </div>

          {/* Tenant Options */}
          <div className="p-2">
            {(Object.keys(TENANTS) as TenantId[]).map((tenantId) => {
              const tenant = TENANTS[tenantId];
              const Icon = TENANT_ICONS[tenantId];
              const isSelected = currentTenant === tenantId;

              return (
                <button
                  key={tenantId}
                  onClick={() => handleSelectTenant(tenantId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-white/10 border border-white/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${tenant.color}20` }}
                  >
                    <span style={{ color: tenant.color }}>
                      <Icon className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white text-sm font-medium flex items-center gap-2">
                      {tenant.name}
                      {isSelected && (
                        <Check className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                    <div className="text-gray-500 text-xs">{tenant.industry}</div>
                  </div>
                  {tenantId === 'saps-forensics' && (
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-medium rounded">
                      Featured
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-white/10 bg-black/20">
            <p className="text-xs text-gray-600 text-center">
              Each tenant has customized terminology & thresholds
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickTenantSwitcher;
