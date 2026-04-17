/**
 * Analytics Use Cases
 *
 * Export all analytics-related use cases for dependency injection registration.
 */

export { GetDashboardAnalyticsUseCase } from './GetDashboardAnalyticsUseCase';
export { GetZoneAnalyticsUseCase } from './GetZoneAnalyticsUseCase';
export { GetReaderAnalyticsUseCase } from './GetReaderAnalyticsUseCase';
export { GetSystemMetricsUseCase } from './GetSystemMetricsUseCase';

// Re-export input types
export type { GetDashboardInput } from './GetDashboardAnalyticsUseCase';
