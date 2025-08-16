/**
 * Integrated RFID Tracking Service
 * Combines hardware, triangulation, and finding capabilities
 */

import { Server, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import { RfidHardwareInterface, RfidReaderConfig, RfidReadEvent } from './RfidHardwareInterface';
import { RfidTriangulation, Position3D, TagLocation, ReaderMeasurement } from './RfidTriangulation';
import { DocketFinder, FindingSession, GeigerReading, NavigationInstruction } from './DocketFinder';
import { query, withTransaction } from '../../database/connection';
import { logger } from '../../utils/logger';

export interface RfidTrackingConfig {
  simulation_mode: boolean;
  mqtt_broker?: string;
  update_interval: number;
  batch_size: number;
}

export interface RealtimeTrackingData {
  tag_id: string;
  docket_code?: string;
  position: Position3D;
  zone: string;
  last_seen: number;
  status: 'active' | 'idle' | 'lost';
  movement: 'stationary' | 'moving' | 'fast';
  alerts: string[];
}

export interface TrackingSession {
  id: string;
  client_id: string;
  tags: string[];
  start_time: number;
  active: boolean;
}

export class RfidTrackingService extends EventEmitter {
  private static instance: RfidTrackingService;
  private io: Server;
  private hardware: RfidHardwareInterface;
  private triangulation: RfidTriangulation;
  private finder: DocketFinder;
  private config: RfidTrackingConfig;
  
  // Tracking state
  private trackingSessions: Map<string, TrackingSession> = new Map();
  private tagLocations: Map<string, RealtimeTrackingData> = new Map();
  private readerMeasurements: Map<string, ReaderMeasurement[]> = new Map();
  private eventQueue: RfidReadEvent[] = [];
  
  // Processing intervals
  private processInterval: NodeJS.Timeout | null = null;
  private streamInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(io: Server, config: RfidTrackingConfig) {
    super();
    this.io = io;
    this.config = config;
    
    // Initialize components
    this.hardware = new RfidHardwareInterface();
    this.triangulation = new RfidTriangulation();
    this.finder = new DocketFinder(this.hardware, this.triangulation);
    
    this.setupEventHandlers();
    this.setupSocketHandlers();
  }

  static getInstance(io?: Server, config?: RfidTrackingConfig): RfidTrackingService {
    if (!RfidTrackingService.instance) {
      if (!io || !config) {
        throw new Error('IO and config required for first initialization');
      }
      RfidTrackingService.instance = new RfidTrackingService(io, config);
    }
    return RfidTrackingService.instance;
  }

  /**
   * Initialize the RFID tracking system
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing RFID tracking service...');

      // Load readers from database
      await this.loadReadersFromDatabase();

      // Start processing loops
      this.processInterval = setInterval(() => this.processEventQueue(), this.config.update_interval);
      this.streamInterval = setInterval(() => this.streamLocationUpdates(), 100);
      this.cleanupInterval = setInterval(() => this.cleanupStaleData(), 30000);

      // Start simulation if enabled
      if (this.config.simulation_mode) {
        await this.startSimulation();
      }

      logger.info('RFID tracking service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RFID tracking:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Hardware events
    this.hardware.on('tag-read', (event: RfidReadEvent) => {
      this.eventQueue.push(event);
      this.updateReaderMeasurement(event);
    });

    this.hardware.on('reader-status', (status) => {
      this.io.emit('rfid:reader-status', status);
    });

    // Finder events
    this.finder.on('session-started', (session) => {
      this.io.emit('rfid:finding-started', session);
    });

    this.finder.on('docket-detected', (session) => {
      this.io.emit('rfid:docket-detected', session);
    });

    this.finder.on('docket-found', (session) => {
      this.io.emit('rfid:docket-found', session);
      this.recordFindingSuccess(session);
    });

    this.finder.on('geiger-reading', ({ session, reading }) => {
      this.io.emit('rfid:geiger-reading', { session, reading });
    });

    this.finder.on('navigation-instruction', ({ session, instruction }) => {
      this.io.emit('rfid:navigation', { session, instruction });
    });
  }

  /**
   * Setup socket handlers for client connections
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`RFID client connected: ${socket.id}`);

      // Join tracking room
      socket.on('rfid:join-tracking', (data) => {
        socket.join('rfid:tracking');
        this.sendCurrentState(socket);
      });

      // Start tracking specific tags
      socket.on('rfid:track-tags', async (data) => {
        const session = await this.startTrackingSession(socket.id, data.tags);
        socket.emit('rfid:tracking-started', session);
      });

      // Start finding docket
      socket.on('rfid:find-docket', async (data) => {
        try {
          const session = await this.finder.startFinding(data.docket_code, data.mode);
          socket.emit('rfid:finding-session', session);
        } catch (error: any) {
          socket.emit('rfid:error', { message: error.message });
        }
      });

      // Stop finding
      socket.on('rfid:stop-finding', async (data) => {
        await this.finder.stopFinding(data.session_id);
      });

      // Reader control
      socket.on('rfid:reader-control', async (data) => {
        await this.controlReader(data.reader_id, data.command, data.params);
      });

      // Get statistics
      socket.on('rfid:get-stats', () => {
        socket.emit('rfid:statistics', this.getStatistics());
      });

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        this.stopTrackingSession(socket.id);
        logger.info(`RFID client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Load RFID readers from database
   */
  private async loadReadersFromDatabase(): Promise<void> {
    try {
      const result = await query(`
        SELECT id, name, type, ip_address, port, location_x, location_y, 
               location_z, zone_id, antenna_power, read_range, status
        FROM rfid_readers
        WHERE status = 'online'
      `);

      for (const row of result.rows) {
        const config: RfidReaderConfig = {
          id: row.id.toString(),
          name: row.name,
          type: row.type as 'fixed' | 'handheld' | 'gate',
          protocol: 'mqtt', // Default to MQTT
          host: row.ip_address,
          port: row.port,
          location: {
            zone_id: row.zone_id,
            x: row.location_x,
            y: row.location_y,
            z: row.location_z
          },
          antenna_power: row.antenna_power,
          read_range: row.read_range,
          enabled: true
        };

        await this.hardware.connectReader(config);
      }

      logger.info(`Loaded ${result.rows.length} RFID readers from database`);
    } catch (error) {
      logger.error('Failed to load readers from database:', error);
    }
  }

  /**
   * Update reader measurement for triangulation
   */
  private updateReaderMeasurement(event: RfidReadEvent): void {
    const reader = this.hardware.getReaders().find(r => r.id === event.reader_id);
    if (!reader) return;

    const measurement: ReaderMeasurement = {
      reader_id: event.reader_id,
      reader_position: {
        x: reader.location.x,
        y: reader.location.y,
        z: reader.location.z,
        accuracy: 0.1,
        confidence: 1
      },
      rssi: event.tag.rssi,
      phase: event.tag.phase,
      timestamp: event.tag.timestamp,
      antenna_gain: reader.antenna_power,
      frequency: 915 // Default UHF RFID frequency
    };

    // Store measurement
    if (!this.readerMeasurements.has(event.tag.epc)) {
      this.readerMeasurements.set(event.tag.epc, []);
    }
    
    const measurements = this.readerMeasurements.get(event.tag.epc)!;
    measurements.push(measurement);
    
    // Keep only recent measurements (last 2 seconds)
    const cutoff = Date.now() - 2000;
    this.readerMeasurements.set(
      event.tag.epc,
      measurements.filter(m => m.timestamp > cutoff)
    );
  }

  /**
   * Process queued RFID events
   */
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, Math.min(this.config.batch_size, this.eventQueue.length));
    
    try {
      // Process each event
      for (const event of batch) {
        await this.processRfidEvent(event);
      }

      // Save to database in batch
      await this.saveBatchToDatabase(batch);
    } catch (error) {
      logger.error('Error processing RFID events:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    }
  }

  /**
   * Process individual RFID event
   */
  private async processRfidEvent(event: RfidReadEvent): Promise<void> {
    // Calculate precise location using triangulation
    const measurements = this.readerMeasurements.get(event.tag.epc) || [];
    
    let location: TagLocation | null = null;
    if (measurements.length >= 3) {
      try {
        location = this.triangulation.calculatePosition(event.tag.epc, measurements);
      } catch (error) {
        logger.debug('Triangulation failed, using reader location');
      }
    }

    // Get docket information
    const docketInfo = await this.getDocketByRfid(event.tag.epc);

    // Determine movement status
    const lastData = this.tagLocations.get(event.tag.epc);
    let movement: 'stationary' | 'moving' | 'fast' = 'stationary';
    
    if (lastData && location) {
      const distance = this.calculateDistance(lastData.position, location.position);
      const timeDiff = (Date.now() - lastData.last_seen) / 1000;
      const speed = distance / timeDiff;
      
      if (speed > 2) movement = 'fast';
      else if (speed > 0.1) movement = 'moving';
    }

    // Check for alerts
    const alerts = await this.checkForAlerts(event, docketInfo);

    // Update tracking data
    const trackingData: RealtimeTrackingData = {
      tag_id: event.tag.epc,
      docket_code: docketInfo?.docket_code,
      position: location?.position || {
        x: event.location.zone_id * 10,
        y: 0,
        z: 0,
        accuracy: 10,
        confidence: 0.3
      },
      zone: await this.getZoneName(event.location.zone_id),
      last_seen: Date.now(),
      status: 'active',
      movement,
      alerts
    };

    this.tagLocations.set(event.tag.epc, trackingData);
  }

  /**
   * Save batch of events to database
   */
  private async saveBatchToDatabase(events: RfidReadEvent[]): Promise<void> {
    if (events.length === 0) return;

    await withTransaction(async (client) => {
      // Insert RFID events
      for (const event of events) {
        await client.query(`
          INSERT INTO rfid_events 
          (reader_id, tag_id, signal_strength, event_type, zone_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          parseInt(event.reader_id),
          event.tag.epc,
          event.tag.rssi,
          event.event_type,
          event.location.zone_id,
          JSON.stringify({
            phase: event.tag.phase,
            doppler: event.tag.doppler,
            antenna: event.tag.antenna,
            position: event.location.estimated_position
          })
        ]);

        // Update docket location if applicable
        const docket = await this.getDocketByRfid(event.tag.epc);
        if (docket && event.location.estimated_position) {
          await client.query(`
            UPDATE dockets
            SET current_location = $1,
                current_zone_id = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE rfid_tag = $3
          `, [
            `X:${event.location.estimated_position.x.toFixed(1)} Y:${event.location.estimated_position.y.toFixed(1)}`,
            event.location.zone_id,
            event.tag.epc
          ]);

          // Log movement
          await client.query(`
            INSERT INTO docket_movements
            (docket_id, to_location, to_zone_id, movement_type, movement_reason)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            docket.id,
            `Zone ${event.location.zone_id}`,
            event.location.zone_id,
            'rfid-detected',
            'Automatic RFID tracking'
          ]);
        }
      }
    });
  }

  /**
   * Stream location updates to connected clients
   */
  private streamLocationUpdates(): void {
    const updates = Array.from(this.tagLocations.values())
      .filter(data => Date.now() - data.last_seen < 5000); // Only active tags

    if (updates.length > 0) {
      this.io.to('rfid:tracking').emit('rfid:location-update', updates);
    }

    // Check tracking sessions
    this.trackingSessions.forEach((session, clientId) => {
      if (session.active) {
        const sessionUpdates = updates.filter(u => session.tags.includes(u.tag_id));
        if (sessionUpdates.length > 0) {
          this.io.to(clientId).emit('rfid:tracked-tags-update', sessionUpdates);
        }
      }
    });
  }

  /**
   * Cleanup stale data
   */
  private cleanupStaleData(): void {
    const cutoff = Date.now() - 60000; // 1 minute

    // Remove stale tag locations
    for (const [tagId, data] of this.tagLocations) {
      if (data.last_seen < cutoff) {
        data.status = 'lost';
        this.io.to('rfid:tracking').emit('rfid:tag-lost', { tag_id: tagId });
        this.tagLocations.delete(tagId);
      } else if (data.last_seen < cutoff + 30000) {
        data.status = 'idle';
      }
    }

    // Clean old measurements
    for (const [tagId, measurements] of this.readerMeasurements) {
      const filtered = measurements.filter(m => m.timestamp > cutoff);
      if (filtered.length === 0) {
        this.readerMeasurements.delete(tagId);
      } else {
        this.readerMeasurements.set(tagId, filtered);
      }
    }
  }

  /**
   * Start tracking session for specific tags
   */
  private async startTrackingSession(clientId: string, tags: string[]): Promise<TrackingSession> {
    const session: TrackingSession = {
      id: `track-${Date.now()}`,
      client_id: clientId,
      tags,
      start_time: Date.now(),
      active: true
    };

    this.trackingSessions.set(clientId, session);
    
    // Start intensive scanning for these tags
    for (const tag of tags) {
      await this.intensifyScanningForTag(tag);
    }

    return session;
  }

  /**
   * Stop tracking session
   */
  private stopTrackingSession(clientId: string): void {
    const session = this.trackingSessions.get(clientId);
    if (session) {
      session.active = false;
      this.trackingSessions.delete(clientId);
    }
  }

  /**
   * Intensify scanning for specific tag
   */
  private async intensifyScanningForTag(tagId: string): Promise<void> {
    // In real implementation, configure readers to prioritize this tag
    logger.info(`Intensifying scanning for tag: ${tagId}`);
  }

  /**
   * Control reader operations
   */
  private async controlReader(readerId: string, command: string, params?: any): Promise<void> {
    switch (command) {
      case 'start':
        await this.hardware.startInventory(readerId);
        break;
      case 'stop':
        await this.hardware.stopInventory(readerId);
        break;
      case 'power':
        await this.hardware.setAntennaPower(readerId, params.power);
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Send current state to newly connected client
   */
  private sendCurrentState(socket: Socket): void {
    const state = {
      readers: this.hardware.getReaders().map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.enabled ? 'online' : 'offline',
        location: r.location
      })),
      active_tags: Array.from(this.tagLocations.values()),
      statistics: this.getStatistics()
    };

    socket.emit('rfid:current-state', state);
  }

  /**
   * Get docket information by RFID tag
   */
  private async getDocketByRfid(rfidTag: string): Promise<any> {
    try {
      const result = await query(
        'SELECT * FROM dockets WHERE rfid_tag = $1',
        [rfidTag]
      );
      return result.rows[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Get zone name by ID
   */
  private async getZoneName(zoneId: number): Promise<string> {
    try {
      const result = await query(
        'SELECT zone_name FROM storage_zones WHERE id = $1',
        [zoneId]
      );
      return result.rows[0]?.zone_name || `Zone ${zoneId}`;
    } catch (error) {
      return `Zone ${zoneId}`;
    }
  }

  /**
   * Check for alerts based on event
   */
  private async checkForAlerts(event: RfidReadEvent, docket: any): Promise<string[]> {
    const alerts: string[] = [];

    // Check unauthorized movement
    if (docket && docket.current_zone_id !== event.location.zone_id) {
      alerts.push('Unauthorized zone change detected');
    }

    // Check after-hours movement
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      alerts.push('After-hours movement detected');
    }

    // Check high-value item movement
    if (docket?.is_high_value) {
      alerts.push('High-value item movement');
    }

    return alerts;
  }

  /**
   * Record finding success for analytics
   */
  private async recordFindingSuccess(session: FindingSession): Promise<void> {
    try {
      await query(`
        INSERT INTO audit_logs 
        (table_name, action, record_id, details)
        VALUES ('dockets', 'found', 
          (SELECT id FROM dockets WHERE docket_code = $1),
          $2
        )
      `, [
        session.docket_code,
        JSON.stringify({
          time_elapsed: session.time_elapsed,
          mode: session.mode,
          distance: session.distance
        })
      ]);
    } catch (error) {
      logger.error('Failed to record finding success:', error);
    }
  }

  /**
   * Calculate distance between positions
   */
  private calculateDistance(pos1: Position3D, pos2: Position3D): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2) +
      Math.pow(pos2.z - pos1.z, 2)
    );
  }

  /**
   * Start simulation mode
   */
  private async startSimulation(): Promise<void> {
    logger.info('Starting RFID simulation mode');
    
    // Simulate tag reads
    setInterval(() => {
      const tags = ['RFID-001-234567', 'RFID-002-345678', 'RFID-003-456789'];
      const readers = this.hardware.getReaders();
      
      if (readers.length === 0) return;

      const tag = tags[Math.floor(Math.random() * tags.length)];
      const reader = readers[Math.floor(Math.random() * readers.length)];

      const event: RfidReadEvent = {
        reader_id: reader.id,
        tag: {
          epc: tag,
          tid: tag,
          rssi: -30 - Math.random() * 40,
          phase: Math.random() * 360,
          doppler: (Math.random() - 0.5) * 2,
          antenna: 1,
          timestamp: Date.now()
        },
        location: {
          zone_id: reader.location.zone_id,
          estimated_position: {
            x: reader.location.x + (Math.random() - 0.5) * 10,
            y: reader.location.y + (Math.random() - 0.5) * 10,
            z: reader.location.z,
            accuracy: Math.random() * 2,
            confidence: 0.7 + Math.random() * 0.3
          }
        },
        event_type: Math.random() > 0.9 ? 'moved' : 'detected'
      };

      this.hardware.emit('tag-read', event);
    }, 1000);
  }

  /**
   * Get system statistics
   */
  getStatistics(): any {
    const activeTags = Array.from(this.tagLocations.values());
    const readers = this.hardware.getReaders();

    return {
      readers: {
        total: readers.length,
        online: readers.filter(r => r.enabled).length
      },
      tags: {
        active: activeTags.length,
        moving: activeTags.filter(t => t.movement === 'moving').length,
        alerts: activeTags.filter(t => t.alerts.length > 0).length
      },
      finding: this.finder.getStatistics(),
      sessions: {
        active: this.trackingSessions.size,
        total_tracked_tags: Array.from(this.trackingSessions.values())
          .reduce((sum, s) => sum + s.tags.length, 0)
      },
      events: {
        queue_size: this.eventQueue.length,
        processing_rate: this.config.batch_size / (this.config.update_interval / 1000)
      }
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down RFID tracking service');

    // Clear intervals
    if (this.processInterval) clearInterval(this.processInterval);
    if (this.streamInterval) clearInterval(this.streamInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Disconnect hardware
    await this.hardware.disconnect();

    // Cleanup
    this.finder.destroy();
    this.removeAllListeners();

    logger.info('RFID tracking service shut down');
  }
}