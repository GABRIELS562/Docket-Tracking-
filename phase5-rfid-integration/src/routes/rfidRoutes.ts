import { Router, Request, Response } from 'express';
import ZebraReaderService from '../services/ZebraReaderService';
import RfidEventProcessor from '../services/RfidEventProcessor';
import RfidSimulator from '../simulators/RfidSimulator';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

const router = Router();

// Reader Management
router.get('/readers', async (req: Request, res: Response) => {
  try {
    const status = ZebraReaderService.getReaderStatus();
    const stats = await DatabaseService.getReaderStats();
    
    res.json({
      success: true,
      data: {
        readers: status.readers,
        connections: status.connections,
        statistics: stats
      }
    });
  } catch (error: any) {
    logger.error('Get readers error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve readers'
    });
  }
});

router.get('/readers/:readerId', async (req: Request, res: Response) => {
  try {
    const { readerId } = req.params;
    const status = ZebraReaderService.getReaderStatus(readerId);
    
    if (!status.reader) {
      return res.status(404).json({
        success: false,
        error: 'Reader not found'
      });
    }

    const healthResult = await DatabaseService.query(
      `SELECT * FROM reader_health_logs 
       WHERE reader_id = $1 
       ORDER BY check_timestamp DESC 
       LIMIT 10`,
      [readerId]
    );

    res.json({
      success: true,
      data: {
        reader: status.reader,
        connection: status.connection,
        healthHistory: healthResult.rows
      }
    });
  } catch (error: any) {
    logger.error('Get reader error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve reader'
    });
  }
});

router.post('/readers/:readerId/connect', async (req: Request, res: Response) => {
  try {
    const { readerId } = req.params;
    
    await ZebraReaderService.connectReader(readerId);
    
    res.json({
      success: true,
      message: 'Reader connection initiated'
    });
  } catch (error: any) {
    logger.error('Connect reader error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect reader'
    });
  }
});

router.post('/readers/:readerId/disconnect', async (req: Request, res: Response) => {
  try {
    const { readerId } = req.params;
    
    await ZebraReaderService.disconnectReader(readerId);
    
    res.json({
      success: true,
      message: 'Reader disconnected successfully'
    });
  } catch (error: any) {
    logger.error('Disconnect reader error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect reader'
    });
  }
});

router.post('/readers/:readerId/command', async (req: Request, res: Response) => {
  try {
    const { readerId } = req.params;
    const { command, parameters } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    const response = await ZebraReaderService.sendCommand(readerId, {
      command,
      parameters: parameters || {}
    });
    
    res.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    logger.error('Send command error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send command'
    });
  }
});

// Event Management
router.get('/events', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const readerId = req.query.readerId as string;
    const tagId = req.query.tagId as string;
    const hours = parseInt(req.query.hours as string) || 24;

    let whereClause = `WHERE timestamp > NOW() - INTERVAL '${hours} hours'`;
    const params: any[] = [];
    let paramIndex = 1;

    if (readerId) {
      whereClause += ` AND reader_id = $${paramIndex}`;
      params.push(readerId);
      paramIndex++;
    }

    if (tagId) {
      whereClause += ` AND tag_id = $${paramIndex}`;
      params.push(tagId);
      paramIndex++;
    }

    const result = await DatabaseService.query(
      `SELECT e.*, o.object_code, o.name as object_name, l.location_name
       FROM rfid_events e
       LEFT JOIN objects o ON e.tag_id = o.rfid_tag_id
       LEFT JOIN locations l ON e.location_id = l.id
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await DatabaseService.query(
      `SELECT COUNT(*) as total FROM rfid_events ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        events: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      }
    });
  } catch (error: any) {
    logger.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve events'
    });
  }
});

router.get('/events/stats', async (req: Request, res: Response) => {
  try {
    const timeWindow = req.query.window as string || '1 hour';
    const stats = await DatabaseService.getEventStats(timeWindow);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Get event stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve event statistics'
    });
  }
});

// Object Tracking
router.get('/objects', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const locationId = req.query.locationId as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (locationId) {
      whereClause += ` AND current_location_id = $${paramIndex}`;
      params.push(parseInt(locationId));
      paramIndex++;
    }

    const result = await DatabaseService.query(
      `SELECT o.*, l.location_name, r.reader_name
       FROM objects o
       LEFT JOIN locations l ON o.current_location_id = l.id
       LEFT JOIN rfid_readers r ON o.current_reader_id = r.reader_id
       ${whereClause}
       ORDER BY last_seen DESC NULLS LAST, object_code
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        objects: result.rows,
        limit,
        offset
      }
    });
  } catch (error: any) {
    logger.error('Get objects error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve objects'
    });
  }
});

router.get('/objects/:objectId/movements', async (req: Request, res: Response) => {
  try {
    const { objectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await DatabaseService.query(
      `SELECT m.*, 
              fl.location_name as from_location_name,
              tl.location_name as to_location_name,
              fr.reader_name as from_reader_name,
              tr.reader_name as to_reader_name
       FROM object_movements m
       LEFT JOIN locations fl ON m.from_location_id = fl.id
       LEFT JOIN locations tl ON m.to_location_id = tl.id
       LEFT JOIN rfid_readers fr ON m.from_reader_id = fr.reader_id
       LEFT JOIN rfid_readers tr ON m.to_reader_id = tr.reader_id
       WHERE m.object_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [objectId, limit]
    );

    res.json({
      success: true,
      data: {
        movements: result.rows
      }
    });
  } catch (error: any) {
    logger.error('Get object movements error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve object movements'
    });
  }
});

// Alerts Management
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string;
    const acknowledged = req.query.acknowledged === 'true';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (req.query.acknowledged !== undefined) {
      whereClause += ` AND acknowledged = $${paramIndex}`;
      params.push(acknowledged);
      paramIndex++;
    }

    const result = await DatabaseService.query(
      `SELECT a.*, r.reader_name, l.location_name
       FROM system_alerts a
       LEFT JOIN rfid_readers r ON a.reader_id = r.reader_id
       LEFT JOIN locations l ON a.location_id = l.id
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex}`,
      [...params, limit]
    );

    res.json({
      success: true,
      data: {
        alerts: result.rows
      }
    });
  } catch (error: any) {
    logger.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve alerts'
    });
  }
});

router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    await DatabaseService.query(
      `UPDATE system_alerts 
       SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
       WHERE id = $2`,
      [acknowledgedBy || 'system', alertId]
    );

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error: any) {
    logger.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to acknowledge alert'
    });
  }
});

// Simulation Management
router.get('/simulation/status', (req: Request, res: Response) => {
  try {
    const stats = RfidSimulator.getSimulationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Get simulation status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve simulation status'
    });
  }
});

router.post('/simulation/start', async (req: Request, res: Response) => {
  try {
    await RfidSimulator.startSimulation();
    
    res.json({
      success: true,
      message: 'Simulation started successfully'
    });
  } catch (error: any) {
    logger.error('Start simulation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start simulation'
    });
  }
});

router.post('/simulation/stop', async (req: Request, res: Response) => {
  try {
    await RfidSimulator.stopSimulation();
    
    res.json({
      success: true,
      message: 'Simulation stopped successfully'
    });
  } catch (error: any) {
    logger.error('Stop simulation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop simulation'
    });
  }
});

router.post('/simulation/config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    await RfidSimulator.adjustSimulationParameters(config);
    
    res.json({
      success: true,
      message: 'Simulation configuration updated'
    });
  } catch (error: any) {
    logger.error('Update simulation config error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update simulation configuration'
    });
  }
});

// System Health and Statistics
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await DatabaseService.getSystemHealth();
    const processorStats = RfidEventProcessor.getStats();
    
    res.json({
      success: true,
      data: {
        ...health,
        eventProcessor: processorStats
      }
    });
  } catch (error: any) {
    logger.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve system health'
    });
  }
});

router.get('/performance', async (req: Request, res: Response) => {
  try {
    const metrics = await DatabaseService.getPerformanceMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    logger.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve performance metrics'
    });
  }
});

// Force processing for testing
router.post('/events/process', async (req: Request, res: Response) => {
  try {
    await RfidEventProcessor.forceProcessBatch();
    
    res.json({
      success: true,
      message: 'Event processing triggered'
    });
  } catch (error: any) {
    logger.error('Force process events error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger event processing'
    });
  }
});

export default router;