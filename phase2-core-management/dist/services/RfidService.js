"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RfidService = void 0;
const uuid_1 = require("uuid");
const DatabaseService_1 = require("./DatabaseService");
const server_1 = require("../server");
class RfidService {
    constructor(io) {
        this.eventQueue = [];
        this.processingInterval = null;
        this.io = io;
        this.dbService = DatabaseService_1.DatabaseService.getInstance();
        this.simulationMode = process.env.RFID_SIMULATION_MODE === 'true';
    }
    static getInstance(io) {
        if (!RfidService.instance && io) {
            RfidService.instance = new RfidService(io);
        }
        return RfidService.instance;
    }
    async initialize() {
        const batchSize = parseInt(process.env.RFID_EVENT_BATCH_SIZE || '100');
        const interval = parseInt(process.env.RFID_EVENT_INTERVAL || '5000');
        // Start event processing
        this.processingInterval = setInterval(() => {
            this.processEventBatch(batchSize);
        }, interval);
        if (this.simulationMode) {
            this.startSimulation();
            server_1.logger.info('RFID simulation mode started');
        }
    }
    async addEvent(event) {
        this.eventQueue.push(event);
        // Emit real-time event
        this.io.to(`rfid:${event.location_id}`).emit('rfid:event', event);
        this.io.to('rfid:all').emit('rfid:event', event);
    }
    async processEventBatch(batchSize) {
        if (this.eventQueue.length === 0)
            return;
        const batch = this.eventQueue.splice(0, Math.min(batchSize, this.eventQueue.length));
        try {
            await this.dbService.transaction(async (client) => {
                // Insert RFID events
                const eventValues = batch.map(e => `('${e.tag_id}', '${e.reader_id}', ${e.signal_strength}, '${e.event_type}', ${e.location_id}, '${e.timestamp.toISOString()}')`).join(',');
                await client.query(`
          INSERT INTO rfid_events (tag_id, reader_id, signal_strength, event_type, location_id, timestamp)
          VALUES ${eventValues}
        `);
                // Update object locations based on events
                for (const event of batch) {
                    if (event.event_type === 'detected' || event.event_type === 'moved') {
                        await client.query(`
              UPDATE objects 
              SET current_location_id = $1, updated_at = NOW()
              WHERE rfid_tag_id = $2
            `, [event.location_id, event.tag_id]);
                        // Add audit log
                        await client.query(`
              INSERT INTO audit_logs (object_id, action, new_location_id, reader_id, timestamp)
              SELECT id, 'location_update', $1, $2, $3
              FROM objects WHERE rfid_tag_id = $4
            `, [event.location_id, event.reader_id, event.timestamp, event.tag_id]);
                    }
                }
            });
            server_1.logger.debug(`Processed ${batch.length} RFID events`);
        }
        catch (error) {
            server_1.logger.error('Failed to process RFID event batch:', error);
            // Re-add failed events to queue
            this.eventQueue.unshift(...batch);
        }
    }
    startSimulation() {
        // Simulate RFID events for testing
        setInterval(async () => {
            const locations = [1, 2, 3, 4, 5];
            const readers = ['READER-001', 'READER-002', 'READER-003'];
            const eventTypes = ['detected', 'moved', 'lost'];
            const event = {
                tag_id: `TAG-${(0, uuid_1.v4)().substring(0, 8)}`,
                reader_id: readers[Math.floor(Math.random() * readers.length)],
                signal_strength: Math.floor(Math.random() * 100),
                event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
                location_id: locations[Math.floor(Math.random() * locations.length)],
                timestamp: new Date()
            };
            await this.addEvent(event);
        }, 10000); // Generate event every 10 seconds
    }
    async getReaderStatus() {
        const result = await this.dbService.query(`
      SELECT r.*, 
             COUNT(e.id) as recent_events,
             MAX(e.timestamp) as last_event
      FROM rfid_readers r
      LEFT JOIN rfid_events e ON r.reader_id = e.reader_id 
        AND e.timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY r.id
      ORDER BY r.reader_id
    `);
        return result.rows;
    }
    async registerReader(readerData) {
        const result = await this.dbService.query(`
      INSERT INTO rfid_readers (reader_id, reader_type, location_id, ip_address, status, configuration)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (reader_id) DO UPDATE
      SET location_id = $3, ip_address = $4, status = $5, configuration = $6, last_ping = NOW()
      RETURNING *
    `, [
            readerData.reader_id,
            readerData.reader_type || 'fixed',
            readerData.location_id,
            readerData.ip_address,
            'active',
            JSON.stringify(readerData.configuration || {})
        ]);
        return result.rows[0];
    }
    async simulateEvent(data) {
        const event = {
            tag_id: data.tag_id,
            reader_id: data.reader_id,
            signal_strength: data.signal_strength || 80,
            event_type: data.event_type || 'detected',
            location_id: data.location_id,
            timestamp: new Date()
        };
        await this.addEvent(event);
    }
    async shutdown() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        // Process remaining events
        if (this.eventQueue.length > 0) {
            await this.processEventBatch(this.eventQueue.length);
        }
    }
}
exports.RfidService = RfidService;
//# sourceMappingURL=RfidService.js.map