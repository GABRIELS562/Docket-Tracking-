// Barrel export for floorplan components

export { ZONE_2D_POSITIONS } from './types';
export type { ZonePosition, ZonePositionsMap } from './types';
export { hexToRgba, getZoneColor } from './utils';
export { drawProceduralFloorPlan, drawCurvedSections, drawConnectionLines } from './drawBackground';
export { drawZone } from './drawZones';
export { drawDockets } from './drawDockets';
