/**
 * Extended Storage Management Routes
 * Additional endpoints for complete storage functionality
 */

import { Router } from 'express';
import { query, withTransaction } from '../database/connection';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// CLIENTS
// =====================================================

// Get all clients
router.get('/clients', async (_req, res) => {
  try {
    const result = await query(`
      SELECT c.*, 
        COUNT(DISTINCT sb.id) as box_count,
        COUNT(DISTINCT d.id) as docket_count,
        SUM(sb.monthly_rate) as monthly_billing
      FROM clients c
      LEFT JOIN storage_boxes sb ON c.id = sb.client_id AND sb.status = 'active'
      LEFT JOIN dockets d ON c.id = d.client_id
      GROUP BY c.id
      ORDER BY c.name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching clients:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch clients',
      message: error.message 
    });
  }
});

// =====================================================
// INVOICES
// =====================================================

// Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    const { client_id, status } = req.query;
    let conditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    if (client_id) {
      conditions.push(`i.client_id = $${paramIndex++}`);
      params.push(client_id);
    }
    if (status) {
      conditions.push(`i.status = $${paramIndex++}`);
      params.push(status);
    }

    const result = await query(`
      SELECT i.*, c.name as client_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY i.created_at DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch invoices',
      message: error.message 
    });
  }
});

// Get invoice details
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: 'Invoice not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    logger.error('Error fetching invoice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch invoice',
      message: error.message 
    });
  }
});

// Update invoice status
router.put('/invoices/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_method, payment_reference } = req.body;

    const result = await query(`
      UPDATE invoices
      SET status = $1,
          payment_method = COALESCE($2, payment_method),
          payment_reference = COALESCE($3, payment_reference),
          paid_date = CASE WHEN $1 = 'paid' THEN CURRENT_DATE ELSE paid_date END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, payment_method, payment_reference, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: 'Invoice not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    logger.error('Error updating invoice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update invoice',
      message: error.message 
    });
  }
});

// =====================================================
// BILLING CALCULATIONS
// =====================================================

// Calculate monthly billing for a client
router.get('/billing/calculate/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { month, year } = req.query;
    
    const billingMonth = month && year ? 
      new Date(parseInt(year as string), parseInt(month as string) - 1, 1) : 
      new Date();

    // Calculate storage fees
    const storageResult = await query(`
      SELECT 
        COUNT(*) as box_count,
        SUM(monthly_rate) as storage_fees
      FROM storage_boxes
      WHERE client_id = $1 AND status = 'active'
    `, [clientId]);

    // Calculate retrieval fees for the month
    const startDate = new Date(billingMonth.getFullYear(), billingMonth.getMonth(), 1);
    const endDate = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0);

    const retrievalResult = await query(`
      SELECT 
        COUNT(*) as request_count,
        SUM(retrieval_fee) as retrieval_fees
      FROM retrieval_requests
      WHERE client_id = $1 
        AND created_at BETWEEN $2 AND $3
        AND status IN ('completed', 'ready')
    `, [clientId, startDate, endDate]);

    const storage = storageResult.rows[0];
    const retrieval = retrievalResult.rows[0];

    const storageFees = parseFloat(storage.storage_fees || 0);
    const retrievalFees = parseFloat(retrieval.retrieval_fees || 0);
    const subtotal = storageFees + retrievalFees;
    const taxAmount = subtotal * 0.15; // 15% VAT
    const totalAmount = subtotal + taxAmount;

    res.json({
      success: true,
      data: {
        client_id: clientId,
        billing_period: billingMonth.toISOString(),
        box_count: storage.box_count,
        storage_fees: storageFees,
        retrieval_count: retrieval.request_count,
        retrieval_fees: retrievalFees,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      }
    });
  } catch (error: any) {
    logger.error('Error calculating billing:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to calculate billing',
      message: error.message 
    });
  }
});

// =====================================================
// BOX SEARCH
// =====================================================

// Search boxes
router.get('/boxes/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      res.status(400).json({ 
        success: false, 
        error: 'Search query required' 
      });
      return;
    }

    const result = await query(`
      SELECT sb.*, c.name as client_name, sz.zone_name
      FROM storage_boxes sb
      LEFT JOIN clients c ON sb.client_id = c.id
      LEFT JOIN storage_zones sz ON sb.zone_id = sz.id
      WHERE sb.box_code ILIKE $1
         OR c.name ILIKE $1
         OR sz.zone_name ILIKE $1
      LIMIT 50
    `, [`%${q}%`]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error searching boxes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search boxes',
      message: error.message 
    });
  }
});

// =====================================================
// REPORTS
// =====================================================

// Get storage utilization report
router.get('/reports/utilization', async (_req, res) => {
  try {
    // Zone utilization
    const zoneResult = await query(`
      SELECT 
        sz.zone_name,
        sz.total_capacity,
        sz.used_capacity,
        ROUND((sz.used_capacity::numeric / NULLIF(sz.total_capacity, 0) * 100), 2) as utilization_percent,
        COUNT(DISTINCT sb.id) as box_count,
        COUNT(DISTINCT d.id) as docket_count
      FROM storage_zones sz
      LEFT JOIN storage_boxes sb ON sz.id = sb.zone_id
      LEFT JOIN dockets d ON sb.id = d.storage_box_id
      WHERE sz.is_active = true
      GROUP BY sz.id
      ORDER BY utilization_percent DESC
    `);

    // Client utilization
    const clientResult = await query(`
      SELECT 
        c.name as client_name,
        COUNT(DISTINCT sb.id) as box_count,
        SUM(sb.capacity) as total_capacity,
        SUM(sb.occupied) as total_occupied,
        ROUND(AVG(sb.occupied::numeric / NULLIF(sb.capacity, 0) * 100), 2) as avg_utilization,
        SUM(sb.monthly_rate) as monthly_cost
      FROM clients c
      INNER JOIN storage_boxes sb ON c.id = sb.client_id
      WHERE sb.status = 'active'
      GROUP BY c.id
      ORDER BY box_count DESC
    `);

    // Time-based utilization (last 30 days)
    const timeResult = await query(`
      SELECT 
        DATE(dm.movement_timestamp) as date,
        COUNT(CASE WHEN dm.movement_type = 'check-in' THEN 1 END) as check_ins,
        COUNT(CASE WHEN dm.movement_type = 'check-out' THEN 1 END) as check_outs,
        COUNT(DISTINCT dm.docket_id) as unique_dockets
      FROM docket_movements dm
      WHERE dm.movement_timestamp > CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(dm.movement_timestamp)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        zones: zoneResult.rows,
        clients: clientResult.rows,
        activity: timeResult.rows
      }
    });
  } catch (error: any) {
    logger.error('Error generating utilization report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate report',
      message: error.message 
    });
  }
});

// Get billing report
router.get('/reports/billing', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end_date || new Date();

    // Revenue by client
    const clientRevenue = await query(`
      SELECT 
        c.name as client_name,
        COUNT(DISTINCT sb.id) as active_boxes,
        SUM(sb.monthly_rate) as monthly_storage_revenue,
        (SELECT SUM(retrieval_fee) 
         FROM retrieval_requests 
         WHERE client_id = c.id 
           AND created_at BETWEEN $1 AND $2
           AND status IN ('completed', 'ready')) as retrieval_revenue
      FROM clients c
      LEFT JOIN storage_boxes sb ON c.id = sb.client_id AND sb.status = 'active'
      GROUP BY c.id
      HAVING COUNT(sb.id) > 0
      ORDER BY monthly_storage_revenue DESC
    `, [startDate, endDate]);

    // Invoice summary
    const invoiceSummary = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM invoices
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY status
    `, [startDate, endDate]);

    // Monthly trend
    const monthlyTrend = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(storage_fees) as storage_revenue,
        SUM(retrieval_fees) as retrieval_revenue,
        SUM(total_amount) as total_revenue,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: {
        client_revenue: clientRevenue.rows,
        invoice_summary: invoiceSummary.rows,
        monthly_trend: monthlyTrend.rows,
        period: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error: any) {
    logger.error('Error generating billing report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate billing report',
      message: error.message 
    });
  }
});

export default router;