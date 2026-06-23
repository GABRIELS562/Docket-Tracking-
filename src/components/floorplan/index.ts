// Barrel export for floorplan components

// SVG-based 2D floor plan components
export { default as FloorPlan2DSVG } from './FloorPlan2D';
export { ZONE_TYPE_COLORS } from './FloorPlan2D';
export type { ZoneLayout } from './FloorPlan2D';
export { default as Zone2D } from './Zone2D';
export { default as ItemDot, ItemCluster } from './ItemDot';
export { default as ViewToggle, ViewToggleCompact, ViewTogglePrimary } from './ViewToggle';

// Legacy canvas-based exports (for backwards compatibility)
export { ZONE_2D_POSITIONS } from './types';
export type { ZonePosition, ZonePositionsMap } from './types';
export { hexToRgba, getZoneColor } from './utils';
export { drawProceduralFloorPlan, drawCurvedSections, drawConnectionLines } from './drawBackground';
export { drawZone } from './drawZones';
export { drawDockets } from './drawDockets';
