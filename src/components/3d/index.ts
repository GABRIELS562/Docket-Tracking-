// 3D Components - Core exports
export { default as Scene3D } from './Scene3D';
export { default as ZoneOverview3D } from './ZoneOverview3D';
export { default as ZoneBlock } from './ZoneBlock';
export { default as Canvas3DErrorBoundary } from './Canvas3DErrorBoundary';

// Legacy exports (these are lazy-loaded in Scene3D for bundle optimization)
export { default as ForensicBuilding } from './ForensicBuilding';
export { default as RfidParticles } from './RfidParticles';
export { default as HeatMapOverlay } from './HeatMapOverlay';
export { default as FloorPlanOverlay } from './FloorPlanOverlay';
