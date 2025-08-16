import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { 
  RfidEvent, 
  RfidEventBatch, 
  ObjectMovement, 
  SystemAlert,
  TagCollision,
  RfidEventType,
  RfidEventPayload 
} from '../interfaces/RfidTypes';

interface ProcessingQueue {
  events: RfidEvent[];
  batchId: string;
  timestamp: Date;
}

export class RfidEventProcessor extends EventEmitter {
  private batchSize: number;
  private processingInterval: number;
  private eventQueue: RfidEvent[] = [];
  private processingQueue: ProcessingQueue[] = [];
  private isProcessing: boolean = false;
  private stats = {
    totalEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    batchesProcessed: 0,
    averageProcessingTime: 0
  };

  constructor() {
    super();
    this.batchSize = parseInt(process.env.TAG_PROCESSING_BATCH_SIZE || '100');
    this.processingInterval = parseInt(process.env.EVENT_PROCESSING_INTERVAL || '100');
    
    this.startProcessing();
    logger.info('RFID Event Processor initialized', {
      batchSize: this.batchSize,
      processingInterval: this.processingInterval
    });
  }

  async processEvent(event: RfidEvent): Promise<void> {
    this.eventQueue.push({
      ...event,
      eventUuid: event.eventUuid || uuidv4(),
      timestamp: event.timestamp || new Date(),
      processed: false
    });

    this.stats.totalEvents++;
    this.emit('event_queued', { event, queueSize: this.eventQueue.length });

    if (this.eventQueue.length >= this.batchSize) {
      await this.createBatch();
    }
  }

  private async createBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batchId = uuidv4();
    const events = this.eventQueue.splice(0, this.batchSize);
    
    const batch: ProcessingQueue = {
      events,
      batchId,
      timestamp: new Date()
    };

    this.processingQueue.push(batch);
    logger.debug(`Created batch ${batchId} with ${events.length} events`);
  }

  private startProcessing(): void {
    setInterval(async () => {
      if (this.isProcessing || this.processingQueue.length === 0) return;
      
      await this.processBatch();
    }, this.processingInterval);

    setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.createBatch();
      }
    }, 1000);
  }

  private async processBatch(): Promise<void> {
    if (this.processingQueue.length === 0) return;

    this.isProcessing = true;
    const startTime = Date.now();
    const batch = this.processingQueue.shift()!;

    try {
      const batchRecord = await this.createBatchRecord(batch);
      const results = await this.processEventBatch(batch.events);
      
      await this.updateBatchRecord(batchRecord.id!, results);
      await this.detectMovements(batch.events);
      await this.detectCollisions(batch.events);

      this.stats.processedEvents += results.successful;
      this.stats.failedEvents += results.failed;
      this.stats.batchesProcessed++;

      const processingTime = Date.now() - startTime;
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.batchesProcessed - 1) + processingTime) / 
        this.stats.batchesProcessed;

      this.emit('batch_processed', {
        batchId: batch.batchId,
        eventCount: batch.events.length,
        successful: results.successful,
        failed: results.failed,
        processingTime
      });

      logger.info(`Processed batch ${batch.batchId}`, {
        eventCount: batch.events.length,
        successful: results.successful,
        failed: results.failed,
        processingTime
      });

    } catch (error) {
      logger.error(`Batch processing failed for ${batch.batchId}:`, error);
      this.stats.failedEvents += batch.events.length;
      
      await this.createSystemAlert({
        alertType: 'reader_error',
        severity: 'high',
        title: 'Batch Processing Failed',
        message: `Failed to process batch ${batch.batchId}: ${error}`,
        source: 'system',
        sourceId: batch.batchId
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async createBatchRecord(batch: ProcessingQueue): Promise<RfidEventBatch> {
    const result = await DatabaseService.query(
      `INSERT INTO rfid_event_batches (batch_uuid, event_count, status, started_at)
       VALUES ($1, $2, 'processing', $3)
       RETURNING *`,
      [batch.batchId, batch.events.length, batch.timestamp]
    );
    
    return result.rows[0];
  }

  private async updateBatchRecord(
    batchId: number, 
    results: { successful: number; failed: number }
  ): Promise<void> {
    await DatabaseService.query(
      `UPDATE rfid_event_batches 
       SET processed_count = $1, failed_count = $2, status = 'completed', 
           completed_at = NOW(), processing_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
       WHERE id = $3`,
      [results.successful, results.failed, batchId]
    );
  }

  private async processEventBatch(events: RfidEvent[]): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    const batchId = uuidv4();
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const event of events) {
      try {
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 
            $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, 
            $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}::jsonb, $${paramIndex + 11}::uuid)`
        );

        values.push(
          event.tagId,
          event.epcCode || null,
          event.readerId,
          event.antennaNumber || null,
          event.signalStrength,
          event.phase || null,
          event.frequency || null,
          event.eventType,
          event.locationId || null,
          event.objectId || null,
          JSON.stringify(event.metadata || {}),
          batchId
        );

        paramIndex += 12;
        successful++;

        await this.updateObjectLocation(event);

      } catch (error) {
        logger.error(`Failed to process event for tag ${event.tagId}:`, error);
        failed++;
      }
    }

    if (values.length > 0) {
      const query = `
        INSERT INTO rfid_events (
          tag_id, epc_code, reader_id, antenna_number, signal_strength,
          phase, frequency, event_type, location_id, object_id, metadata, batch_id
        ) VALUES ${placeholders.join(', ')}
      `;

      await DatabaseService.query(query, values);
    }

    return { successful, failed };
  }

  private async updateObjectLocation(event: RfidEvent): Promise<void> {
    const result = await DatabaseService.query(
      'SELECT process_rfid_event($1, $2, $3, $4, $5)',
      [
        event.tagId,
        event.readerId,
        event.antennaNumber || 1,
        event.signalStrength,
        event.timestamp
      ]
    );

    const movementDetected = result.rows[0]?.process_rfid_event;
    
    if (movementDetected) {
      this.emit('object_moved', {
        tagId: event.tagId,
        readerId: event.readerId,
        timestamp: event.timestamp
      });
    }
  }

  private async detectMovements(events: RfidEvent[]): Promise<void> {
    const tagsByReader = new Map<string, Map<string, RfidEvent[]>>();

    for (const event of events) {
      if (!tagsByReader.has(event.readerId)) {
        tagsByReader.set(event.readerId, new Map());
      }
      
      const readerTags = tagsByReader.get(event.readerId)!;
      if (!readerTags.has(event.tagId)) {
        readerTags.set(event.tagId, []);
      }
      
      readerTags.get(event.tagId)!.push(event);
    }

    for (const [readerId, tags] of tagsByReader) {
      for (const [tagId, tagEvents] of tags) {
        if (tagEvents.length > 1) {
          await this.analyzeTagMovement(tagId, readerId, tagEvents);
        }
      }
    }
  }

  private async analyzeTagMovement(
    tagId: string, 
    readerId: string, 
    events: RfidEvent[]
  ): Promise<void> {
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];

    const signalStrengthTrend = this.calculateSignalTrend(events);
    const durationSeconds = (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000;

    if (signalStrengthTrend === 'increasing') {
      this.emit('object_entering', {
        tagId,
        readerId,
        signalStrength: lastEvent.signalStrength,
        duration: durationSeconds
      });
    } else if (signalStrengthTrend === 'decreasing') {
      this.emit('object_leaving', {
        tagId,
        readerId,
        signalStrength: lastEvent.signalStrength,
        duration: durationSeconds
      });
    }
  }

  private calculateSignalTrend(events: RfidEvent[]): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 3) return 'stable';

    const firstHalf = events.slice(0, Math.floor(events.length / 2));
    const secondHalf = events.slice(Math.floor(events.length / 2));

    const firstAvg = firstHalf.reduce((sum, e) => sum + e.signalStrength, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.signalStrength, 0) / secondHalf.length;

    const threshold = 3; // dBm
    
    if (secondAvg - firstAvg > threshold) return 'increasing';
    if (firstAvg - secondAvg > threshold) return 'decreasing';
    return 'stable';
  }

  private async detectCollisions(events: RfidEvent[]): Promise<void> {
    const readerEvents = new Map<string, RfidEvent[]>();

    for (const event of events) {
      if (!readerEvents.has(event.readerId)) {
        readerEvents.set(event.readerId, []);
      }
      readerEvents.get(event.readerId)!.push(event);
    }

    for (const [readerId, readerEventList] of readerEvents) {
      await this.analyzeCollisions(readerId, readerEventList);
    }
  }

  private async analyzeCollisions(readerId: string, events: RfidEvent[]): Promise<void> {
    const timeWindow = 100; // milliseconds
    const collisionThreshold = 3; // minimum tags for collision

    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const collisionGroups: RfidEvent[][] = [];
    let currentGroup: RfidEvent[] = [];

    for (const event of sortedEvents) {
      if (currentGroup.length === 0) {
        currentGroup.push(event);
        continue;
      }

      const timeDiff = event.timestamp.getTime() - currentGroup[0].timestamp.getTime();
      
      if (timeDiff <= timeWindow) {
        currentGroup.push(event);
      } else {
        if (currentGroup.length >= collisionThreshold) {
          collisionGroups.push([...currentGroup]);
        }
        currentGroup = [event];
      }
    }

    if (currentGroup.length >= collisionThreshold) {
      collisionGroups.push(currentGroup);
    }

    for (const group of collisionGroups) {
      await this.recordCollision(readerId, group);
    }
  }

  private async recordCollision(readerId: string, events: RfidEvent[]): Promise<void> {
    const uniqueTags = [...new Set(events.map(e => e.tagId))];
    const signalStrengths = events.map(e => e.signalStrength);
    const antennaNumber = events[0].antennaNumber;
    const duration = events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime();

    const collision: TagCollision = {
      collisionUuid: uuidv4(),
      readerId,
      antennaNumber,
      tagCount: uniqueTags.length,
      collisionTime: events[0].timestamp,
      durationMs: duration,
      resolved: false,
      tagsInvolved: uniqueTags,
      signalStrengths,
      metadata: {
        totalEvents: events.length,
        averageSignalStrength: signalStrengths.reduce((a, b) => a + b, 0) / signalStrengths.length
      }
    };

    await DatabaseService.query(
      `INSERT INTO tag_collisions (
        collision_uuid, reader_id, antenna_number, tag_count, collision_time,
        duration_ms, tags_involved, signal_strengths, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        collision.collisionUuid,
        collision.readerId,
        collision.antennaNumber,
        collision.tagCount,
        collision.collisionTime,
        collision.durationMs,
        collision.tagsInvolved,
        collision.signalStrengths,
        JSON.stringify(collision.metadata)
      ]
    );

    await this.createSystemAlert({
      alertType: 'reader_error',
      severity: 'medium',
      title: 'Tag Collision Detected',
      message: `Collision detected on reader ${readerId} with ${uniqueTags.length} tags`,
      source: 'reader',
      sourceId: readerId,
      readerId,
      metadata: {
        collisionId: collision.collisionUuid,
        tagCount: uniqueTags.length,
        duration: duration
      }
    });

    this.emit('collision_detected', collision);
    logger.warn(`Tag collision detected on reader ${readerId}`, {
      tagCount: uniqueTags.length,
      duration,
      tags: uniqueTags
    });
  }

  private async createSystemAlert(alert: Partial<SystemAlert>): Promise<void> {
    await DatabaseService.query(
      `INSERT INTO system_alerts (
        alert_type, severity, title, message, source, source_id,
        reader_id, object_id, location_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        alert.alertType,
        alert.severity || 'medium',
        alert.title,
        alert.message,
        alert.source,
        alert.sourceId || null,
        alert.readerId || null,
        alert.objectId || null,
        alert.locationId || null,
        JSON.stringify(alert.metadata || {})
      ]
    );

    this.emit('alert_created', alert);
  }

  getStats() {
    return {
      ...this.stats,
      queueSize: this.eventQueue.length,
      processingQueueSize: this.processingQueue.length,
      isProcessing: this.isProcessing
    };
  }

  async forceProcessBatch(): Promise<void> {
    if (this.eventQueue.length > 0) {
      await this.createBatch();
    }
    if (this.processingQueue.length > 0) {
      await this.processBatch();
    }
  }
}

export default new RfidEventProcessor();