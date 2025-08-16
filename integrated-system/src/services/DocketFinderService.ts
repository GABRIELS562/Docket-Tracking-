/**
 * Docket Finder Service
 * Advanced finding system for 500K dockets with RFID + Barcode
 */

import { EventEmitter } from 'events';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { Server } from 'socket.io';

interface FindResult {
  found: boolean;
  docketId: string;
  location: {
    building: string;
    floor: number;
    zone: string;
    shelf?: string;
    position?: string;
    lastSeen: Date;
    confidence: number;
  };
  path?: NavigationPath;
  alternativeMethods?: string[];
  estimatedTime: string;
}

interface NavigationPath {
  steps: NavigationStep[];
  totalDistance: number;
  estimatedTime: string;
  visualMap?: string;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  direction: 'straight' | 'left' | 'right' | 'up' | 'down';
  landmark?: string;
}

interface GeigerMode {
  active: boolean;
  tagId: string;
  currentRSSI: number;
  maxRSSI: number;
  direction: 'closer' | 'farther' | 'stable';
  distance: number;
  audioFrequency: number;
  visualIndicator: string;
}

export class DocketFinderService extends EventEmitter {
  private static instance: DocketFinderService;
  private db: DatabaseService;
  private io: Server;
  private activeSearches: Map<string, any>;
  private readerNetwork: Map<string, any>;

  private constructor(io: Server) {
    super();
    this.io = io;
    this.db = DatabaseService.getInstance();
    this.activeSearches = new Map();
    this.readerNetwork = new Map();
    this.initializeReaderNetwork();
  }

  static getInstance(io?: Server): DocketFinderService {
    if (!DocketFinderService.instance && io) {
      DocketFinderService.instance = new DocketFinderService(io);
    }
    return DocketFinderService.instance;
  }

  /**
   * Primary method to find a docket using RFID
   */
  async findDocket(docketId: string, method: 'rfid' | 'barcode' | 'both' = 'both'): Promise<FindResult> {
    logger.info(`Finding docket ${docketId} using ${method}`);
    
    // Start search timer
    const startTime = Date.now();
    
    // Initialize search
    const searchId = `SEARCH-${Date.now()}`;
    this.activeSearches.set(searchId, {
      docketId,
      startTime,
      method,
      status: 'active'
    });

    try {
      // Step 1: Check database for last known location
      const lastKnown = await this.getLastKnownLocation(docketId);
      
      // Step 2: If recently seen, verify it's still there
      if (lastKnown && this.isRecent(lastKnown.timestamp)) {
        const verified = await this.verifyLocation(docketId, lastKnown.location);
        if (verified) {
          return this.createFoundResult(docketId, lastKnown.location, Date.now() - startTime);
        }
      }

      // Step 3: Initiate intensive RFID search
      const rfidResult = await this.intensiveRFIDSearch(docketId);
      
      if (rfidResult.found) {
        // Step 4: Triangulate exact position
        const preciseLocation = await this.triangulatePosition(rfidResult.readings);
        
        // Step 5: Generate navigation path
        const path = await this.generateNavigationPath(preciseLocation);
        
        // Update database
        await this.updateDocketLocation(docketId, preciseLocation);
        
        return {
          found: true,
          docketId,
          location: preciseLocation,
          path,
          estimatedTime: `${Math.round((Date.now() - startTime) / 1000)} seconds`
        };
      }

      // Step 6: If RFID fails, suggest barcode verification
      if (method === 'both' || method === 'barcode') {
        return this.suggestBarcodeSearch(docketId);
      }

      return this.createNotFoundResult(docketId);

    } finally {
      this.activeSearches.delete(searchId);
    }
  }

  /**
   * Intensive RFID search across all readers
   */
  private async intensiveRFIDSearch(docketId: string): Promise<any> {
    logger.info(`Starting intensive RFID search for ${docketId}`);
    
    // Get tag ID from database
    const tagInfo = await this.db.query(
      'SELECT rfid_tag_id, barcode_value FROM objects WHERE object_code = $1',
      [docketId]
    );

    if (tagInfo.rows.length === 0) {
      throw new Error(`Docket ${docketId} not found in database`);
    }

    const tagId = tagInfo.rows[0].rfid_tag_id;
    
    // Broadcast search command to all readers
    const searchCommand = {
      command: 'INTENSIVE_SEARCH',
      tagId,
      duration: 5000, // 5 seconds
      power: 'MAX', // Maximum power
      frequency: 'ALL_CHANNELS'
    };

    // Send to all readers
    const readings = await this.broadcastToReaders(searchCommand);
    
    // Filter and sort by signal strength
    const validReadings = readings
      .filter(r => r.tagFound)
      .sort((a, b) => b.rssi - a.rssi);

    return {
      found: validReadings.length > 0,
      readings: validReadings,
      strongestSignal: validReadings[0],
      readersChecked: readings.length
    };
  }

  /**
   * Triangulate exact position using multiple reader signals
   */
  private async triangulatePosition(readings: any[]): Promise<any> {
    if (readings.length === 0) {
      throw new Error('No readings available for triangulation');
    }

    // Single reader - use its zone
    if (readings.length === 1) {
      const reader = this.readerNetwork.get(readings[0].readerId);
      return {
        building: reader.building,
        floor: reader.floor,
        zone: reader.zone,
        shelf: await this.identifyShelf(readings[0]),
        confidence: 70,
        lastSeen: new Date()
      };
    }

    // Multiple readers - triangulate
    const positions = readings.map(r => {
      const reader = this.readerNetwork.get(r.readerId);
      return {
        x: reader.x,
        y: reader.y,
        z: reader.floor,
        weight: this.rssiToDistance(r.rssi)
      };
    });

    // Weighted average position
    const totalWeight = positions.reduce((sum, p) => sum + p.weight, 0);
    const x = positions.reduce((sum, p) => sum + (p.x * p.weight), 0) / totalWeight;
    const y = positions.reduce((sum, p) => sum + (p.y * p.weight), 0) / totalWeight;
    const floor = Math.round(positions.reduce((sum, p) => sum + (p.z * p.weight), 0) / totalWeight);

    // Find nearest shelf
    const nearestShelf = await this.findNearestShelf(x, y, floor);
    
    return {
      building: 'Main Building',
      floor,
      zone: this.coordinatesToZone(x, y),
      shelf: nearestShelf.code,
      position: nearestShelf.level,
      coordinates: { x: Math.round(x), y: Math.round(y) },
      confidence: Math.min(95, 70 + (readings.length * 5)),
      lastSeen: new Date()
    };
  }

  /**
   * Geiger counter mode for handheld readers
   */
  async startGeigerMode(docketId: string, readerId: string): Promise<void> {
    logger.info(`Starting Geiger mode for ${docketId} on reader ${readerId}`);
    
    const tagInfo = await this.db.query(
      'SELECT rfid_tag_id FROM objects WHERE object_code = $1',
      [docketId]
    );

    if (tagInfo.rows.length === 0) {
      throw new Error(`Docket ${docketId} not found`);
    }

    const tagId = tagInfo.rows[0].rfid_tag_id;
    let previousRSSI = -100;
    let maxRSSI = -100;

    // Start continuous scanning
    const interval = setInterval(async () => {
      try {
        const reading = await this.getSingleReading(readerId, tagId);
        
        if (reading.found) {
          const currentRSSI = reading.rssi;
          maxRSSI = Math.max(maxRSSI, currentRSSI);
          
          const geigerData: GeigerMode = {
            active: true,
            tagId,
            currentRSSI,
            maxRSSI,
            direction: currentRSSI > previousRSSI ? 'closer' : 
                      currentRSSI < previousRSSI ? 'farther' : 'stable',
            distance: this.rssiToDistance(currentRSSI),
            audioFrequency: this.rssiToAudioFrequency(currentRSSI),
            visualIndicator: this.rssiToVisual(currentRSSI, maxRSSI)
          };

          // Emit to handheld device
          this.io.to(`reader:${readerId}`).emit('geiger:update', geigerData);
          
          // Check if very close (within 30cm)
          if (currentRSSI > -30) {
            this.io.to(`reader:${readerId}`).emit('geiger:found', {
              message: 'Docket located!',
              distance: '<30cm',
              instruction: 'Check current shelf level'
            });
          }

          previousRSSI = currentRSSI;
        }
      } catch (error) {
        logger.error('Geiger mode error:', error);
      }
    }, 500); // Update every 500ms

    // Store interval for cleanup
    this.activeSearches.set(`geiger-${readerId}`, interval);
  }

  /**
   * Stop Geiger counter mode
   */
  stopGeigerMode(readerId: string): void {
    const interval = this.activeSearches.get(`geiger-${readerId}`);
    if (interval) {
      clearInterval(interval);
      this.activeSearches.delete(`geiger-${readerId}`);
      this.io.to(`reader:${readerId}`).emit('geiger:stopped');
    }
  }

  /**
   * Barcode fallback search
   */
  async verifyByBarcode(barcode: string): Promise<any> {
    const result = await this.db.query(
      `SELECT o.*, l.location_name, l.zone
       FROM objects o
       LEFT JOIN locations l ON o.current_location_id = l.id
       WHERE o.barcode_value = $1`,
      [barcode]
    );

    if (result.rows.length === 0) {
      return { found: false, message: 'Barcode not found' };
    }

    const docket = result.rows[0];
    
    // Log barcode verification
    await this.db.query(
      `INSERT INTO barcode_verifications 
       (docket_id, barcode_value, scan_location, verification_status, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [docket.id, barcode, 'Manual scan', 'Verified']
    );

    return {
      found: true,
      docket: {
        id: docket.object_code,
        name: docket.name,
        location: docket.location_name,
        zone: docket.zone,
        lastSeen: docket.updated_at
      },
      verificationMethod: 'barcode'
    };
  }

  /**
   * Generate navigation path to docket
   */
  private async generateNavigationPath(location: any): Promise<NavigationPath> {
    const steps: NavigationStep[] = [];
    
    // Assume user starts at main entrance
    const startPoint = { x: 0, y: 0, floor: 0 };
    const endPoint = { 
      x: location.coordinates?.x || 100, 
      y: location.coordinates?.y || 100, 
      floor: location.floor 
    };

    // Floor navigation
    if (startPoint.floor !== endPoint.floor) {
      steps.push({
        instruction: `Take elevator to floor ${endPoint.floor}`,
        distance: 0,
        direction: endPoint.floor > startPoint.floor ? 'up' : 'down',
        landmark: 'Main elevator bank'
      });
    }

    // Horizontal navigation
    steps.push({
      instruction: `Walk to ${location.zone} zone`,
      distance: this.calculateDistance(startPoint, endPoint),
      direction: 'straight',
      landmark: `Look for ${location.zone} signage`
    });

    // Shelf navigation
    if (location.shelf) {
      steps.push({
        instruction: `Locate shelf ${location.shelf}`,
        distance: 5,
        direction: 'straight',
        landmark: `Shelf labels on left side`
      });
    }

    // Position on shelf
    if (location.position) {
      steps.push({
        instruction: `Check ${location.position} on shelf`,
        distance: 0,
        direction: 'straight',
        landmark: 'Use handheld for precise location'
      });
    }

    const totalDistance = steps.reduce((sum, step) => sum + step.distance, 0);
    
    return {
      steps,
      totalDistance,
      estimatedTime: `${Math.ceil(totalDistance / 50)} minutes`, // 50m per minute walking
      visualMap: this.generateVisualMap(location)
    };
  }

  /**
   * Helper functions
   */
  private initializeReaderNetwork() {
    // Initialize reader positions for triangulation
    const readers = [
      { id: 'PORTAL-MAIN-01', x: 0, y: 0, floor: 0, zone: 'Entrance', building: 'Main' },
      { id: 'PORTAL-EVIDENCE-01', x: 100, y: 0, floor: 0, zone: 'Evidence', building: 'Main' },
      { id: 'PORTAL-ARCHIVE-01', x: 200, y: 0, floor: 0, zone: 'Archive', building: 'Main' },
      // ... add all readers
    ];

    readers.forEach(r => this.readerNetwork.set(r.id, r));
  }

  private rssiToDistance(rssi: number): number {
    // Convert RSSI to approximate distance in meters
    // Using path loss formula: RSSI = -10 * n * log10(d) + A
    const A = -30; // RSSI at 1 meter
    const n = 2; // Path loss exponent
    return Math.pow(10, (A - rssi) / (10 * n));
  }

  private rssiToAudioFrequency(rssi: number): number {
    // Convert RSSI to audio frequency for Geiger counter
    // Stronger signal = higher frequency
    const minFreq = 100; // Hz
    const maxFreq = 2000; // Hz
    const normalized = (rssi + 100) / 70; // Normalize -100 to -30 dBm
    return minFreq + (normalized * (maxFreq - minFreq));
  }

  private rssiToVisual(current: number, max: number): string {
    const percentage = ((current + 100) / 70) * 100;
    const bars = Math.ceil(percentage / 20);
    return '█'.repeat(bars) + '░'.repeat(5 - bars);
  }

  private async broadcastToReaders(command: any): Promise<any[]> {
    // Simulate broadcast to all readers
    // In production, this would use LLRP or REST API
    const promises = Array.from(this.readerNetwork.keys()).map(readerId =>
      this.sendCommandToReader(readerId, command)
    );
    
    return Promise.all(promises);
  }

  private async sendCommandToReader(readerId: string, command: any): Promise<any> {
    // Simulate reader command
    // In production, integrate with actual reader API
    return {
      readerId,
      tagFound: Math.random() > 0.7, // Simulate 30% success rate
      rssi: -30 - Math.random() * 70,
      timestamp: new Date()
    };
  }

  private async getSingleReading(readerId: string, tagId: string): Promise<any> {
    // Get single reading from specific reader
    return this.sendCommandToReader(readerId, { command: 'READ', tagId });
  }

  private calculateDistance(point1: any, point2: any): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private coordinatesToZone(x: number, y: number): string {
    // Map coordinates to zone names
    if (x < 50) return 'Entrance';
    if (x < 150) return 'Evidence';
    if (x < 250) return 'Archive';
    return 'General';
  }

  private async findNearestShelf(x: number, y: number, floor: number): Promise<any> {
    // Find nearest shelf to coordinates
    const result = await this.db.query(
      `SELECT shelf_code, 
              SQRT(POWER(x_coord - $1, 2) + POWER(y_coord - $2, 2)) as distance
       FROM shelves 
       WHERE floor = $3
       ORDER BY distance ASC
       LIMIT 1`,
      [x, y, floor]
    );

    return {
      code: result.rows[0]?.shelf_code || 'Unknown',
      level: 'Middle shelf'
    };
  }

  private async identifyShelf(reading: any): Promise<string> {
    // Identify shelf from reader antenna
    if (reading.antenna) {
      return `Shelf-${reading.antenna}`;
    }
    return 'Unknown shelf';
  }

  private isRecent(timestamp: Date): boolean {
    // Check if timestamp is within last 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - timestamp.getTime()) < fiveMinutes;
  }

  private async verifyLocation(docketId: string, location: any): Promise<boolean> {
    // Quick verification scan at last known location
    const reading = await this.sendCommandToReader(location.readerId, {
      command: 'VERIFY',
      tagId: docketId
    });
    return reading.tagFound;
  }

  private async getLastKnownLocation(docketId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT l.*, o.updated_at as timestamp
       FROM objects o
       JOIN locations l ON o.current_location_id = l.id
       WHERE o.object_code = $1`,
      [docketId]
    );

    if (result.rows.length === 0) return null;

    return {
      location: result.rows[0],
      timestamp: new Date(result.rows[0].timestamp)
    };
  }

  private async updateDocketLocation(docketId: string, location: any): Promise<void> {
    await this.db.query(
      `UPDATE objects 
       SET current_location_id = (
         SELECT id FROM locations 
         WHERE zone = $1 
         LIMIT 1
       ),
       updated_at = NOW()
       WHERE object_code = $2`,
      [location.zone, docketId]
    );
  }

  private createFoundResult(docketId: string, location: any, timeMs: number): FindResult {
    return {
      found: true,
      docketId,
      location: {
        building: location.building || 'Main',
        floor: location.floor || 0,
        zone: location.zone,
        shelf: location.shelf_code,
        position: location.position,
        lastSeen: new Date(),
        confidence: 95
      },
      estimatedTime: `${Math.round(timeMs / 1000)} seconds`
    };
  }

  private createNotFoundResult(docketId: string): FindResult {
    return {
      found: false,
      docketId,
      location: {
        building: 'Unknown',
        floor: 0,
        zone: 'Not found',
        lastSeen: new Date(),
        confidence: 0
      },
      alternativeMethods: [
        'Try barcode scanning',
        'Check physical inventory',
        'Review movement history'
      ],
      estimatedTime: 'N/A'
    };
  }

  private suggestBarcodeSearch(docketId: string): FindResult {
    return {
      found: false,
      docketId,
      location: {
        building: 'Unknown',
        floor: 0,
        zone: 'RFID not detected',
        lastSeen: new Date(),
        confidence: 0
      },
      alternativeMethods: [
        'Use barcode scanner for verification',
        'Check if tag is damaged',
        'Verify in physical filing system'
      ],
      estimatedTime: 'Requires manual search'
    };
  }

  private generateVisualMap(location: any): string {
    // Generate ASCII map for terminal display
    // In production, this would generate actual visual map
    return `
    Floor ${location.floor}
    ┌─────────────────────────┐
    │ [Entrance]   [Evidence] │
    │                         │
    │     📍 ${location.zone}  │
    │     Shelf: ${location.shelf || 'N/A'}
    │                         │
    │ [Archive]    [Court]    │
    └─────────────────────────┘
    `;
  }
}

export default DocketFinderService;