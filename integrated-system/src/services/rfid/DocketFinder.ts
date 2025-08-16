/**
 * Docket Finder Service
 * Implements "find any docket in 30 seconds" with Geiger counter mode
 */

import { EventEmitter } from 'events';
import { RfidHardwareInterface, RfidReadEvent } from './RfidHardwareInterface';
import { RfidTriangulation, Position3D, TagLocation } from './RfidTriangulation';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

export interface FindingSession {
  id: string;
  docket_code: string;
  rfid_tag: string;
  status: 'searching' | 'detected' | 'approaching' | 'found' | 'lost';
  start_time: number;
  current_position?: Position3D;
  target_zone?: number;
  distance?: number;
  signal_strength?: number;
  direction?: { bearing: number; elevation: number };
  path?: Position3D[];
  time_elapsed: number;
  mode: 'standard' | 'geiger' | 'navigation';
}

export interface GeigerReading {
  strength: number; // 0-100
  distance: number; // meters
  trend: 'closer' | 'farther' | 'stable';
  beep_rate: number; // beeps per second
  vibration_intensity: number; // 0-100
}

export interface NavigationInstruction {
  type: 'move' | 'turn' | 'stop' | 'found';
  direction?: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
  distance?: number;
  angle?: number;
  message: string;
  voice_prompt: string;
}

export class DocketFinder extends EventEmitter {
  private hardware: RfidHardwareInterface;
  private triangulation: RfidTriangulation;
  private activeSessions: Map<string, FindingSession> = new Map();
  private signalHistory: Map<string, number[]> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  
  // Geiger counter settings
  private readonly MIN_BEEP_RATE = 0.5; // beeps per second at max distance
  private readonly MAX_BEEP_RATE = 20; // beeps per second when very close
  private readonly FOUND_THRESHOLD = 0.5; // meters

  constructor(hardware: RfidHardwareInterface, triangulation: RfidTriangulation) {
    super();
    this.hardware = hardware;
    this.triangulation = triangulation;
    
    // Listen for tag reads
    this.hardware.on('tag-read', this.handleTagRead.bind(this));
    
    // Start update loop
    this.updateInterval = setInterval(() => this.updateSessions(), 100);
  }

  /**
   * Start finding a docket - main entry point
   */
  async startFinding(docketCode: string, mode: 'standard' | 'geiger' | 'navigation' = 'standard'): Promise<FindingSession> {
    try {
      // Get docket info from database
      const result = await query(
        `SELECT d.*, sz.zone_name, sb.shelf_code 
         FROM dockets d
         LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
         LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
         WHERE d.docket_code = $1`,
        [docketCode]
      );

      if (result.rows.length === 0) {
        throw new Error(`Docket ${docketCode} not found`);
      }

      const docket = result.rows[0];
      
      if (!docket.rfid_tag) {
        throw new Error(`Docket ${docketCode} has no RFID tag`);
      }

      // Create finding session
      const session: FindingSession = {
        id: `find-${Date.now()}`,
        docket_code: docketCode,
        rfid_tag: docket.rfid_tag,
        status: 'searching',
        start_time: Date.now(),
        target_zone: docket.current_zone_id,
        time_elapsed: 0,
        mode
      };

      this.activeSessions.set(session.id, session);
      this.signalHistory.set(session.id, []);

      // Start intensive scanning on all readers
      await this.startIntensiveScan(docket.current_zone_id);

      // Emit session started
      this.emit('session-started', session);
      
      logger.info(`Started finding session for docket ${docketCode} in ${mode} mode`);
      
      return session;
    } catch (error) {
      logger.error('Error starting finding session:', error);
      throw error;
    }
  }

  /**
   * Stop finding session
   */
  async stopFinding(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this.activeSessions.delete(sessionId);
    this.signalHistory.delete(sessionId);

    // Stop intensive scanning
    await this.stopIntensiveScan();

    this.emit('session-ended', session);
    logger.info(`Ended finding session ${sessionId}`);
  }

  /**
   * Handle RFID tag read event
   */
  private handleTagRead(event: RfidReadEvent): void {
    // Check all active sessions
    this.activeSessions.forEach(session => {
      if (event.tag.epc === session.rfid_tag) {
        this.updateSessionWithReading(session, event);
      }
    });
  }

  /**
   * Update session with new RFID reading
   */
  private updateSessionWithReading(session: FindingSession, event: RfidReadEvent): void {
    const prevStatus = session.status;
    
    // Update status
    if (session.status === 'searching') {
      session.status = 'detected';
      this.emit('docket-detected', session);
    }

    // Update signal strength
    session.signal_strength = event.tag.rssi;

    // Add to signal history
    const history = this.signalHistory.get(session.id) || [];
    history.push(event.tag.rssi);
    if (history.length > 10) history.shift();
    this.signalHistory.set(session.id, history);

    // Update position if available
    if (event.location.estimated_position) {
      session.current_position = event.location.estimated_position;
      
      // Calculate distance if we have user position
      // In real implementation, get user position from handheld reader
      const userPosition = this.getUserPosition();
      if (userPosition) {
        session.distance = this.calculateDistance(userPosition, session.current_position);
        
        // Check if found
        if (session.distance < this.FOUND_THRESHOLD) {
          session.status = 'found';
          this.emit('docket-found', session);
        } else if (session.distance < 5) {
          session.status = 'approaching';
        }

        // Calculate direction
        session.direction = this.calculateDirection(userPosition, session.current_position);
      }
    }

    // Handle different modes
    switch (session.mode) {
      case 'geiger':
        this.updateGeigerMode(session);
        break;
      case 'navigation':
        this.updateNavigationMode(session);
        break;
    }

    // Emit update
    this.emit('session-updated', session);
  }

  /**
   * Update Geiger counter mode
   */
  private updateGeigerMode(session: FindingSession): void {
    const history = this.signalHistory.get(session.id) || [];
    if (history.length < 2) return;

    // Calculate signal trend
    const recent = history.slice(-3);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = history.slice(-6, -3);
    const avgOlder = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : avgRecent;
    
    let trend: 'closer' | 'farther' | 'stable' = 'stable';
    if (avgRecent > avgOlder + 2) trend = 'closer';
    else if (avgRecent < avgOlder - 2) trend = 'farther';

    // Calculate geiger reading
    const distance = session.distance || this.estimateDistanceFromRSSI(session.signal_strength || -100);
    const strength = Math.max(0, Math.min(100, 100 - distance * 2));
    
    // Calculate beep rate (exponential increase as we get closer)
    const normalizedDistance = Math.max(0, Math.min(50, distance)) / 50;
    const beepRate = this.MIN_BEEP_RATE + 
      (this.MAX_BEEP_RATE - this.MIN_BEEP_RATE) * Math.pow(1 - normalizedDistance, 2);

    // Calculate vibration intensity
    const vibrationIntensity = Math.max(0, Math.min(100, strength * 1.5));

    const reading: GeigerReading = {
      strength,
      distance,
      trend,
      beep_rate: beepRate,
      vibration_intensity: vibrationIntensity
    };

    this.emit('geiger-reading', { session, reading });

    // Generate audio/haptic feedback
    this.generateFeedback(reading);
  }

  /**
   * Update navigation mode with turn-by-turn instructions
   */
  private updateNavigationMode(session: FindingSession): void {
    if (!session.current_position) return;

    const userPosition = this.getUserPosition();
    if (!userPosition) return;

    // Calculate optimal path
    const path = this.calculateOptimalPath(userPosition, session.current_position);
    session.path = path;

    // Generate navigation instruction
    const instruction = this.generateNavigationInstruction(userPosition, path);
    
    this.emit('navigation-instruction', { session, instruction });
  }

  /**
   * Calculate optimal path avoiding obstacles
   */
  private calculateOptimalPath(from: Position3D, to: Position3D): Position3D[] {
    // Simple straight-line path for now
    // In production, use A* or Dijkstra with obstacle map
    const steps = 10;
    const path: Position3D[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      path.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
        accuracy: 1,
        confidence: 0.9
      });
    }

    return path;
  }

  /**
   * Generate navigation instruction based on path
   */
  private generateNavigationInstruction(userPos: Position3D, path: Position3D[]): NavigationInstruction {
    if (path.length < 2) {
      return {
        type: 'stop',
        message: 'Calculating route...',
        voice_prompt: 'Please wait, calculating route'
      };
    }

    const nextPoint = path[1];
    const distance = this.calculateDistance(userPos, nextPoint);

    // Check if we're at the destination
    if (distance < this.FOUND_THRESHOLD) {
      return {
        type: 'found',
        message: 'Docket found! Look around you.',
        voice_prompt: 'You have reached the docket. It should be within arms reach.'
      };
    }

    // Calculate direction to next point
    const bearing = Math.atan2(nextPoint.y - userPos.y, nextPoint.x - userPos.x) * 180 / Math.PI;
    const userBearing = this.getUserBearing(); // From device compass

    let angleDiff = bearing - userBearing;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    // Generate turn instruction if needed
    if (Math.abs(angleDiff) > 15) {
      const direction = angleDiff > 0 ? 'right' : 'left';
      return {
        type: 'turn',
        direction,
        angle: Math.abs(angleDiff),
        message: `Turn ${direction} ${Math.round(Math.abs(angleDiff))}°`,
        voice_prompt: `Turn ${direction} ${Math.round(Math.abs(angleDiff))} degrees`
      };
    }

    // Move forward
    return {
      type: 'move',
      direction: 'forward',
      distance,
      message: `Move forward ${distance.toFixed(1)}m`,
      voice_prompt: `Walk forward ${Math.round(distance)} meters`
    };
  }

  /**
   * Start intensive scanning in target zone
   */
  private async startIntensiveScan(zoneId?: number): Promise<void> {
    const readers = this.hardware.getReaders();
    
    for (const reader of readers) {
      if (!zoneId || reader.location.zone_id === zoneId) {
        // Increase antenna power for better range
        await this.hardware.setAntennaPower(reader.id, reader.antenna_power + 3);
        
        // Start continuous inventory
        await this.hardware.startInventory(reader.id);
      }
    }
  }

  /**
   * Stop intensive scanning
   */
  private async stopIntensiveScan(): Promise<void> {
    const readers = this.hardware.getReaders();
    
    for (const reader of readers) {
      // Reset antenna power
      await this.hardware.setAntennaPower(reader.id, reader.antenna_power);
      
      // Stop continuous inventory
      await this.hardware.stopInventory(reader.id);
    }
  }

  /**
   * Update all active sessions
   */
  private updateSessions(): void {
    const now = Date.now();

    this.activeSessions.forEach(session => {
      // Update time elapsed
      session.time_elapsed = (now - session.start_time) / 1000;

      // Check for timeout (5 minutes)
      if (session.time_elapsed > 300 && session.status === 'searching') {
        session.status = 'lost';
        this.emit('docket-lost', session);
        this.stopFinding(session.id);
      }

      // Check for success (30 seconds goal)
      if (session.status === 'found' && session.time_elapsed <= 30) {
        this.emit('finding-success', {
          session,
          message: `Found in ${session.time_elapsed.toFixed(1)} seconds!`
        });
      }
    });
  }

  /**
   * Generate audio/haptic feedback for Geiger mode
   */
  private generateFeedback(reading: GeigerReading): void {
    // In real implementation, this would interface with:
    // - Audio API for beep generation
    // - Vibration API for haptic feedback
    // - LED indicators on handheld device

    this.emit('feedback', {
      type: 'geiger',
      audio: {
        frequency: 1000 + reading.strength * 10, // Higher pitch when closer
        duration: 50,
        rate: reading.beep_rate
      },
      haptic: {
        intensity: reading.vibration_intensity,
        pattern: reading.trend === 'closer' ? 'pulse' : 'continuous'
      },
      visual: {
        color: reading.strength > 80 ? 'green' : reading.strength > 40 ? 'yellow' : 'red',
        brightness: reading.strength
      }
    });
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Position3D, pos2: Position3D): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2) +
      Math.pow(pos2.z - pos1.z, 2)
    );
  }

  /**
   * Calculate direction from one position to another
   */
  private calculateDirection(from: Position3D, to: Position3D): { bearing: number; elevation: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
    
    return {
      bearing: Math.atan2(dy, dx) * 180 / Math.PI,
      elevation: Math.atan2(dz, horizontalDistance) * 180 / Math.PI
    };
  }

  /**
   * Estimate distance from RSSI value
   */
  private estimateDistanceFromRSSI(rssi: number): number {
    // Simple path loss model
    const txPower = -30; // Assumed transmit power at 1m
    const pathLossExponent = 2.7;
    
    return Math.pow(10, (txPower - rssi) / (10 * pathLossExponent));
  }

  /**
   * Get current user position (from handheld reader or app)
   */
  private getUserPosition(): Position3D | null {
    // In real implementation, this would:
    // - Get position from handheld reader's GPS
    // - Or use indoor positioning from phone
    // - Or triangulate from fixed readers
    
    // Mock position for now
    return {
      x: 10,
      y: 10,
      z: 0,
      accuracy: 1,
      confidence: 0.9
    };
  }

  /**
   * Get user's current bearing (compass heading)
   */
  private getUserBearing(): number {
    // In real implementation, get from device compass
    return 0; // North
  }

  /**
   * Get finding statistics
   */
  getStatistics(): any {
    const sessions = Array.from(this.activeSessions.values());
    const completed = sessions.filter(s => s.status === 'found');
    const avgTime = completed.length > 0
      ? completed.reduce((sum, s) => sum + s.time_elapsed, 0) / completed.length
      : 0;

    return {
      active_sessions: sessions.length,
      completed_sessions: completed.length,
      average_finding_time: avgTime,
      success_rate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0,
      under_30_seconds: completed.filter(s => s.time_elapsed <= 30).length
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.removeAllListeners();
  }
}