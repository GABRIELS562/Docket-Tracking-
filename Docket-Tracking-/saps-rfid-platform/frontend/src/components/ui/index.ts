// UI Component Library - Centralized exports
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Input } from './Input';
export { default as Select } from './Select';
export { default as Badge } from './Badge';
export { default as Spinner } from './Spinner';
export { default as Modal } from './Modal';

// Search Components (Phase 3.3)
export { default as SearchInterface } from './SearchInterface';
export { default as EnhancedSearchInterface } from './EnhancedSearchInterface';
export { default as VirtualizedSearchResults } from './VirtualizedSearchResults';
export type { SearchResultItem } from './VirtualizedSearchResults';

// Filter Components (Phase 3.3)
export { default as FacetedFilters, DEFAULT_FILTERS } from './FacetedFilters';
export type { FilterState, FilterAggregation, StatusAggregation } from './FacetedFilters';

// 3D Integration (Phase 3.3)
export { useSearchTo3D, SearchTo3DProvider } from './SearchTo3D';
export type { SearchTo3DState, SearchTo3DActions, UseSearchTo3DReturn } from './SearchTo3D';

// Analytics Components
export { default as RealTimeAnalytics } from './RealTimeAnalytics';
