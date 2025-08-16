import { Request, Response, NextFunction } from 'express';
import { RfidReaderModel, IRfidReader } from '../models/RfidReader';
import { RfidEventModel, IRfidEvent } from '../models/RfidEvent';
import { ObjectModel } from '../models/Object';
import { LocationModel } from '../models/Location';
import { AuditLogModel } from '../models/AuditLog';
import { logger } from '../utils/logger';

export class RfidController {
  static async createReader(req: Request, res: Response, next: NextFunction) {
    try {
      const readerData: IRfidReader = req.body;

      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'supervisor') {
        return res.status(403).json({ 
          error: 'Insufficient permissions to create RFID readers' 
        });
      }

      const existingReader = await RfidReaderModel.findByReaderId(readerData.reader_id);
      if (existingReader) {
        return res.status(400).json({ 
          error: 'Reader ID already exists' 
        });
      }

      const newReader = await RfidReaderModel.create(readerData);

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'RFID_READER_CREATED',
        reader_id: newReader.reader_id,
        notes: `Created RFID reader: ${newReader.reader_id}`,
        session_id: (req as any).sessionId
      });

      logger.info(`RFID reader created: ${newReader.reader_id} by user ${(req as any).user?.id}`);

      res.status(201).json({
        success: true,
        data: newReader
      });
    } catch (error) {
      logger.error('Error creating RFID reader:', error);
      next(error);
    }
  }

  static async getReader(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reader = await RfidReaderModel.findById(parseInt(id));

      if (!reader) {
        return res.status(404).json({ 
          error: 'RFID reader not found' 
        });
      }

      const recentEvents = await RfidEventModel.findUnprocessed();
      const readerEvents = recentEvents.filter(event => event.reader_id === reader.reader_id);

      res.json({
        success: true,
        data: {
          ...reader,
          recent_events_count: readerEvents.length,
          recent_events: readerEvents.slice(0, 20)
        }
      });
    } catch (error) {
      logger.error('Error fetching RFID reader:', error);
      next(error);
    }
  }

  static async listReaders(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        reader_type,
        status,
        location_id
      } = req.query;

      const filters = {
        reader_type: reader_type as string,
        status: status as string,
        location_id: location_id ? parseInt(location_id as string) : undefined
      };

      const readers = await RfidReaderModel.findAll(filters);

      res.json({
        success: true,
        data: readers
      });
    } catch (error) {
      logger.error('Error listing RFID readers:', error);
      next(error);
    }
  }

  static async updateReader(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'supervisor') {
        return res.status(403).json({ 
          error: 'Insufficient permissions to update RFID readers' 
        });
      }

      const reader = await RfidReaderModel.findById(parseInt(id));
      if (!reader) {
        return res.status(404).json({ 
          error: 'RFID reader not found' 
        });
      }

      const updatedReader = await RfidReaderModel.update(parseInt(id), updates);

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'RFID_READER_UPDATED',
        reader_id: reader.reader_id,
        notes: `Updated RFID reader: ${reader.reader_id}`,
        session_id: (req as any).sessionId
      });

      logger.info(`RFID reader updated: ${reader.reader_id} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: updatedReader
      });
    } catch (error) {
      logger.error('Error updating RFID reader:', error);
      next(error);
    }
  }

  static async pingReader(req: Request, res: Response, next: NextFunction) {
    try {
      const { reader_id } = req.params;

      const updatedReader = await RfidReaderModel.updatePing(reader_id);

      if (!updatedReader) {
        return res.status(404).json({ 
          error: 'RFID reader not found' 
        });
      }

      res.json({
        success: true,
        data: updatedReader
      });
    } catch (error) {
      logger.error('Error pinging RFID reader:', error);
      next(error);
    }
  }

  static async processRfidEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const eventData: IRfidEvent = req.body;

      const reader = await RfidReaderModel.findByReaderId(eventData.reader_id);
      if (!reader) {
        return res.status(404).json({ 
          error: 'Unknown RFID reader' 
        });
      }

      eventData.location_id = reader.location_id;

      const newEvent = await RfidEventModel.create(eventData);

      await RfidReaderModel.updatePing(eventData.reader_id);

      const object = await ObjectModel.findByRfidTag(eventData.tag_id);
      if (object && eventData.location_id) {
        if (object.current_location_id !== eventData.location_id) {
          const oldLocationId = object.current_location_id;
          await ObjectModel.moveToLocation(object.id!, eventData.location_id);

          await ObjectModel.addToChainOfCustody(object.id!, {
            personnel_id: 0,
            action: 'AUTO_MOVED',
            location_id: eventData.location_id,
            notes: `Automatically moved by RFID detection`
          });

          await AuditLogModel.create({
            object_id: object.id,
            action: 'AUTO_MOVED',
            old_location_id: oldLocationId || undefined,
            new_location_id: eventData.location_id,
            reader_id: eventData.reader_id,
            notes: `Object automatically moved by RFID detection`,
            session_id: 'rfid-system'
          });

          logger.info(`Object ${object.object_code} automatically moved to location ${eventData.location_id} by RFID reader ${eventData.reader_id}`);
        }
      }

      await RfidEventModel.markAsProcessed([newEvent.id!]);

      res.json({
        success: true,
        data: newEvent
      });
    } catch (error) {
      logger.error('Error processing RFID event:', error);
      next(error);
    }
  }

  static async processBatchRfidEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ 
          error: 'Events array is required' 
        });
      }

      const processedEvents = [];
      const objectUpdates = new Map();

      for (const eventData of events) {
        const reader = await RfidReaderModel.findByReaderId(eventData.reader_id);
        if (!reader) continue;

        eventData.location_id = reader.location_id;

        const object = await ObjectModel.findByRfidTag(eventData.tag_id);
        if (object && eventData.location_id && object.current_location_id !== eventData.location_id) {
          objectUpdates.set(object.id, {
            object,
            oldLocationId: object.current_location_id,
            newLocationId: eventData.location_id,
            readerId: eventData.reader_id
          });
        }

        processedEvents.push(eventData);
      }

      const newEvents = await RfidEventModel.createBatch(processedEvents);

      for (const [objectId, updateData] of objectUpdates) {
        await ObjectModel.moveToLocation(objectId, updateData.newLocationId);

        await ObjectModel.addToChainOfCustody(objectId, {
          personnel_id: 0,
          action: 'AUTO_MOVED',
          location_id: updateData.newLocationId,
          notes: `Automatically moved by RFID detection`
        });

        await AuditLogModel.create({
          object_id: objectId,
          action: 'AUTO_MOVED',
          old_location_id: updateData.oldLocationId || undefined,
          new_location_id: updateData.newLocationId,
          reader_id: updateData.readerId,
          notes: `Object automatically moved by RFID detection`,
          session_id: 'rfid-system'
        });

        logger.info(`Object ${updateData.object.object_code} automatically moved to location ${updateData.newLocationId} by RFID reader ${updateData.readerId}`);
      }

      await RfidEventModel.markAsProcessed(newEvents.map(e => e.id!));

      res.json({
        success: true,
        data: {
          processed_events: newEvents.length,
          object_updates: objectUpdates.size,
          events: newEvents
        }
      });
    } catch (error) {
      logger.error('Error processing batch RFID events:', error);
      next(error);
    }
  }

  static async getRecentEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { minutes = 5 } = req.query;

      const events = await RfidEventModel.findRecent(parseInt(minutes as string));

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      logger.error('Error fetching recent RFID events:', error);
      next(error);
    }
  }

  static async getOfflineReaders(req: Request, res: Response, next: NextFunction) {
    try {
      const { minutes = 5 } = req.query;

      const offlineReaders = await RfidReaderModel.getOfflineReaders(parseInt(minutes as string));

      res.json({
        success: true,
        data: offlineReaders
      });
    } catch (error) {
      logger.error('Error fetching offline readers:', error);
      next(error);
    }
  }

  static async simulateRfidEvent(req: Request, res: Response, next: NextFunction) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ 
          error: 'Simulation not available in production' 
        });
      }

      const { tag_id, reader_id, signal_strength } = req.body;

      if (!tag_id || !reader_id) {
        return res.status(400).json({ 
          error: 'tag_id and reader_id are required' 
        });
      }

      const reader = await RfidReaderModel.findByReaderId(reader_id);
      if (!reader) {
        return res.status(404).json({ 
          error: 'RFID reader not found' 
        });
      }

      const eventData: IRfidEvent = {
        tag_id,
        reader_id,
        signal_strength: signal_strength || Math.floor(Math.random() * 100) + 50,
        event_type: 'detected',
        location_id: reader.location_id,
        timestamp: new Date(),
        processed: false
      };

      const simulatedEvent = await RfidEventModel.create(eventData);

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'RFID_SIMULATION',
        reader_id: reader_id,
        notes: `Simulated RFID event for tag: ${tag_id}`,
        session_id: (req as any).sessionId
      });

      logger.info(`RFID event simulated: tag ${tag_id} on reader ${reader_id} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: simulatedEvent
      });
    } catch (error) {
      logger.error('Error simulating RFID event:', error);
      next(error);
    }
  }

  static async getEventStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { hours = 24 } = req.query;

      const stats = await RfidEventModel.getEventStats(parseInt(hours as string));

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching RFID event stats:', error);
      next(error);
    }
  }
}