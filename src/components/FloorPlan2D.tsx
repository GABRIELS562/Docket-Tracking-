/**
 * FloorPlan2D - SVG-based 2D Floor Plan View
 *
 * This is the PRIMARY navigation interface for the RFID Docket Tracking system.
 * The 2D floor plan provides an intuitive overview of all zones and items.
 *
 * Features:
 * - SVG-based rendering for crisp visuals at any zoom level
 * - Zone colors by type (Storage, Examination, Transit, etc.)
 * - Items shown as small dots within zones
 * - Clickable zones showing zone details
 * - View toggle to switch between 2D and 3D views
 * - Occupancy status indicators with color coding
 */

import { FloorPlan2DSVG } from './floorplan';
import { Zone } from '@/lib/types';
import { Docket } from '@/lib/api';

interface FloorPlan2DProps {
  zones: Zone[];
  dockets: Docket[];
  onZoneClick?: (zoneId: number) => void;
}

/**
 * Main FloorPlan2D component - wraps the SVG-based implementation
 * This is the primary navigation view for the application
 */
export default function FloorPlan2D({ zones, dockets, onZoneClick }: FloorPlan2DProps) {
  return (
    <FloorPlan2DSVG
      zones={zones}
      dockets={dockets}
      onZoneClick={onZoneClick}
      showViewToggle={true}
    />
  );
}

// Re-export for direct imports
export { FloorPlan2DSVG };
