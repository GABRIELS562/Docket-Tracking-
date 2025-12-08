/**
 * Warehouse Configurations Index
 *
 * Central registry for all warehouse configurations.
 * Add new warehouses here as they are created.
 */

import { SAPS_FORENSICS_WAREHOUSE } from './saps-forensics';
import type { WarehouseConfig } from '../../core/types';

// ============================================================================
// WAREHOUSE REGISTRY
// ============================================================================

/**
 * All available warehouse configurations
 */
export const WAREHOUSES: Record<string, WarehouseConfig> = {
  'saps-forensics': SAPS_FORENSICS_WAREHOUSE,
};

/**
 * Get warehouse configuration by ID or slug
 */
export function getWarehouseConfig(idOrSlug: string): WarehouseConfig | undefined {
  // Try direct ID lookup
  const byId = Object.values(WAREHOUSES).find(w => w.id === idOrSlug);
  if (byId) return byId;

  // Try slug lookup
  return WAREHOUSES[idOrSlug];
}

/**
 * Get list of available warehouses (for UI selection)
 */
export function getAvailableWarehouses(): Array<{ id: string; name: string; slug: string }> {
  return Object.values(WAREHOUSES).map(w => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
  }));
}

/**
 * Default warehouse for new sessions
 */
export const DEFAULT_WAREHOUSE_SLUG = 'saps-forensics';

// Re-export SAPS config for direct access
export { SAPS_FORENSICS_WAREHOUSE };
export * from './saps-forensics';
