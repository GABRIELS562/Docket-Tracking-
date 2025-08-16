/**
 * Storage Management Service
 * Handles managed storage operations for dockets
 */

import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { Server } from 'socket.io';

interface StorageBox {
  id: number;
  boxCode: string;
  rfidTagId: string;
  barcodeValue: string;
  clientId: number;
  capacity: number;
  currentCount: number;
  locationCode: string;
  status: 'active' | 'full' | 'retrieved' | 'archived';
  monthlyRate: number;
}

interface StorageRequest {
  id: number;
  requestNumber: string;
  clientId: number;
  requestType: 'retrieval' | 'storage' | 'return' | 'bulk_retrieval';
  urgency: 'normal' | 'urgent' | 'scheduled';
  docketIds?: number[];
  boxIds?: number[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface StorageInvoice {
  invoiceNumber: string;
  clientId: number;
  period: { start: Date; end: Date };
  charges: {
    storage: number;
    retrieval: number;
    urgent: number;
    other: number;
  };
  total: number;
  dueDate: Date;
}

export class StorageManagementService {
  private static instance: StorageManagementService;
  private db: DatabaseService;
  private io?: Server;

  private constructor(io?: Server) {
    this.db = DatabaseService.getInstance();
    this.io = io;
  }

  static getInstance(io?: Server): StorageManagementService {
    if (!StorageManagementService.instance) {
      StorageManagementService.instance = new StorageManagementService(io);
    }
    return StorageManagementService.instance;
  }

  /**
   * Create a new storage box for a client
   */
  async createStorageBox(clientId: number, boxType: string = 'standard'): Promise<StorageBox> {
    const boxCode = await this.generateBoxCode();
    const shelfCode = await this.assignShelfLocation();
    
    const result = await this.db.query(
      `INSERT INTO storage_boxes 
       (box_code, client_id, box_type, capacity, shelf_code, zone_id, monthly_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [boxCode, clientId, boxType, 100, shelfCode, 1, 40.00] // Default to zone 1
    );

    const box = result.rows[0];
    logger.info(`Created storage box ${boxCode} for client ${clientId}`);
    
    // Map database columns to interface
    return {
      id: box.id,
      boxCode: box.box_code,
      rfidTagId: `RFID-BOX-${box.id}`,
      barcodeValue: `BAR-BOX-${box.id}`,
      clientId: box.client_id,
      capacity: box.capacity,
      currentCount: box.occupied,
      locationCode: box.shelf_code,
      status: box.status,
      monthlyRate: box.monthly_rate
    };
  }

  /**
   * Add docket to storage box
   */
  async addDocketToBox(docketId: number, boxId: number, userId: number): Promise<boolean> {
    try {
      await this.db.transaction(async (client) => {
        // Check box capacity
        const boxResult = await client.query(
          'SELECT occupied, capacity FROM storage_boxes WHERE id = $1',
          [boxId]
        );

        if (boxResult.rows[0].occupied >= boxResult.rows[0].capacity) {
          throw new Error('Box is at full capacity');
        }

        // Update docket location
        const boxInfo = await client.query(
          'SELECT box_code, zone_id FROM storage_boxes WHERE id = $1',
          [boxId]
        );
        await client.query(
          `UPDATE dockets 
           SET storage_box_id = $1,
               current_location = $2,
               current_zone_id = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [boxId, `Box ${boxInfo.rows[0].box_code}`, boxInfo.rows[0].zone_id, docketId]
        );

        // Update box count
        await client.query(
          `UPDATE storage_boxes 
           SET occupied = occupied + 1,
               last_accessed = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [boxId]
        );

        // Log movement
        await client.query(
          `INSERT INTO docket_movements 
           (docket_id, to_box_id, to_location, movement_type, performed_by, movement_reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [docketId, boxId, `Box ${boxId}`, 'check-in', userId, 'Added to storage box']
        );
      });

      // Broadcast update
      this.io?.emit('storage:docket_added', { docketId, boxId });
      
      return true;
    } catch (error) {
      logger.error('Failed to add docket to box:', error);
      throw error;
    }
  }

  /**
   * Process retrieval request
   */
  async createRetrievalRequest(
    clientId: number,
    docketIds: number[],
    urgency: 'normal' | 'urgent' = 'normal',
    userId: number
  ): Promise<StorageRequest> {
    const requestNumber = await this.generateRequestNumber();
    const retrievalFee = urgency === 'urgent' ? 50.00 * docketIds.length : 0;

    // Create the main retrieval request
    const result = await this.db.query(
      `INSERT INTO retrieval_requests 
       (request_number, client_id, urgency, status, requested_by, 
        total_items, retrieval_fee, completion_deadline)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, 
        NOW() + INTERVAL '${urgency === 'urgent' ? '30 minutes' : '2 hours'}')
       RETURNING *`,
      [requestNumber, clientId, urgency, userId, docketIds.length, retrievalFee]
    );
    
    // Add items to retrieval_request_items
    const requestId = result.rows[0].id;
    for (const docketId of docketIds) {
      await this.db.query(
        `INSERT INTO retrieval_request_items (request_id, docket_id, status)
         VALUES ($1, $2, 'pending')`,
        [requestId, docketId]
      );
    }

    const request = result.rows[0];
    
    // Notify storage staff
    this.io?.to('storage_staff').emit('storage:new_request', request);
    
    // Schedule if urgent
    if (urgency === 'urgent') {
      this.scheduleUrgentRetrieval(request.id);
    }

    logger.info(`Created retrieval request ${requestNumber} for ${docketIds.length} dockets`);
    return request;
  }

  /**
   * Complete retrieval request
   */
  async completeRetrieval(requestId: number, userId: number): Promise<void> {
    await this.db.transaction(async (client) => {
      // Get request details
      const requestResult = await client.query(
        'SELECT * FROM retrieval_requests WHERE id = $1',
        [requestId]
      );
      const request = requestResult.rows[0];
      
      // Get items for this request
      const itemsResult = await client.query(
        'SELECT docket_id FROM retrieval_request_items WHERE request_id = $1',
        [requestId]
      );

      // Update docket locations
      for (const item of itemsResult.rows) {
        const docketId = item.docket_id;
        
        // Update docket
        await client.query(
          `UPDATE dockets 
           SET storage_box_id = NULL,
               current_location = 'Retrieved - Pending Collection',
               status = 'checked-out',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [docketId]
        );
        
        // Update box occupied count
        await client.query(
          `UPDATE storage_boxes 
           SET occupied = GREATEST(0, occupied - 1)
           WHERE id = (SELECT storage_box_id FROM dockets WHERE id = $1)`,
          [docketId]
        );

        // Log movement
        await client.query(
          `INSERT INTO docket_movements 
           (docket_id, from_location, to_location, movement_type, performed_by, movement_reason)
           VALUES ($1, 'Storage Room', 'Collection Point', 'check-out', $2, 'Retrieval request completed')`,
          [docketId, userId]
        );
        
        // Update item status
        await client.query(
          `UPDATE retrieval_request_items 
           SET status = 'retrieved', retrieved_at = CURRENT_TIMESTAMP
           WHERE request_id = $1 AND docket_id = $2`,
          [requestId, docketId]
        );
      }

      // Update request status
      await client.query(
        `UPDATE retrieval_requests 
         SET status = 'completed',
             actual_completion = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [requestId]
      );
    });

    logger.info(`Completed retrieval request ${requestId}`);
  }

  /**
   * Generate monthly invoice for client
   */
  async generateMonthlyInvoice(clientId: number, billingMonth: Date): Promise<StorageInvoice> {
    const startDate = new Date(billingMonth.getFullYear(), billingMonth.getMonth(), 1);
    const endDate = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0);

    // Calculate storage charges
    const boxResult = await this.db.query(
      `SELECT COUNT(*) as box_count, SUM(monthly_rate) as total_rate
       FROM storage_boxes 
       WHERE client_id = $1 AND status = 'active'`,
      [clientId]
    );

    // Calculate retrieval charges
    const retrievalResult = await this.db.query(
      `SELECT 
        COUNT(CASE WHEN urgency = 'normal' THEN 1 END) * 50 as normal_charges,
        COUNT(CASE WHEN urgency = 'urgent' THEN 1 END) * 100 as urgent_charges
       FROM retrieval_requests
       WHERE client_id = $1 
         AND DATE(created_at) BETWEEN $2 AND $3
         AND status = 'completed'`,
      [clientId, startDate, endDate]
    );

    const storageCharges = parseFloat(boxResult.rows[0].total_rate || 0);
    const retrievalCharges = parseFloat(retrievalResult.rows[0].normal_charges || 0);
    const urgentCharges = parseFloat(retrievalResult.rows[0].urgent_charges || 0);
    const subtotal = storageCharges + retrievalCharges + urgentCharges;
    const tax = subtotal * 0.15; // 15% VAT
    const total = subtotal + tax;

    // Create invoice
    const invoiceNumber = `INV-${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}-${clientId}`;
    
    await this.db.query(
      `INSERT INTO invoices 
       (invoice_number, client_id, billing_period_start, billing_period_end,
        storage_box_count, storage_fees, retrieval_fees, other_fees,
        subtotal, tax_amount, total_amount, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')`,
      [
        invoiceNumber, clientId, startDate, endDate,
        boxResult.rows[0].box_count, storageCharges, retrievalCharges + urgentCharges, 0,
        subtotal, tax, total, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ]
    );

    return {
      invoiceNumber,
      clientId,
      period: { start: startDate, end: endDate },
      charges: {
        storage: storageCharges,
        retrieval: retrievalCharges,
        urgent: urgentCharges,
        other: 0
      },
      total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Get storage analytics
   */
  async getStorageAnalytics(clientId?: number): Promise<any> {
    const clientFilter = clientId ? 'WHERE c.id = $1' : '';
    const params = clientId ? [clientId] : [];

    const result = await this.db.query(
      `SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT sb.id) as total_boxes,
        COUNT(DISTINCT d.id) as total_dockets_stored,
        SUM(sb.monthly_rate) as monthly_revenue,
        AVG(sb.occupied::float / sb.capacity * 100) as avg_utilization,
        COUNT(DISTINCT rr.id) FILTER (WHERE rr.created_at > CURRENT_DATE - INTERVAL '30 days') as monthly_requests
       FROM clients c
       LEFT JOIN storage_boxes sb ON c.id = sb.client_id
       LEFT JOIN dockets d ON sb.id = d.storage_box_id
       LEFT JOIN retrieval_requests rr ON c.id = rr.client_id
       ${clientFilter}`,
      params
    );

    return result.rows[0];
  }

  /**
   * Check box availability
   */
  async getAvailableBoxes(capacity: number = 50): Promise<StorageBox[]> {
    const result = await this.db.query(
      `SELECT * FROM storage_boxes 
       WHERE status = 'active' 
         AND (capacity - occupied) >= $1
       ORDER BY occupied ASC
       LIMIT 10`,
      [capacity]
    );

    return result.rows;
  }

  /**
   * Box utilization report
   */
  async getBoxUtilization(clientId?: number): Promise<any[]> {
    const clientFilter = clientId ? 'WHERE client_id = $1' : '';
    const params = clientId ? [clientId] : [];

    const result = await this.db.query(
      `SELECT 
        box_code,
        capacity,
        occupied,
        ROUND((occupied::numeric / capacity) * 100, 2) as utilization_percent,
        shelf_code,
        monthly_rate,
        last_accessed
       FROM storage_boxes
       ${clientFilter}
       ORDER BY utilization_percent DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Helper methods
   */
  private async generateBoxCode(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM storage_boxes 
       WHERE box_code LIKE $1`,
      [`BOX-${year}-%`]
    );
    
    const count = parseInt(result.rows[0].count) + 1;
    return `BOX-${year}-${String(count).padStart(4, '0')}`;
  }

  private async generateRequestNumber(): Promise<string> {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    
    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM retrieval_requests 
       WHERE request_number LIKE $1`,
      [`REQ-${dateStr}-%`]
    );
    
    const count = parseInt(result.rows[0].count) + 1;
    return `REQ-${dateStr}-${String(count).padStart(3, '0')}`;
  }

  private async assignShelfLocation(): Promise<string> {
    // Find next available shelf location
    const result = await this.db.query(
      `SELECT shelf_code, COUNT(*) as box_count
       FROM storage_boxes
       WHERE status = 'active'
       GROUP BY shelf_code
       HAVING COUNT(*) < 20
       ORDER BY box_count ASC
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      return result.rows[0].shelf_code;
    }

    // Assign new shelf
    const shelfResult = await this.db.query(
      `SELECT COUNT(DISTINCT shelf_code) as shelf_count 
       FROM storage_boxes`
    );
    
    const shelfCount = parseInt(shelfResult.rows[0].shelf_count) + 1;
    const row = String.fromCharCode(65 + Math.floor(shelfCount / 10));
    const col = (shelfCount % 10) + 1;
    
    return `SHELF-${row}-${col}`;
  }

  private scheduleUrgentRetrieval(requestId: number): void {
    // In production, this would integrate with task scheduling
    setTimeout(() => {
      logger.info(`Processing urgent retrieval ${requestId}`);
      // Send notification to storage staff
      this.io?.to('storage_staff').emit('storage:urgent_retrieval', { requestId });
    }, 1000);
  }
}

export default StorageManagementService;