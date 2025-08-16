import { Router } from 'express';
import { query } from '../database/connection';

const router = Router();

// Search dockets by various criteria
router.get('/docket', async (req, res) => {
  try {
    const { query: searchQuery, type } = req.query;

    if (!searchQuery || (searchQuery as string).length < 2) {
      res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 2 characters' 
      });
      return;
    }

    const searchTerm = searchQuery as string;
    let sqlQuery = '';
    let params: any[] = [];

    // Build query based on search type
    switch (type) {
      case 'docket':
        sqlQuery = `
          SELECT 
            d.*,
            c.name as client_name,
            sb.box_code,
            sz.zone_name,
            sz.zone_code
          FROM dockets d
          LEFT JOIN clients c ON d.client_id = c.id
          LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
          LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
          WHERE d.docket_code ILIKE $1
          LIMIT 50
        `;
        params = [`%${searchTerm}%`];
        break;

      case 'case':
        sqlQuery = `
          SELECT 
            d.*,
            c.name as client_name,
            sb.box_code,
            sz.zone_name,
            sz.zone_code
          FROM dockets d
          LEFT JOIN clients c ON d.client_id = c.id
          LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
          LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
          WHERE d.case_number ILIKE $1
          LIMIT 50
        `;
        params = [`%${searchTerm}%`];
        break;

      case 'rfid':
        sqlQuery = `
          SELECT 
            d.*,
            c.name as client_name,
            sb.box_code,
            sz.zone_name,
            sz.zone_code
          FROM dockets d
          LEFT JOIN clients c ON d.client_id = c.id
          LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
          LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
          WHERE d.rfid_tag ILIKE $1
          LIMIT 50
        `;
        params = [`%${searchTerm}%`];
        break;

      case 'barcode':
        sqlQuery = `
          SELECT 
            d.*,
            c.name as client_name,
            sb.box_code,
            sz.zone_name,
            sz.zone_code
          FROM dockets d
          LEFT JOIN clients c ON d.client_id = c.id
          LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
          LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
          WHERE d.barcode ILIKE $1
          LIMIT 50
        `;
        params = [`%${searchTerm}%`];
        break;

      default:
        // Search all fields
        sqlQuery = `
          SELECT 
            d.*,
            c.name as client_name,
            sb.box_code,
            sz.zone_name,
            sz.zone_code
          FROM dockets d
          LEFT JOIN clients c ON d.client_id = c.id
          LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
          LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
          WHERE 
            d.docket_code ILIKE $1 OR
            d.case_number ILIKE $1 OR
            d.rfid_tag ILIKE $1 OR
            d.barcode ILIKE $1 OR
            d.description ILIKE $1
          LIMIT 50
        `;
        params = [`%${searchTerm}%`];
    }

    const result = await query(sqlQuery, params);

    // Format the results for frontend
    const formattedResults = result.rows.map(row => ({
      id: row.id,
      docketCode: row.docket_code,
      caseNumber: row.case_number,
      rfidTag: row.rfid_tag,
      barcode: row.barcode,
      currentLocation: row.current_location,
      storageBox: row.box_code,
      status: row.status,
      clientName: row.client_name,
      zone: row.zone_name,
      description: row.description,
      lastSeen: row.updated_at ? new Date(row.updated_at).toLocaleString() : 'Unknown',
      createdAt: row.created_at
    }));

    res.json({ 
      success: true, 
      data: formattedResults
    });
  } catch (error: any) {
    console.error('Error performing docket search:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to perform search',
      message: error.message 
    });
  }
});

// Quick search across all entities
router.get('/quick', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 2 characters' 
      });
      return;
    }

    const searchTerm = q as string;
    
    // Search dockets
    const dockets = await query(`
      SELECT 
        'docket' as type, 
        id, 
        docket_code as code, 
        case_number as name, 
        description
      FROM dockets 
      WHERE 
        docket_code ILIKE $1 OR 
        case_number ILIKE $1 OR 
        description ILIKE $1
      LIMIT 5
    `, [`%${searchTerm}%`]);

    // Search clients
    const clients = await query(`
      SELECT 
        'client' as type, 
        id, 
        client_code as code, 
        name, 
        organization_type as description
      FROM clients 
      WHERE 
        name ILIKE $1 OR 
        client_code ILIKE $1
      LIMIT 5
    `, [`%${searchTerm}%`]);

    // Search storage boxes
    const boxes = await query(`
      SELECT 
        'box' as type, 
        id, 
        box_code as code, 
        'Box ' || box_code as name, 
        'Zone: ' || zone_id || ', Shelf: ' || shelf_code as description
      FROM storage_boxes 
      WHERE box_code ILIKE $1
      LIMIT 5
    `, [`%${searchTerm}%`]);

    res.json({ 
      success: true, 
      data: {
        dockets: dockets.rows,
        clients: clients.rows,
        boxes: boxes.rows,
        total: dockets.rows.length + clients.rows.length + boxes.rows.length
      }
    });
  } catch (error: any) {
    console.error('Error performing quick search:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to perform search',
      message: error.message
    });
  }
});

// Get docket details by ID
router.get('/docket/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        d.*,
        c.name as client_name,
        c.contact_person,
        c.phone as client_phone,
        sb.box_code,
        sb.shelf_code,
        sz.zone_name,
        sz.zone_code,
        u.full_name as created_by_name
      FROM dockets d
      LEFT JOIN clients c ON d.client_id = c.id
      LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
      LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: 'Docket not found' 
      });
      return;
    }

    // Get movement history
    const movements = await query(`
      SELECT 
        dm.*,
        u.full_name as performed_by_name
      FROM docket_movements dm
      LEFT JOIN users u ON dm.performed_by = u.id
      WHERE dm.docket_id = $1
      ORDER BY dm.movement_timestamp DESC
      LIMIT 10
    `, [id]);

    const docket = result.rows[0];
    docket.movements = movements.rows;

    res.json({ 
      success: true, 
      data: docket
    });
  } catch (error: any) {
    console.error('Error fetching docket details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch docket details',
      message: error.message
    });
  }
});

export default router;