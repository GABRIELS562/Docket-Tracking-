/**
 * Workflow component types for RFID Docket Tracking demo
 */

// ============================================================================
// Tag Binding Wizard Types
// ============================================================================

export type WizardStep = 'scan-barcode' | 'print-tag' | 'bind-tag' | 'complete';

export interface WizardStepConfig {
  id: WizardStep;
  title: string;
  description: string;
  icon: 'barcode' | 'printer' | 'link' | 'check';
}

export interface DocketBindingData {
  docketNumber: string;
  caseReference: string;
  rfidEpc: string;
  description: string;
  category: string;
  boundAt: string | null;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  {
    id: 'scan-barcode',
    title: 'Scan Barcode',
    description: 'Scan the evidence barcode or enter docket number',
    icon: 'barcode',
  },
  {
    id: 'print-tag',
    title: 'Print RFID Tag',
    description: 'Generate and print the RFID label',
    icon: 'printer',
  },
  {
    id: 'bind-tag',
    title: 'Bind to Docket',
    description: 'Scan RFID tag to bind it to the docket',
    icon: 'link',
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Tag successfully bound to docket',
    icon: 'check',
  },
];

export const INITIAL_BINDING_DATA: DocketBindingData = {
  docketNumber: '',
  caseReference: '',
  rfidEpc: '',
  description: '',
  category: 'evidence',
  boundAt: null,
};

// ============================================================================
// Proximity Find Types
// ============================================================================

export type ProximityLevel = 'cold' | 'cool' | 'warm' | 'hot' | 'found';

export interface ProximityState {
  isSearching: boolean;
  targetItemNumber: string;
  targetRfidEpc: string;
  rssi: number; // -100 to 0 dBm, higher (closer to 0) = closer
  level: ProximityLevel;
  lastUpdate: string | null;
}

export const PROXIMITY_THRESHOLDS = {
  cold: -80, // < -80 dBm = very far
  cool: -65, // -80 to -65 dBm = far
  warm: -50, // -65 to -50 dBm = getting closer
  hot: -35, // -50 to -35 dBm = very close
  found: -20, // > -35 dBm = found
} as const;

export function getProximityLevel(rssi: number): ProximityLevel {
  if (rssi >= PROXIMITY_THRESHOLDS.found) return 'found';
  if (rssi >= PROXIMITY_THRESHOLDS.hot) return 'hot';
  if (rssi >= PROXIMITY_THRESHOLDS.warm) return 'warm';
  if (rssi >= PROXIMITY_THRESHOLDS.cool) return 'cool';
  return 'cold';
}

export function getProximityColor(level: ProximityLevel): string {
  switch (level) {
    case 'found':
      return '#22c55e'; // green-500
    case 'hot':
      return '#ef4444'; // red-500
    case 'warm':
      return '#f97316'; // orange-500
    case 'cool':
      return '#3b82f6'; // blue-500
    case 'cold':
      return '#6366f1'; // indigo-500
  }
}

export function getProximityLabel(level: ProximityLevel): string {
  switch (level) {
    case 'found':
      return 'FOUND!';
    case 'hot':
      return 'Very Close';
    case 'warm':
      return 'Getting Warmer';
    case 'cool':
      return 'Cool';
    case 'cold':
      return 'Cold';
  }
}

// ============================================================================
// Journey Timeline Types
// ============================================================================

export type JourneyEventType = 'intake' | 'movement' | 'processing' | 'storage' | 'retrieval';

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  zoneName: string;
  zoneType: string;
  timestamp: string;
  duration?: number; // milliseconds spent in zone
  readerId?: string;
  readerName?: string;
  notes?: string;
}

export interface JourneyData {
  itemNumber: string;
  itemDescription: string;
  rfidEpc: string;
  events: JourneyEvent[];
  currentZone: string | null;
  totalZonesVisited: number;
}

export function getJourneyEventIcon(type: JourneyEventType): string {
  switch (type) {
    case 'intake':
      return 'inbox';
    case 'movement':
      return 'arrow-right';
    case 'processing':
      return 'flask';
    case 'storage':
      return 'archive';
    case 'retrieval':
      return 'external-link';
  }
}

export function getJourneyEventColor(type: JourneyEventType): string {
  switch (type) {
    case 'intake':
      return '#22c55e'; // green
    case 'movement':
      return '#3b82f6'; // blue
    case 'processing':
      return '#a855f7'; // purple
    case 'storage':
      return '#f59e0b'; // amber
    case 'retrieval':
      return '#ec4899'; // pink
  }
}
