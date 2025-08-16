/**
 * RFID Alert and Notification Service
 * Real-time tracking, alerts, and geofencing
 */

import { EventEmitter } from 'events';
import { Server as SocketServer } from 'socket.io';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';

interface RFIDAlert {
  id: string;
  type: 'movement' | 'missing' | 'unauthorized' | 'geofence' | 'low_battery' | 'tamper';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tagId: string;
  docketId?: number;
  location: {
    zone: string;
    reader: string;
    coordinates?: { x: number; y: number; z: number };
  };
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

interface TrackingSession {
  sessionId: string;
  docketId: number;
  tagId: string;
  startTime: Date;
  lastSeen: Date;
  currentLocation: string;
  path: Array<{
    location: string;
    timestamp: Date;
    signalStrength: number;
  }>;
  status: 'tracking' | 'located' | 'lost' | 'completed';
  alerts: RFIDAlert[];
}

interface Geofence {
  id: string;
  name: string;
  type: 'inclusion' | 'exclusion';
  boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ?: number;
    maxZ?: number;
  };
  authorizedTags: string[];
  alertOnEntry: boolean;
  alertOnExit: boolean;
  active: boolean;
}

export class RFIDAlertService extends EventEmitter {
  private static instance: RFIDAlertService;
  private io: SocketServer | null = null;
  private cache: CacheService;
  private activeSessions: Map<string, TrackingSession> = new Map();
  private geofences: Map<string, Geofence> = new Map();
  private alertQueue: RFIDAlert[] = [];
  private processingAlerts: boolean = false;

  private constructor() {
    super();
    this.cache = CacheService.getInstance();
    this.initializeGeofences();
    this.startAlertProcessor();
  }

  public static getInstance(): RFIDAlertService {
    if (!RFIDAlertService.instance) {
      RFIDAlertService.instance = new RFIDAlertService();
    }
    return RFIDAlertService.instance;
  }

  /**
   * Set Socket.IO server for real-time communication
   */
  public setSocketServer(io: SocketServer): void {
    this.io = io;
    logger.info('RFID Alert Service connected to Socket.IO');
  }

  /**
   * Initialize geofences from database
   */
  private async initializeGeofences(): Promise<void> {
    try {
      const result = await query(`
        SELECT * FROM rfid_geofences WHERE active = true
      `);

      for (const row of result.rows) {
        this.geofences.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.fence_type,
          boundaries: row.boundaries,
          authorizedTags: row.authorized_tags || [],
          alertOnEntry: row.alert_on_entry,
          alertOnExit: row.alert_on_exit,
          active: row.active
        });
      }

      logger.info(`Loaded ${this.geofences.size} active geofences`);
    } catch (error) {
      logger.error('Error loading geofences:', error);
    }
  }

  /**
   * Start a new tracking session
   */
  async startTrackingSession(docketId: number, tagId: string): Promise<TrackingSession> {
    const sessionId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: TrackingSession = {
      sessionId,
      docketId,
      tagId,
      startTime: new Date(),
      lastSeen: new Date(),
      currentLocation: 'Unknown',
      path: [],
      status: 'tracking',
      alerts: []
    };

    this.activeSessions.set(sessionId, session);

    // Store in database
    await query(`
      INSERT INTO rfid_tracking_sessions (
        session_id, docket_id, tag_id, start_time, status
      ) VALUES ($1, $2, $3, $4, $5)
    `, [sessionId, docketId, tagId, session.startTime, 'tracking']);

    // Emit to connected clients
    this.broadcastToRoom('tracking', {
      type: 'session_started',
      session
    });

    logger.info(`Started tracking session ${sessionId} for docket ${docketId}`);
    return session;
  }

  /**
   * Process RFID tag read event
   */
  async processTagRead(event: {
    tagId: string;
    readerId: string;
    location: string;
    signalStrength: number;
    coordinates?: { x: number; y: number; z: number };
    timestamp: Date;
  }): Promise<void> {
    // Find active sessions for this tag
    const sessions = Array.from(this.activeSessions.values()).filter(s => s.tagId === event.tagId);

    for (const session of sessions) {
      // Update session
      session.lastSeen = event.timestamp;
      session.currentLocation = event.location;
      session.path.push({
        location: event.location,
        timestamp: event.timestamp,
        signalStrength: event.signalStrength
      });

      // Check geofences
      if (event.coordinates) {
        await this.checkGeofenceViolations(session, event.coordinates);
      }

      // Check for anomalies
      await this.checkForAnomalies(session, event);

      // Update database
      await query(`
        UPDATE rfid_tracking_sessions 
        SET last_seen = $1, current_location = $2, path = $3
        WHERE session_id = $4
      `, [event.timestamp, event.location, JSON.stringify(session.path), session.sessionId]);

      // Broadcast update
      this.broadcastToRoom(`session_${session.sessionId}`, {
        type: 'location_update',
        sessionId: session.sessionId,
        location: event.location,
        coordinates: event.coordinates,
        timestamp: event.timestamp
      });
    }

    // Check for unauthorized movement
    if (sessions.length === 0) {
      await this.checkUnauthorizedMovement(event);
    }
  }

  /**
   * Check for geofence violations
   */
  private async checkGeofenceViolations(
    session: TrackingSession, 
    coordinates: { x: number; y: number; z: number }
  ): Promise<void> {
    for (const [id, geofence] of this.geofences) {
      const isInside = this.isInsideGeofence(coordinates, geofence.boundaries);
      const wasInside = session.path.length > 1 && 
        session.path[session.path.length - 2].location === geofence.name;

      if (geofence.type === 'exclusion' && isInside) {
        // Entered exclusion zone
        await this.createAlert({
          type: 'geofence',
          severity: 'high',
          tagId: session.tagId,
          docketId: session.docketId,
          location: {
            zone: geofence.name,
            reader: session.currentLocation,
            coordinates
          },
          message: `Tag ${session.tagId} entered restricted zone: ${geofence.name}`
        });
      } else if (geofence.type === 'inclusion' && !isInside && wasInside) {
        // Left inclusion zone
        await this.createAlert({
          type: 'geofence',
          severity: 'medium',
          tagId: session.tagId,
          docketId: session.docketId,
          location: {
            zone: geofence.name,
            reader: session.currentLocation,
            coordinates
          },
          message: `Tag ${session.tagId} left authorized zone: ${geofence.name}`
        });
      }
    }
  }

  /**
   * Check if coordinates are inside geofence boundaries
   */
  private isInsideGeofence(
    coords: { x: number; y: number; z: number },
    boundaries: Geofence['boundaries']
  ): boolean {
    return coords.x >= boundaries.minX && coords.x <= boundaries.maxX &&
           coords.y >= boundaries.minY && coords.y <= boundaries.maxY &&
           (!boundaries.minZ || (coords.z >= boundaries.minZ && coords.z <= boundaries.maxZ!));
  }

  /**
   * Check for anomalies in movement patterns
   */
  private async checkForAnomalies(
    session: TrackingSession,
    event: any
  ): Promise<void> {
    // Check for sudden signal loss
    if (event.signalStrength < 20 && session.path.length > 0) {
      const lastSignal = session.path[session.path.length - 1].signalStrength;
      if (lastSignal > 70) {
        await this.createAlert({
          type: 'tamper',
          severity: 'high',
          tagId: session.tagId,
          docketId: session.docketId,
          location: {
            zone: event.location,
            reader: event.readerId
          },
          message: `Sudden signal drop detected for tag ${session.tagId} (${lastSignal}% to ${event.signalStrength}%)`
        });
      }
    }

    // Check for impossible movement speed
    if (session.path.length > 1 && event.coordinates) {
      const lastLocation = session.path[session.path.length - 1];
      const timeDiff = (event.timestamp.getTime() - new Date(lastLocation.timestamp).getTime()) / 1000; // seconds
      
      // Calculate distance (simplified)
      const distance = Math.sqrt(
        Math.pow(event.coordinates.x - (session.path[session.path.length - 1] as any).coordinates?.x || 0, 2) +
        Math.pow(event.coordinates.y - (session.path[session.path.length - 1] as any).coordinates?.y || 0, 2)
      );

      const speed = distance / timeDiff; // units per second
      
      if (speed > 10) { // Threshold for impossible speed
        await this.createAlert({
          type: 'tamper',
          severity: 'critical',
          tagId: session.tagId,
          docketId: session.docketId,
          location: {
            zone: event.location,
            reader: event.readerId,
            coordinates: event.coordinates
          },
          message: `Impossible movement speed detected for tag ${session.tagId} (${speed.toFixed(1)} m/s)`
        });
      }
    }
  }

  /**
   * Check for unauthorized movement
   */
  private async checkUnauthorizedMovement(event: any): Promise<void> {
    // Check if tag is registered
    const tagResult = await query(`
      SELECT d.id, d.docket_code, d.title 
      FROM dockets d 
      WHERE d.rfid_tag = $1
    `, [event.tagId]);

    if (tagResult.rows.length === 0) {
      await this.createAlert({
        type: 'unauthorized',
        severity: 'high',
        tagId: event.tagId,
        location: {
          zone: event.location,
          reader: event.readerId,
          coordinates: event.coordinates
        },
        message: `Unregistered tag detected: ${event.tagId}`
      });
    }
  }

  /**
   * Create and queue an alert
   */
  async createAlert(alertData: Omit<RFIDAlert, 'id' | 'timestamp' | 'acknowledged' | 'acknowledgedBy' | 'acknowledgedAt'>): Promise<RFIDAlert> {
    const alert: RFIDAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      timestamp: new Date(),
      acknowledged: false
    };

    // Add to queue
    this.alertQueue.push(alert);

    // Store in database
    await query(`
      INSERT INTO rfid_alerts (
        alert_id, alert_type, severity, tag_id, docket_id,
        location, message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      alert.id,
      alert.type,
      alert.severity,
      alert.tagId,
      alert.docketId,
      JSON.stringify(alert.location),
      alert.message,
      alert.timestamp
    ]);

    // Add to session if applicable
    const session = Array.from(this.activeSessions.values())
      .find(s => s.tagId === alert.tagId);
    if (session) {
      session.alerts.push(alert);
    }

    // Emit alert
    this.emit('alert', alert);
    this.broadcastToRoom('alerts', {
      type: 'new_alert',
      alert
    });

    logger.warn(`RFID Alert created: ${alert.message}`);
    return alert;
  }

  /**
   * Process alert queue
   */
  private async startAlertProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.processingAlerts || this.alertQueue.length === 0) return;

      this.processingAlerts = true;
      const alertsToProcess = [...this.alertQueue];
      this.alertQueue = [];

      for (const alert of alertsToProcess) {
        await this.sendAlertNotifications(alert);
      }

      this.processingAlerts = false;
    }, 5000); // Process every 5 seconds
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: RFIDAlert): Promise<void> {
    // Get notification preferences
    const prefs = await query(`
      SELECT * FROM notification_preferences 
      WHERE alert_type = $1 AND severity >= $2
    `, [alert.type, alert.severity]);

    for (const pref of prefs.rows) {
      if (pref.channel === 'email') {
        // Queue email notification
        logger.info(`Queuing email for alert ${alert.id}`);
      } else if (pref.channel === 'sms') {
        // Queue SMS notification
        logger.info(`Queuing SMS for alert ${alert.id}`);
      } else if (pref.channel === 'push') {
        // Send push notification
        this.broadcastToRoom('push_notifications', {
          type: 'alert',
          alert
        });
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alertQueue.find(a => a.id === alertId) ||
                  Array.from(this.activeSessions.values())
                    .flatMap(s => s.alerts)
                    .find(a => a.id === alertId);

    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();

      await query(`
        UPDATE rfid_alerts 
        SET acknowledged = true, acknowledged_by = $1, acknowledged_at = $2
        WHERE alert_id = $3
      `, [userId, alert.acknowledgedAt, alertId]);

      this.broadcastToRoom('alerts', {
        type: 'alert_acknowledged',
        alertId,
        acknowledgedBy: userId
      });
    }
  }

  /**
   * Get active tracking sessions
   */
  getActiveSessions(): TrackingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TrackingSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * End tracking session
   */
  async endTrackingSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      
      await query(`
        UPDATE rfid_tracking_sessions 
        SET status = 'completed', end_time = $1
        WHERE session_id = $2
      `, [new Date(), sessionId]);

      this.activeSessions.delete(sessionId);

      this.broadcastToRoom('tracking', {
        type: 'session_ended',
        sessionId
      });

      logger.info(`Ended tracking session ${sessionId}`);
    }
  }

  /**
   * Broadcast to Socket.IO room
   */
  private broadcastToRoom(room: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit('rfid_update', data);
    }
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit: number = 50): Promise<RFIDAlert[]> {
    const result = await query(`
      SELECT * FROM rfid_alerts 
      ORDER BY created_at DESC 
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      id: row.alert_id,
      type: row.alert_type,
      severity: row.severity,
      tagId: row.tag_id,
      docketId: row.docket_id,
      location: row.location,
      message: row.message,
      timestamp: row.created_at,
      acknowledged: row.acknowledged,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at
    }));
  }

  /**
   * Create or update geofence
   */
  async createGeofence(geofence: Omit<Geofence, 'id'>): Promise<Geofence> {
    const id = `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGeofence: Geofence = {
      id,
      ...geofence
    };

    await query(`
      INSERT INTO rfid_geofences (
        id, name, fence_type, boundaries, authorized_tags,
        alert_on_entry, alert_on_exit, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      id,
      geofence.name,
      geofence.type,
      JSON.stringify(geofence.boundaries),
      geofence.authorizedTags,
      geofence.alertOnEntry,
      geofence.alertOnExit,
      geofence.active
    ]);

    if (geofence.active) {
      this.geofences.set(id, newGeofence);
    }

    return newGeofence;
  }
}

export default RFIDAlertService;