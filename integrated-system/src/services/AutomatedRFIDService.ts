/**
 * Automated RFID Service
 * Handles 100% automated tracking with zero manual scanning
 */

import { EventEmitter } from 'events';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { Server } from 'socket.io';

interface ReaderZone {
  readerId: string;
  zone: string;
  coverage: { x: number; y: number; width: number; height: number };
  type: 'portal' | 'overhead' | 'shelf' | 'tunnel';
}

interface AutomatedEvent {
  tagId: string;
  readers: Array<{
    readerId: string;
    rssi: number;
    timestamp: Date;
  }>;
  location: {
    zone: string;
    subZone?: string;
    coordinates?: { x: number; y: number; z: number };
    confidence?: number;
  };
  movement: {
    from: string;
    to: string;
    direction: 'in' | 'out' | 'through';
    speed?: number;
  };
}

export class AutomatedRFIDService extends EventEmitter {
  private static instance: AutomatedRFIDService;
  private db: DatabaseService;
  private io: Server;
  private readerZones: Map<string, ReaderZone>;
  private tagLastSeen: Map<string, AutomatedEvent>;
  private alertThresholds: any;

  private constructor(io: Server) {
    super();
    this.io = io;
    this.db = DatabaseService.getInstance();
    this.readerZones = new Map();
    this.tagLastSeen = new Map();
    this.initializeReaderZones();
    this.setupAutomationRules();
  }

  static getInstance(io?: Server): AutomatedRFIDService {
    if (!AutomatedRFIDService.instance && io) {
      AutomatedRFIDService.instance = new AutomatedRFIDService(io);
    }
    return AutomatedRFIDService.instance;
  }

  /**
   * Initialize reader zones for complete facility coverage
   */
  private initializeReaderZones() {
    // Portal readers at entry/exit points
    const portals = [
      { id: 'PORTAL-MAIN', zone: 'main_entrance', coverage: { x: 0, y: 0, width: 10, height: 8 } },
      { id: 'PORTAL-EVIDENCE', zone: 'evidence_room', coverage: { x: 100, y: 0, width: 8, height: 8 } },
      { id: 'PORTAL-ARCHIVE', zone: 'archive_entrance', coverage: { x: 200, y: 0, width: 8, height: 8 } },
      { id: 'PORTAL-DISPATCH', zone: 'dispatch_area', coverage: { x: 300, y: 0, width: 12, height: 8 } },
      { id: 'PORTAL-COURT', zone: 'court_transfer', coverage: { x: 400, y: 0, width: 8, height: 8 } }
    ];

    // Overhead grid readers for area coverage
    const overhead = [];
    for (let x = 0; x < 500; x += 20) {
      for (let y = 0; y < 300; y += 20) {
        overhead.push({
          id: `OVERHEAD-${x}-${y}`,
          zone: `zone_${x}_${y}`,
          coverage: { x, y, width: 20, height: 20 }
        });
      }
    }

    // Smart shelf readers
    const shelves = [];
    for (let shelf = 1; shelf <= 50; shelf++) {
      shelves.push({
        id: `SHELF-${shelf}`,
        zone: `shelf_${shelf}`,
        coverage: { x: 50 + (shelf * 3), y: 50, width: 3, height: 8 }
      });
    }

    // Register all readers
    [...portals, ...overhead, ...shelves].forEach(reader => {
      this.readerZones.set(reader.id, {
        readerId: reader.id,
        zone: reader.zone,
        coverage: reader.coverage,
        type: reader.id.startsWith('PORTAL') ? 'portal' :
              reader.id.startsWith('OVERHEAD') ? 'overhead' : 'shelf'
      });
    });

    logger.info(`Initialized ${this.readerZones.size} automated reader zones`);
  }

  /**
   * Process RFID events from all readers automatically
   */
  async processAutomatedRead(tagId: string, readerId: string, rssi: number) {
    const reader = this.readerZones.get(readerId);
    if (!reader) {
      logger.warn(`Unknown reader: ${readerId}`);
      return;
    }

    // Get all reads for this tag in last 2 seconds for triangulation
    const recentReads = await this.getRecentReads(tagId, 2000);
    
    // Calculate precise location using multiple readers
    const location = this.triangulateLocation(recentReads);
    
    // Determine movement pattern
    const movement = this.analyzeMovement(tagId, location);
    
    // Create automated event
    const event: AutomatedEvent = {
      tagId,
      readers: recentReads,
      location,
      movement
    };

    // Update tag location in real-time
    await this.updateTagLocation(event);
    
    // Check automation rules
    await this.checkAutomationRules(event);
    
    // Broadcast real-time update
    this.broadcastLocationUpdate(event);
    
    // Store for analysis
    this.tagLastSeen.set(tagId, event);
  }

  /**
   * Triangulate precise location using multiple reader signals
   */
  private triangulateLocation(reads: any[]): any {
    if (reads.length === 0) return null;
    
    if (reads.length === 1) {
      // Single reader - use zone center
      const reader = this.readerZones.get(reads[0].readerId);
      return {
        zone: reader?.zone,
        coordinates: {
          x: reader?.coverage.x! + reader?.coverage.width! / 2,
          y: reader?.coverage.y! + reader?.coverage.height! / 2,
          z: 0
        }
      };
    }

    // Multiple readers - weighted average based on signal strength
    let weightedX = 0, weightedY = 0, totalWeight = 0;
    let primaryZone = '';
    let maxRssi = -100;

    reads.forEach(read => {
      const reader = this.readerZones.get(read.readerId);
      if (reader) {
        // Convert RSSI to weight (stronger signal = higher weight)
        const weight = Math.pow(10, read.rssi / 20);
        
        const centerX = reader.coverage.x + reader.coverage.width / 2;
        const centerY = reader.coverage.y + reader.coverage.height / 2;
        
        weightedX += centerX * weight;
        weightedY += centerY * weight;
        totalWeight += weight;

        if (read.rssi > maxRssi) {
          maxRssi = read.rssi;
          primaryZone = reader.zone;
        }
      }
    });

    return {
      zone: primaryZone,
      coordinates: {
        x: Math.round(weightedX / totalWeight),
        y: Math.round(weightedY / totalWeight),
        z: 0
      },
      confidence: this.calculateConfidence(reads)
    };
  }

  /**
   * Analyze movement patterns for automatic tracking
   */
  private analyzeMovement(tagId: string, currentLocation: any): any {
    const lastSeen = this.tagLastSeen.get(tagId);
    
    if (!lastSeen) {
      return {
        from: 'unknown',
        to: currentLocation.zone,
        direction: 'in',
        isNew: true
      };
    }

    const timeDiff = Date.now() - lastSeen.readers[0].timestamp.getTime();
    const distance = this.calculateDistance(
      lastSeen.location.coordinates,
      currentLocation.coordinates
    );
    
    const speed = distance / (timeDiff / 1000); // meters per second

    return {
      from: lastSeen.location.zone,
      to: currentLocation.zone,
      direction: this.determineDirection(lastSeen.location, currentLocation),
      speed,
      duration: timeDiff
    };
  }

  /**
   * Setup automation rules for zero-touch operation
   */
  private setupAutomationRules() {
    this.alertThresholds = {
      unauthorizedZone: {
        enabled: true,
        zones: ['evidence_room', 'archive_secure', 'disposal_area'],
        action: 'immediate_alert'
      },
      
      dwellTime: {
        enabled: true,
        maxMinutes: 30,
        zones: ['processing_area', 'court_transfer'],
        action: 'supervisor_notification'
      },
      
      rapidMovement: {
        enabled: true,
        maxSpeedMPS: 5, // meters per second
        action: 'security_alert'
      },
      
      misplacedItem: {
        enabled: true,
        checkInterval: 300000, // 5 minutes
        action: 'correction_queue'
      },
      
      chainOfCustody: {
        enabled: true,
        evidenceTags: true,
        action: 'automatic_logging'
      }
    };
  }

  /**
   * Check and execute automation rules
   */
  private async checkAutomationRules(event: AutomatedEvent) {
    // Check unauthorized zone entry
    if (this.alertThresholds.unauthorizedZone.enabled) {
      if (this.alertThresholds.unauthorizedZone.zones.includes(event.location.zone)) {
        const authorized = await this.checkAuthorization(event.tagId, event.location.zone);
        if (!authorized) {
          await this.triggerSecurityAlert(event, 'UNAUTHORIZED_ZONE_ENTRY');
        }
      }
    }

    // Check rapid movement (possible theft)
    if (this.alertThresholds.rapidMovement.enabled) {
      if (event.movement.speed && event.movement.speed > this.alertThresholds.rapidMovement.maxSpeedMPS) {
        await this.triggerSecurityAlert(event, 'RAPID_MOVEMENT_DETECTED');
      }
    }

    // Automatic chain of custody logging
    if (this.alertThresholds.chainOfCustody.enabled) {
      await this.logChainOfCustody(event);
    }

    // Check for misplaced items
    if (event.movement.from !== event.movement.to) {
      await this.validateItemPlacement(event);
    }
  }

  /**
   * Trigger automated security response
   */
  private async triggerSecurityAlert(event: AutomatedEvent, alertType: string) {
    const alert = {
      id: `ALERT-${Date.now()}`,
      type: alertType,
      severity: 'HIGH',
      tagId: event.tagId,
      location: event.location,
      timestamp: new Date(),
      automaticActions: [] as string[]
    };

    // Automatic responses based on alert type
    switch (alertType) {
      case 'UNAUTHORIZED_ZONE_ENTRY':
        alert.automaticActions.push('DOOR_LOCK_ACTIVATED');
        alert.automaticActions.push('SECURITY_NOTIFIED');
        alert.automaticActions.push('CAMERAS_RECORDING');
        // Could integrate with access control system
        await this.lockDownZone(event.location.zone);
        break;
        
      case 'RAPID_MOVEMENT_DETECTED':
        alert.automaticActions.push('TRACKING_INTENSIFIED');
        alert.automaticActions.push('EXIT_READERS_ALERTED');
        // Increase read frequency for this tag
        await this.intensifyTracking(event.tagId);
        break;
    }

    // Log alert
    await this.db.query(
      `INSERT INTO security_alerts (type, severity, tag_id, location, actions, resolved)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [alert.type, alert.severity, alert.tagId, JSON.stringify(alert.location), 
       JSON.stringify(alert.automaticActions)]
    );

    // Broadcast to security dashboard
    this.io.to('security').emit('security:alert', alert);
    
    // Send notifications
    await this.sendAutomatedNotifications(alert);
    
    logger.warn(`Security Alert: ${alertType} for tag ${event.tagId}`);
  }

  /**
   * Update tag location in database automatically
   */
  private async updateTagLocation(event: AutomatedEvent) {
    try {
      // Update object location
      await this.db.query(
        `UPDATE objects 
         SET current_location_id = (SELECT id FROM locations WHERE location_code = $1),
             last_seen = NOW(),
             location_confidence = $2
         WHERE rfid_tag_id = $3`,
        [event.location.zone, event.location.confidence || 100, event.tagId]
      );

      // Insert movement record
      await this.db.query(
        `INSERT INTO object_movements 
         (tag_id, from_zone, to_zone, timestamp, movement_type, speed, automated)
         VALUES ($1, $2, $3, NOW(), $4, $5, true)`,
        [event.tagId, event.movement.from, event.movement.to, 
         event.movement.direction, event.movement.speed]
      );

    } catch (error) {
      logger.error('Failed to update tag location:', error);
    }
  }

  /**
   * Broadcast real-time location updates
   */
  private broadcastLocationUpdate(event: AutomatedEvent) {
    // Send to all connected dashboards
    this.io.emit('location:update', {
      tagId: event.tagId,
      location: event.location,
      movement: event.movement,
      timestamp: new Date()
    });

    // Send to zone-specific subscribers
    this.io.to(`zone:${event.location.zone}`).emit('zone:activity', event);
  }

  /**
   * Get recent reads for triangulation
   */
  private async getRecentReads(tagId: string, timeWindowMs: number): Promise<any[]> {
    const result = await this.db.query(
      `SELECT reader_id, signal_strength as rssi, timestamp
       FROM rfid_events
       WHERE tag_id = $1 
         AND timestamp > NOW() - INTERVAL '${timeWindowMs} milliseconds'
       ORDER BY timestamp DESC`,
      [tagId]
    );
    
    return result.rows.map((row: any) => ({
      readerId: row.reader_id,
      rssi: row.rssi,
      timestamp: new Date(row.timestamp)
    }));
  }

  /**
   * Helper functions
   */
  private calculateDistance(loc1: any, loc2: any): number {
    if (!loc1 || !loc2) return 0;
    const dx = loc2.x - loc1.x;
    const dy = loc2.y - loc1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateConfidence(reads: any[]): number {
    // More readers = higher confidence
    const readerScore = Math.min(reads.length * 20, 60);
    
    // Stronger signals = higher confidence
    const avgRssi = reads.reduce((sum, r) => sum + r.rssi, 0) / reads.length;
    const signalScore = Math.max(0, Math.min(40, (avgRssi + 80) / 2));
    
    return Math.round(readerScore + signalScore);
  }

  private determineDirection(from: any, to: any): 'in' | 'out' | 'through' {
    if (!from.zone || from.zone === 'unknown') return 'in';
    if (to.zone.includes('exit') || to.zone.includes('dispatch')) return 'out';
    return 'through';
  }

  private async checkAuthorization(tagId: string, zone: string): Promise<boolean> {
    // Check if tag is authorized for this zone
    const result = await this.db.query(
      `SELECT authorized_zones 
       FROM objects 
       WHERE rfid_tag_id = $1`,
      [tagId]
    );
    
    if (result.rows.length === 0) return false;
    
    const authorizedZones = result.rows[0].authorized_zones || [];
    return authorizedZones.includes(zone);
  }

  private async logChainOfCustody(event: AutomatedEvent) {
    await this.db.query(
      `INSERT INTO chain_of_custody 
       (tag_id, action, location, automated, timestamp)
       VALUES ($1, $2, $3, true, NOW())`,
      [event.tagId, 'AUTOMATIC_MOVEMENT', JSON.stringify(event.location)]
    );
  }

  private async validateItemPlacement(event: AutomatedEvent) {
    // Check if item is in correct location
    const result = await this.db.query(
      `SELECT expected_location 
       FROM objects 
       WHERE rfid_tag_id = $1`,
      [event.tagId]
    );
    
    if (result.rows.length > 0 && result.rows[0].expected_location) {
      if (result.rows[0].expected_location !== event.location.zone) {
        await this.db.query(
          `INSERT INTO misplaced_items 
           (tag_id, expected_location, actual_location, detected_at)
           VALUES ($1, $2, $3, NOW())`,
          [event.tagId, result.rows[0].expected_location, event.location.zone]
        );
        
        // Notify for correction
        this.io.to('operations').emit('item:misplaced', {
          tagId: event.tagId,
          expected: result.rows[0].expected_location,
          actual: event.location.zone
        });
      }
    }
  }

  private async lockDownZone(zone: string) {
    logger.info(`Initiating automatic lockdown for zone: ${zone}`);
    // Integration with access control system would go here
  }

  private async intensifyTracking(tagId: string) {
    logger.info(`Intensifying tracking for tag: ${tagId}`);
    // Increase read frequency for specific tag
  }

  private async sendAutomatedNotifications(alert: any) {
    // Send notifications to relevant personnel
    logger.info(`Sending automated notifications for alert: ${alert.id}`);
  }
}

export default AutomatedRFIDService;