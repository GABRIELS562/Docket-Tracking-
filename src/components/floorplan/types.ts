// Shared types for floorplan components

export interface ZonePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export type ZonePositionsMap = Record<number, ZonePosition>;

// Zone positions in 2D canvas coordinates - FSL-PAROW First Floor ACTUAL Layout
export const ZONE_2D_POSITIONS: ZonePositionsMap = {
  // FAR LEFT - Large Office Accommodation
  1: { x: 120, y: 384, width: 140, height: 240, label: 'Office Accommodation' },

  // TOP CURVED SECTION - 4 Small Exam Rooms
  2: { x: 310, y: 120, width: 85, height: 65, label: 'Exam 1' },
  3: { x: 430, y: 100, width: 85, height: 65, label: 'Exam 2' },
  4: { x: 594, y: 100, width: 85, height: 65, label: 'Exam 3' },
  5: { x: 714, y: 120, width: 85, height: 65, label: 'Exam 4' },

  // CENTER - Large E.I.M.S Area
  6: { x: 512, y: 340, width: 200, height: 180, label: 'E.I.M.S Center' },

  // RIGHT SIDE - Offices
  7: { x: 884, y: 260, width: 110, height: 80, label: 'Admin' },
  8: { x: 884, y: 360, width: 110, height: 70, label: 'Support' },

  // STAIRWELL - Central Left
  9: { x: 340, y: 384, width: 60, height: 60, label: 'Stairs' },

  // BOTTOM CURVED SECTION - Auditorium
  10: { x: 512, y: 600, width: 180, height: 100, label: 'Auditorium' },

  // BOTTOM CENTER - Entrance
  11: { x: 512, y: 720, width: 100, height: 60, label: 'Entrance' },

  // STORAGE - Right Side
  12: { x: 850, y: 500, width: 120, height: 90, label: 'Storage' },
};
