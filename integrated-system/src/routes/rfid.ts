import { Router } from 'express';
import { RfidService } from '../services/RfidService';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

router.get('/readers', async (_req, res) => {
  try {
    const rfidService = RfidService.getInstance();
    const readers = await rfidService.getReaderStatus();
    res.json({ success: true, data: readers });
  } catch (error) {
    console.error('Error fetching readers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch readers' });
  }
});

router.post('/readers', async (req, res) => {
  try {
    const rfidService = RfidService.getInstance();
    const reader = await rfidService.registerReader(req.body);
    res.status(201).json({ success: true, data: reader });
  } catch (error) {
    console.error('Error registering reader:', error);
    res.status(500).json({ success: false, error: 'Failed to register reader' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const { limit = 100, tag_id, reader_id, location_id } = req.query;

    let query = `
      SELECT e.*, l.location_name, r.reader_type
      FROM rfid_events e
      LEFT JOIN locations l ON e.location_id = l.id
      LEFT JOIN rfid_readers r ON e.reader_id = r.reader_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (tag_id) {
      query += ` AND e.tag_id = $${++paramCount}`;
      params.push(tag_id);
    }

    if (reader_id) {
      query += ` AND e.reader_id = $${++paramCount}`;
      params.push(reader_id);
    }

    if (location_id) {
      query += ` AND e.location_id = $${++paramCount}`;
      params.push(location_id);
    }

    query += ` ORDER BY e.timestamp DESC LIMIT $${++paramCount}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

router.get('/events/recent', async (_req, res) => {
  try {
    const query = `
      SELECT e.*, l.location_name, r.reader_type, o.name as object_name
      FROM rfid_events e
      LEFT JOIN locations l ON e.location_id = l.id
      LEFT JOIN rfid_readers r ON e.reader_id = r.reader_id
      LEFT JOIN objects o ON e.tag_id = o.rfid_tag_id
      ORDER BY e.timestamp DESC
      LIMIT 50
    `;

    const result = await db.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent events' });
  }
});

router.post('/simulate', async (req, res) => {
  try {
    if (process.env.RFID_SIMULATION_MODE !== 'true') {
      res.status(400).json({ 
        success: false, 
        error: 'Simulation mode is disabled' 
      });
      return;
    }

    const rfidService = RfidService.getInstance();
    await rfidService.simulateEvent(req.body);
    res.json({ success: true, message: 'RFID event simulated' });
  } catch (error) {
    console.error('Error simulating event:', error);
    res.status(500).json({ success: false, error: 'Failed to simulate event' });
  }
});

export default router;