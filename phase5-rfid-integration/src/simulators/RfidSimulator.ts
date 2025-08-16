import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { 
  RfidEvent, 
  RfidReader, 
  SimulatedTag, 
  SimulationConfig,
  ReaderHealthMetrics,
  SystemAlert
} from '../interfaces/RfidTypes';
import { DatabaseService } from '../services/DatabaseService';
import RfidEventProcessor from '../services/RfidEventProcessor';
import { logger } from '../utils/logger';

interface SimulatedReader {
  reader: RfidReader;
  tags: Map<string, SimulatedTag>;
  eventRate: number;
  isRunning: boolean;
  stats: {
    totalEvents: number;
    uniqueTags: number;
    collisions: number;
    errors: number;
  };
}

export class RfidSimulator extends EventEmitter {
  private simulatedReaders: Map<string, SimulatedReader> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;
  private healthInterval: NodeJS.Timeout | null = null;
  private movementInterval: NodeJS.Timeout | null = null;
  private config: SimulationConfig;
  private isRunning: boolean = false;
  private totalEvents: number = 0;
  private startTime: Date | null = null;

  constructor() {
    super();
    this.config = {
      enabled: process.env.SIMULATION_ENABLE === 'true',
      tagCount: parseInt(process.env.SIMULATION_TAG_COUNT || '1000'),
      readerCount: parseInt(process.env.SIMULATION_READERS_COUNT || '6'),
      eventRate: parseInt(process.env.SIMULATION_EVENT_RATE || '50'),
      movementProbability: parseFloat(process.env.SIMULATION_MOVEMENT_PROBABILITY || '0.1'),
      collisionProbability: parseFloat(process.env.SIMULATION_COLLISION_PROBABILITY || '0.05'),
      errorRate: parseFloat(process.env.SIMULATION_ERROR_RATE || '0.01')
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('RFID Simulation is disabled');
      return;
    }

    await this.createSimulatedReaders();
    await this.createSimulatedTags();
    logger.info('RFID Simulator initialized', { config: this.config });
  }

  private async createSimulatedReaders(): Promise<void> {
    const baseIp = process.env.RFID_BASE_IP || '192.168.1.100';
    const basePort = parseInt(process.env.RFID_BASE_PORT || '14150');

    for (let i = 1; i <= this.config.readerCount; i++) {
      const readerId = `SIM-FX9600-${String(i).padStart(3, '0')}`;
      const ipParts = baseIp.split('.');
      ipParts[3] = String(parseInt(ipParts[3]) + i);
      const ipAddress = ipParts.join('.');

      const reader: RfidReader = {
        readerId,
        readerName: `Simulated Reader ${i}`,
        readerType: 'FX9600',
        ipAddress,
        port: basePort + i,
        zone: `Zone-${i}`,
        antennaCount: 4,
        maxPower: 30.0,
        frequencyRegion: 'US',
        status: 'online',
        active: true,
        configuration: {
          powerLevel: 25.0,
          sensitivity: -70,
          tagPopulation: 32,
          sessionFlag: 1,
          antennaConfig: Array.from({ length: 4 }, (_, antenna) => ({
            antennaNumber: antenna + 1,
            enabled: true,
            powerLevel: 25.0,
            polarization: 'linear',
            gain: 6.0
          }))
        },
        healthMetrics: {
          cpuUsage: 15 + Math.random() * 10,
          memoryUsage: 40 + Math.random() * 20,
          temperature: 35 + Math.random() * 15,
          tagReadRate: 0,
          errorCount: 0,
          uptime: 0
        }
      };

      // Insert or update reader in database
      await DatabaseService.query(
        `INSERT INTO rfid_readers (
          reader_id, reader_name, reader_type, ip_address, port, zone,
          antenna_count, max_power, frequency_region, status, active, configuration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
        ON CONFLICT (reader_id) DO UPDATE SET
          status = EXCLUDED.status,
          configuration = EXCLUDED.configuration,
          updated_at = NOW()`,
        [
          reader.readerId, reader.readerName, reader.readerType,
          reader.ipAddress, reader.port, reader.zone,
          reader.antennaCount, reader.maxPower, reader.frequencyRegion,
          reader.status, reader.active, JSON.stringify(reader.configuration)
        ]
      );

      this.simulatedReaders.set(readerId, {
        reader,
        tags: new Map(),
        eventRate: this.config.eventRate / this.config.readerCount,
        isRunning: false,
        stats: {
          totalEvents: 0,
          uniqueTags: 0,
          collisions: 0,
          errors: 0
        }
      });
    }

    logger.info(`Created ${this.config.readerCount} simulated readers`);
  }

  private async createSimulatedTags(): Promise<void> {
    const tagsPerReader = Math.ceil(this.config.tagCount / this.config.readerCount);
    const readers = Array.from(this.simulatedReaders.keys());

    for (let i = 1; i <= this.config.tagCount; i++) {
      const tagId = `3000${String(i).padStart(8, '0')}`;
      const epcCode = `E2004001${String(i).padStart(8, '0')}`;
      const assignedReader = readers[i % readers.length];

      const tag: SimulatedTag = {
        tagId,
        epcCode,
        objectId: i,
        currentLocation: assignedReader,
        movementPattern: this.randomChoice(['static', 'random', 'patrol']),
        movementSpeed: 0.1 + Math.random() * 0.5,
        signalStrengthRange: [-45, -25],
        batteryLevel: 80 + Math.random() * 20,
        active: true
      };

      // Create corresponding object in database
      await DatabaseService.query(
        `INSERT INTO objects (
          object_code, name, object_type, rfid_tag_id, epc_code, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (rfid_tag_id) DO NOTHING`,
        [
          `OBJ-${String(i).padStart(6, '0')}`,
          `Simulated Object ${i}`,
          'docket',
          tagId,
          epcCode,
          'active'
        ]
      );

      const simulatedReader = this.simulatedReaders.get(assignedReader);
      if (simulatedReader) {
        simulatedReader.tags.set(tagId, tag);
      }
    }

    logger.info(`Created ${this.config.tagCount} simulated tags`);
  }

  async startSimulation(): Promise<void> {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.totalEvents = 0;

    // Start event generation
    this.simulationInterval = setInterval(() => {
      this.generateEvents();
    }, 1000 / this.config.eventRate);

    // Start health monitoring simulation
    this.healthInterval = setInterval(() => {
      this.updateReaderHealth();
    }, 30000);

    // Start movement simulation
    this.movementInterval = setInterval(() => {
      this.simulateMovement();
    }, 5000);

    // Schedule random events
    this.scheduleRandomEvents();

    logger.info('RFID Simulation started', {
      readers: this.simulatedReaders.size,
      tags: this.config.tagCount,
      eventRate: this.config.eventRate
    });

    this.emit('simulation_started', {
      readers: this.simulatedReaders.size,
      tags: this.config.tagCount
    });
  }

  async stopSimulation(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }

    if (this.movementInterval) {
      clearInterval(this.movementInterval);
      this.movementInterval = null;
    }

    const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    const eventsPerSecond = duration > 0 ? (this.totalEvents / (duration / 1000)).toFixed(2) : '0';

    logger.info('RFID Simulation stopped', {
      duration: `${Math.round(duration / 1000)}s`,
      totalEvents: this.totalEvents,
      eventsPerSecond
    });

    this.emit('simulation_stopped', {
      duration,
      totalEvents: this.totalEvents,
      eventsPerSecond: parseFloat(eventsPerSecond)
    });
  }

  private generateEvents(): void {
    for (const [readerId, simulatedReader] of this.simulatedReaders) {
      if (!simulatedReader.isRunning && Math.random() > 0.1) {
        simulatedReader.isRunning = true;
      }

      if (simulatedReader.isRunning) {
        this.generateReaderEvents(readerId, simulatedReader);
      }
    }
  }

  private async generateReaderEvents(readerId: string, simulatedReader: SimulatedReader): Promise<void> {
    const eventsToGenerate = Math.max(1, Math.floor(simulatedReader.eventRate + Math.random() * 3));
    
    for (let i = 0; i < eventsToGenerate; i++) {
      if (Math.random() < this.config.errorRate) {
        await this.generateErrorEvent(readerId);
        continue;
      }

      if (Math.random() < this.config.collisionProbability) {
        await this.generateCollisionEvent(readerId, simulatedReader);
        continue;
      }

      await this.generateNormalEvent(readerId, simulatedReader);
    }
  }

  private async generateNormalEvent(readerId: string, simulatedReader: SimulatedReader): Promise<void> {
    const tags = Array.from(simulatedReader.tags.values()).filter(tag => tag.active);
    if (tags.length === 0) return;

    const tag = this.randomChoice(tags);
    const antenna = Math.floor(Math.random() * simulatedReader.reader.antennaCount) + 1;
    const [minStrength, maxStrength] = tag.signalStrengthRange!;
    const signalStrength = Math.floor(minStrength + Math.random() * (maxStrength - minStrength));

    const event: RfidEvent = {
      tagId: tag.tagId,
      epcCode: tag.epcCode,
      readerId,
      antennaNumber: antenna,
      signalStrength,
      phase: Math.random() * 360,
      frequency: 902750 + Math.floor(Math.random() * 50) * 500, // US frequency range
      eventType: 'read',
      timestamp: new Date(),
      metadata: {
        batteryLevel: tag.batteryLevel,
        movementPattern: tag.movementPattern,
        simulated: true
      }
    };

    await RfidEventProcessor.processEvent(event);
    
    simulatedReader.stats.totalEvents++;
    this.totalEvents++;
    
    this.emit('tag_read', { readerId, event, tag });
  }

  private async generateCollisionEvent(readerId: string, simulatedReader: SimulatedReader): Promise<void> {
    const tags = Array.from(simulatedReader.tags.values()).filter(tag => tag.active);
    const collisionSize = 2 + Math.floor(Math.random() * 4); // 2-5 tags
    const collidingTags = this.shuffleArray(tags).slice(0, Math.min(collisionSize, tags.length));

    if (collidingTags.length < 2) return;

    const antenna = Math.floor(Math.random() * simulatedReader.reader.antennaCount) + 1;
    const baseTime = new Date();

    for (let i = 0; i < collidingTags.length; i++) {
      const tag = collidingTags[i];
      const timestamp = new Date(baseTime.getTime() + i * 10); // 10ms apart

      const event: RfidEvent = {
        tagId: tag.tagId,
        epcCode: tag.epcCode,
        readerId,
        antennaNumber: antenna,
        signalStrength: -35 - Math.floor(Math.random() * 15), // Weaker signal due to collision
        phase: Math.random() * 360,
        frequency: 902750 + Math.floor(Math.random() * 50) * 500,
        eventType: 'read',
        timestamp,
        metadata: {
          collision: true,
          collisionSize: collidingTags.length,
          collisionIndex: i,
          simulated: true
        }
      };

      await RfidEventProcessor.processEvent(event);
    }

    simulatedReader.stats.collisions++;
    simulatedReader.stats.totalEvents += collidingTags.length;
    this.totalEvents += collidingTags.length;

    this.emit('collision_simulated', {
      readerId,
      antenna,
      tagCount: collidingTags.length,
      tags: collidingTags.map(t => t.tagId)
    });
  }

  private async generateErrorEvent(readerId: string): Promise<void> {
    const errorTypes = ['read_error', 'antenna_disconnect', 'power_failure', 'network_timeout'];
    const errorType = this.randomChoice(errorTypes);

    const alert: SystemAlert = {
      alertType: 'reader_error',
      severity: 'medium',
      title: `Simulated Reader Error`,
      message: `Simulated ${errorType} on reader ${readerId}`,
      source: 'reader',
      sourceId: readerId,
      readerId,
      acknowledged: false,
      resolved: false,
      metadata: {
        errorType,
        simulated: true
      }
    };

    await DatabaseService.query(
      `INSERT INTO system_alerts (
        alert_type, severity, title, message, source, source_id, reader_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        alert.alertType, alert.severity, alert.title, alert.message,
        alert.source, alert.sourceId, alert.readerId, JSON.stringify(alert.metadata)
      ]
    );

    const simulatedReader = this.simulatedReaders.get(readerId);
    if (simulatedReader) {
      simulatedReader.stats.errors++;
    }

    this.emit('error_simulated', { readerId, errorType, alert });
  }

  private simulateMovement(): void {
    for (const [readerId, simulatedReader] of this.simulatedReaders) {
      const tags = Array.from(simulatedReader.tags.values());
      
      for (const tag of tags) {
        if (tag.movementPattern === 'static') continue;
        if (Math.random() > this.config.movementProbability) continue;

        this.moveTag(tag, readerId);
      }
    }
  }

  private moveTag(tag: SimulatedTag, currentReaderId: string): void {
    const availableReaders = Array.from(this.simulatedReaders.keys());
    const newReaderId = this.randomChoice(availableReaders);
    
    if (newReaderId === currentReaderId) return;

    // Remove from current reader
    const currentReader = this.simulatedReaders.get(currentReaderId);
    if (currentReader) {
      currentReader.tags.delete(tag.tagId);
    }

    // Add to new reader
    const newReader = this.simulatedReaders.get(newReaderId);
    if (newReader) {
      tag.currentLocation = newReaderId;
      newReader.tags.set(tag.tagId, tag);
    }

    this.emit('tag_moved', {
      tagId: tag.tagId,
      fromReader: currentReaderId,
      toReader: newReaderId,
      movementType: tag.movementPattern
    });
  }

  private updateReaderHealth(): void {
    for (const [readerId, simulatedReader] of this.simulatedReaders) {
      const health: ReaderHealthMetrics = {
        cpuUsage: 10 + Math.random() * 20,
        memoryUsage: 30 + Math.random() * 30,
        temperature: 30 + Math.random() * 20,
        tagReadRate: simulatedReader.stats.totalEvents / 30, // events per second over last 30s
        errorCount: simulatedReader.stats.errors,
        uptime: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
        networkLatency: 5 + Math.random() * 15,
        powerConsumption: 25 + Math.random() * 10,
        lastUpdate: new Date()
      };

      DatabaseService.query(
        'SELECT update_reader_health($1, $2, $3, $4::jsonb)',
        [readerId, 'online', health.networkLatency, JSON.stringify(health)]
      ).catch(error => {
        logger.error(`Failed to update health for ${readerId}:`, error);
      });

      simulatedReader.reader.healthMetrics = health;
      simulatedReader.stats.totalEvents = 0; // Reset for next interval
    }
  }

  private scheduleRandomEvents(): void {
    // Schedule random reader disconnections
    cron.schedule('*/5 * * * *', async () => {
      if (!this.isRunning) return;
      
      const readers = Array.from(this.simulatedReaders.keys());
      const affectedReader = this.randomChoice(readers);
      
      if (Math.random() < 0.1) { // 10% chance every 5 minutes
        await this.simulateReaderDisconnect(affectedReader);
        
        setTimeout(async () => {
          await this.simulateReaderReconnect(affectedReader);
        }, 30000 + Math.random() * 60000); // Reconnect after 30-90 seconds
      }
    });

    // Schedule batch processing events
    cron.schedule('*/2 * * * *', () => {
      if (!this.isRunning) return;
      RfidEventProcessor.forceProcessBatch();
    });
  }

  private async simulateReaderDisconnect(readerId: string): Promise<void> {
    await DatabaseService.query(
      'UPDATE rfid_readers SET status = $1 WHERE reader_id = $2',
      ['offline', readerId]
    );

    const simulatedReader = this.simulatedReaders.get(readerId);
    if (simulatedReader) {
      simulatedReader.isRunning = false;
      simulatedReader.reader.status = 'offline';
    }

    this.emit('reader_disconnected', { readerId, simulated: true });
    logger.info(`Simulated disconnection for reader ${readerId}`);
  }

  private async simulateReaderReconnect(readerId: string): Promise<void> {
    await DatabaseService.query(
      'UPDATE rfid_readers SET status = $1, last_ping = NOW() WHERE reader_id = $2',
      ['online', readerId]
    );

    const simulatedReader = this.simulatedReaders.get(readerId);
    if (simulatedReader) {
      simulatedReader.isRunning = true;
      simulatedReader.reader.status = 'online';
    }

    this.emit('reader_reconnected', { readerId, simulated: true });
    logger.info(`Simulated reconnection for reader ${readerId}`);
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getSimulationStats() {
    const readerStats = Array.from(this.simulatedReaders.entries()).map(([readerId, sim]) => ({
      readerId,
      status: sim.reader.status,
      eventRate: sim.eventRate,
      isRunning: sim.isRunning,
      stats: sim.stats,
      tagCount: sim.tags.size,
      healthMetrics: sim.reader.healthMetrics
    }));

    return {
      isRunning: this.isRunning,
      config: this.config,
      totalEvents: this.totalEvents,
      startTime: this.startTime,
      duration: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      readers: readerStats,
      totalReaders: this.simulatedReaders.size,
      totalTags: this.config.tagCount
    };
  }

  async adjustSimulationParameters(newConfig: Partial<SimulationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Apply rate changes immediately
    for (const simulatedReader of this.simulatedReaders.values()) {
      simulatedReader.eventRate = this.config.eventRate / this.config.readerCount;
    }

    logger.info('Simulation parameters updated', { newConfig });
    this.emit('config_updated', this.config);
  }
}

export default new RfidSimulator();