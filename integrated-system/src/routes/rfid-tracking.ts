/**
 * RFID Tracking API Routes
 * Handles RFID reader management and docket finding
 */

import { Router } from 'express';
import { RfidTrackingService } from '../services/rfid/RfidTrackingService';
import { query, withTransaction } from '../database/connection';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// All RFID routes require authentication
router.use(authMiddleware);

// Get RFID tracking service instance
const getRfidService = () => {
  try {
    return RfidTrackingService.getInstance();
  } catch (error) {
    throw new Error('RFID service not initialized');
  }
};

// =====================================================
// READER MANAGEMENT
// =====================================================

// Get all RFID readers
router.get('/readers', async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, sz.zone_name,
        COUNT(DISTINCT e.id) as event_count,
        MAX(e.created_at) as last_activity
      FROM rfid_readers r
      LEFT JOIN storage_zones sz ON r.zone_id = sz.id
      LEFT JOIN rfid_events e ON r.id = e.reader_id 
        AND e.created_at > NOW() - INTERVAL '1 hour'
      GROUP BY r.id, sz.zone_name
      ORDER BY r.zone_id, r.name
    `);

    res.json({
      success: true,
      data: result.rows.map(reader => ({
        ...reader,
        status: reader.status || 'offline',
        health: {
          temperature: reader.temperature || 25,
          uptime: reader.uptime || 0,
          signal_quality: reader.signal_quality || 100
        }
      }))
    });
  } catch (error: any) {
    logger.error('Error fetching RFID readers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch readers',
      message: error.message 
    });
  }
});

// Get specific reader details
router.get('/readers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT r.*, sz.zone_name,
        COUNT(DISTINCT e.id) as total_events,
        COUNT(DISTINCT e.tag_id) as unique_tags,
        AVG(e.signal_strength) as avg_signal_strength
      FROM rfid_readers r
      LEFT JOIN storage_zones sz ON r.zone_id = sz.id
      LEFT JOIN rfid_events e ON r.id = e.reader_id
      WHERE r.id = $1
      GROUP BY r.id, sz.zone_name
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: 'Reader not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    logger.error('Error fetching reader details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch reader details',
      message: error.message 
    });
  }
});

// Update reader configuration
router.put('/readers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { antenna_power, read_range, status } = req.body;

    const result = await query(`
      UPDATE rfid_readers
      SET antenna_power = COALESCE($1, antenna_power),
          read_range = COALESCE($2, read_range),
          status = COALESCE($3, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [antenna_power, read_range, status, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: 'Reader not found' 
      });
      return;
    }

    // Update hardware configuration if online
    if (status === 'online') {
      try {
        const rfidService = getRfidService();
        await rfidService['controlReader'](id, 'power', { power: antenna_power });
      } catch (error) {
        logger.warn('Could not update hardware configuration:', error);
      }
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    logger.error('Error updating reader:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update reader',
      message: error.message 
    });
  }
});

// Start/stop reader inventory
router.post('/readers/:id/control', async (req, res) => {
  try {
    const { id } = req.params;
    const { command, params } = req.body;

    const rfidService = getRfidService();
    await rfidService['controlReader'](id, command, params);

    res.json({
      success: true,
      message: `Reader ${command} command executed`
    });
  } catch (error: any) {
    logger.error('Error controlling reader:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to control reader',
      message: error.message 
    });
  }
});

// =====================================================
// DOCKET FINDING
// =====================================================

// Start finding a docket
router.post('/find', async (req, res) => {
  try {
    const { docket_code, mode = 'standard' } = req.body;
    
    if (!docket_code) {
      res.status(400).json({ 
        success: false, 
        error: 'Docket code required' 
      });
      return;
    }

    const rfidService = getRfidService();
    const finder = rfidService['finder'];
    const session = await finder.startFinding(docket_code, mode);

    res.json({
      success: true,
      data: session,
      message: `Finding session started for ${docket_code}`
    });
  } catch (error: any) {
    logger.error('Error starting finding session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start finding',
      message: error.message 
    });
  }
});

// Stop finding session
router.delete('/find/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const rfidService = getRfidService();
    const finder = rfidService['finder'];
    await finder.stopFinding(sessionId);

    res.json({
      success: true,
      message: 'Finding session stopped'
    });
  } catch (error: any) {
    logger.error('Error stopping finding session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stop finding',
      message: error.message 
    });
  }
});

// Get finding statistics
router.get('/find/stats', async (_req, res) => {
  try {
    const rfidService = getRfidService();
    const finder = rfidService['finder'];
    const stats = finder.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error getting finding stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get statistics',
      message: error.message 
    });
  }
});

// =====================================================
// REAL-TIME TRACKING
// =====================================================

// Get current tag locations
router.get('/tracking/locations', async (_req, res) => {
  try {
    const rfidService = getRfidService();
    const locations = Array.from(rfidService['tagLocations'].values());

    res.json({
      success: true,
      data: locations,
      count: locations.length
    });
  } catch (error: any) {
    logger.error('Error getting tag locations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get locations',
      message: error.message 
    });
  }
});

// Track specific tags
router.post('/tracking/track', async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      res.status(400).json({ 
        success: false, 
        error: 'Tags array required' 
      });
      return;
    }

    const rfidService = getRfidService();
    const session = await rfidService['startTrackingSession'](req.ip, tags);

    res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    logger.error('Error starting tracking session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start tracking',
      message: error.message 
    });
  }
});

// =====================================================
// RFID EVENTS
// =====================================================

// Get recent RFID events
router.get('/events', async (req, res) => {
  try {
    const { limit = 100, zone_id, tag_id, reader_id } = req.query;
    
    let conditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    if (zone_id) {
      conditions.push(`e.zone_id = $${paramIndex++}`);
      params.push(zone_id);
    }
    if (tag_id) {
      conditions.push(`e.tag_id = $${paramIndex++}`);
      params.push(tag_id);
    }
    if (reader_id) {
      conditions.push(`e.reader_id = $${paramIndex++}`);
      params.push(reader_id);
    }

    params.push(limit);

    const result = await query(`
      SELECT e.*, r.name as reader_name, sz.zone_name,
        d.docket_code, d.case_number
      FROM rfid_events e
      LEFT JOIN rfid_readers r ON e.reader_id = r.id
      LEFT JOIN storage_zones sz ON e.zone_id = sz.id
      LEFT JOIN dockets d ON e.tag_id = d.rfid_tag
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex}
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching RFID events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch events',
      message: error.message 
    });
  }
});

// Get event statistics
router.get('/events/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT tag_id) as unique_tags,
        COUNT(DISTINCT reader_id) as active_readers,
        COUNT(DISTINCT zone_id) as active_zones,
        COUNT(CASE WHEN event_type = 'detected' THEN 1 END) as detections,
        COUNT(CASE WHEN event_type = 'moved' THEN 1 END) as movements,
        COUNT(CASE WHEN event_type = 'lost' THEN 1 END) as lost_tags,
        AVG(signal_strength) as avg_signal_strength
      FROM rfid_events
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    const hourlyStats = await query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as event_count,
        COUNT(DISTINCT tag_id) as unique_tags
      FROM rfid_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `);

    res.json({
      success: true,
      data: {
        current: result.rows[0],
        hourly: hourlyStats.rows
      }
    });
  } catch (error: any) {
    logger.error('Error getting event statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get statistics',
      message: error.message 
    });
  }
});

// =====================================================
// SYSTEM STATUS
// =====================================================

// Get RFID system status
router.get('/status', async (_req, res) => {
  try {
    const rfidService = getRfidService();
    const statistics = rfidService.getStatistics();

    // Get database stats
    const dbStats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM rfid_readers WHERE status = 'online') as online_readers,
        (SELECT COUNT(*) FROM rfid_readers WHERE status = 'offline') as offline_readers,
        (SELECT COUNT(*) FROM rfid_events WHERE created_at > NOW() - INTERVAL '1 minute') as recent_events,
        (SELECT COUNT(DISTINCT tag_id) FROM rfid_events WHERE created_at > NOW() - INTERVAL '5 minutes') as active_tags
    `);

    res.json({
      success: true,
      data: {
        service: statistics,
        database: dbStats.rows[0],
        health: {
          status: 'operational',
          mode: process.env.RFID_SIMULATION_MODE === 'true' ? 'simulation' : 'live',
          uptime: process.uptime()
        }
      }
    });
  } catch (error: any) {
    logger.error('Error getting system status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get status',
      message: error.message 
    });
  }
});

export default router;