// Utility functions for floorplan rendering

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getZoneColor(zoneType: string): string {
  const colors: Record<string, string> = {
    storage: '#3b82f6',
    lab: '#ec4899',
    office: '#1e40af',
    corridor: '#6b7280',
    entrance: '#8b5cf6',
  };
  return colors[zoneType] || '#6b7280';
}
