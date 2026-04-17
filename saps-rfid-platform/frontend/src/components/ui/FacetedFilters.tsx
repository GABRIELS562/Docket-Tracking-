import { useState, useCallback, useMemo } from 'react';
import { Filter, Calendar, MapPin, Activity, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

/**
 * FacetedFilters (Phase 3.3)
 *
 * Faceted filtering component for search:
 * - Zone-based filtering
 * - Status filtering
 * - Date range selection
 * - Priority filtering
 * - Filter counts from aggregations
 * - Clear all / reset functionality
 *
 * Target: Fast filter updates, smooth UX
 * Reference: StartHere.md Phase 3.3
 */

// ============================================================================
// Types
// ============================================================================

export interface FilterState {
  zones: string[];
  status: string[];
  priority: string[];
  dateRange: 'today' | 'week' | 'month' | 'all';
}

export interface FilterAggregation {
  zoneId: string;
  count: number;
}

export interface StatusAggregation {
  status: string;
  count: number;
}

interface FacetedFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  zoneAggregations?: FilterAggregation[];
  statusAggregations?: StatusAggregation[];
  totalResults?: number;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ZONES = [
  { id: 'receiving', name: 'Receiving', color: '#3b82f6', icon: '📥' },
  { id: 'storage-a', name: 'Storage A', color: '#10b981', icon: '📦' },
  { id: 'storage-b', name: 'Storage B', color: '#10b981', icon: '📦' },
  { id: 'storage-c', name: 'Storage C', color: '#10b981', icon: '📦' },
  { id: 'secure-storage', name: 'Secure Storage', color: '#ef4444', icon: '🔒' },
  { id: 'storage-d', name: 'Storage D', color: '#10b981', icon: '📦' },
  { id: 'processing', name: 'Processing', color: '#f59e0b', icon: '⚙️' },
  { id: 'shipping', name: 'Shipping', color: '#8b5cf6', icon: '📤' },
  { id: 'returns', name: 'Returns', color: '#ec4899', icon: '↩️' },
];

const STATUSES = [
  { id: 'active', name: 'Active', color: '#22c55e' },
  { id: 'inactive', name: 'Inactive', color: '#6b7280' },
  { id: 'missing', name: 'Missing', color: '#ef4444' },
  { id: 'in-transit', name: 'In Transit', color: '#f59e0b' },
];

const PRIORITIES = [
  { id: 'critical', name: 'Critical', color: '#ef4444' },
  { id: 'high', name: 'High', color: '#f59e0b' },
  { id: 'medium', name: 'Medium', color: '#3b82f6' },
  { id: 'low', name: 'Low', color: '#6b7280' },
];

const DATE_RANGES = [
  { id: 'today', name: 'Today', icon: '📅' },
  { id: 'week', name: 'This Week', icon: '📆' },
  { id: 'month', name: 'This Month', icon: '🗓️' },
  { id: 'all', name: 'All Time', icon: '∞' },
] as const;

const DEFAULT_FILTERS: FilterState = {
  zones: [],
  status: [],
  priority: [],
  dateRange: 'all',
};

// ============================================================================
// Main Component
// ============================================================================

const FacetedFilters = ({
  filters,
  onFilterChange,
  zoneAggregations = [],
  statusAggregations = [],
  totalResults = 0,
  isCollapsible = true,
  defaultExpanded = true,
}: FacetedFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedSections, setExpandedSections] = useState({
    zones: true,
    status: true,
    priority: false,
    dateRange: true,
  });

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.zones.length > 0 ||
      filters.status.length > 0 ||
      filters.priority.length > 0 ||
      filters.dateRange !== 'all'
    );
  }, [filters]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return (
      filters.zones.length +
      filters.status.length +
      filters.priority.length +
      (filters.dateRange !== 'all' ? 1 : 0)
    );
  }, [filters]);

  // Toggle a filter value
  const toggleFilter = useCallback(
    (type: keyof Omit<FilterState, 'dateRange'>, value: string) => {
      const current = filters[type];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onFilterChange({ ...filters, [type]: updated });
    },
    [filters, onFilterChange]
  );

  // Set date range
  const setDateRange = useCallback(
    (range: FilterState['dateRange']) => {
      onFilterChange({ ...filters, dateRange: range });
    },
    [filters, onFilterChange]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    onFilterChange(DEFAULT_FILTERS);
  }, [onFilterChange]);

  // Toggle section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Get zone count from aggregations
  const getZoneCount = (zoneId: string) => {
    const agg = zoneAggregations.find((a) => a.zoneId === zoneId);
    return agg?.count ?? 0;
  };

  // Get status count from aggregations
  const getStatusCount = (status: string) => {
    const agg = statusAggregations.find((a) => a.status === status);
    return agg?.count ?? 0;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10">
      {/* Header */}
      <div
        className={`
          flex items-center justify-between px-4 py-3
          ${isCollapsible ? 'cursor-pointer hover:bg-white/5' : ''}
          ${isExpanded ? 'border-b border-white/5' : ''}
        `}
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
          {isCollapsible && (
            isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )
          )}
        </div>
      </div>

      {/* Filter Sections */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Zone Filter */}
          <FilterSection
            title="Zone"
            icon={<MapPin className="w-4 h-4" />}
            isExpanded={expandedSections.zones}
            onToggle={() => toggleSection('zones')}
            activeCount={filters.zones.length}
          >
            <div className="flex flex-wrap gap-2">
              {ZONES.map((zone) => {
                const isActive = filters.zones.includes(zone.id);
                const count = getZoneCount(zone.id);

                return (
                  <FilterChip
                    key={zone.id}
                    label={zone.name}
                    icon={zone.icon}
                    color={zone.color}
                    count={count}
                    isActive={isActive}
                    onClick={() => toggleFilter('zones', zone.id)}
                  />
                );
              })}
            </div>
          </FilterSection>

          {/* Status Filter */}
          <FilterSection
            title="Status"
            icon={<Activity className="w-4 h-4" />}
            isExpanded={expandedSections.status}
            onToggle={() => toggleSection('status')}
            activeCount={filters.status.length}
          >
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status) => {
                const isActive = filters.status.includes(status.id);
                const count = getStatusCount(status.id);

                return (
                  <FilterChip
                    key={status.id}
                    label={status.name}
                    color={status.color}
                    count={count}
                    isActive={isActive}
                    onClick={() => toggleFilter('status', status.id)}
                    showDot
                  />
                );
              })}
            </div>
          </FilterSection>

          {/* Priority Filter */}
          <FilterSection
            title="Priority"
            icon={<span className="text-sm">⚡</span>}
            isExpanded={expandedSections.priority}
            onToggle={() => toggleSection('priority')}
            activeCount={filters.priority.length}
          >
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((priority) => {
                const isActive = filters.priority.includes(priority.id);

                return (
                  <FilterChip
                    key={priority.id}
                    label={priority.name}
                    color={priority.color}
                    isActive={isActive}
                    onClick={() => toggleFilter('priority', priority.id)}
                    showDot
                  />
                );
              })}
            </div>
          </FilterSection>

          {/* Date Range Filter */}
          <FilterSection
            title="Date Range"
            icon={<Calendar className="w-4 h-4" />}
            isExpanded={expandedSections.dateRange}
            onToggle={() => toggleSection('dateRange')}
            activeCount={filters.dateRange !== 'all' ? 1 : 0}
          >
            <div className="flex flex-wrap gap-2">
              {DATE_RANGES.map((range) => {
                const isActive = filters.dateRange === range.id;

                return (
                  <button
                    key={range.id}
                    onClick={() => setDateRange(range.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium
                      transition-all flex items-center gap-1.5
                      ${isActive
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                      }
                    `}
                  >
                    <span>{range.icon}</span>
                    {range.name}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          {/* Results Summary */}
          {totalResults > 0 && (
            <div className="pt-2 border-t border-white/5 text-center">
              <span className="text-xs text-gray-500">
                Showing <span className="text-cyan-400 font-medium">{totalResults.toLocaleString()}</span> results
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Filter Section Component
// ============================================================================

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  activeCount: number;
  children: React.ReactNode;
}

const FilterSection = ({
  title,
  icon,
  isExpanded,
  onToggle,
  activeCount,
  children,
}: FilterSectionProps) => {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <div className="flex items-center gap-2 text-gray-400 group-hover:text-white transition-colors">
          {icon}
          <span className="text-xs uppercase font-medium">{title}</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] rounded">
              {activeCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-gray-600" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-600" />
        )}
      </button>

      {isExpanded && children}
    </div>
  );
};

// ============================================================================
// Filter Chip Component
// ============================================================================

interface FilterChipProps {
  label: string;
  icon?: string;
  color: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  showDot?: boolean;
}

const FilterChip = ({
  label,
  icon,
  color,
  count,
  isActive,
  onClick,
  showDot,
}: FilterChipProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg text-xs font-medium
        transition-all flex items-center gap-1.5
        ${isActive
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent hover:text-white'
        }
      `}
    >
      {showDot ? (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      {label}
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-gray-500 ml-1">({count})</span>
      )}
    </button>
  );
};

export default FacetedFilters;
export { DEFAULT_FILTERS };
