/**
 * Billing Calculation Service
 * Handles invoice generation and billing calculations
 */

import { query, withTransaction } from '../database/connection';
import { logger } from '../utils/logger';

export interface BillingCalculation {
  client_id: number;
  client_name: string;
  billing_period_start: Date;
  billing_period_end: Date;
  storage_boxes: number;
  storage_fees: number;
  retrieval_count: number;
  retrieval_fees: number;
  other_fees: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  line_items: BillingLineItem[];
}

export interface BillingLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  category: 'storage' | 'retrieval' | 'service' | 'penalty';
}

class BillingCalculationService {
  private static instance: BillingCalculationService;
  
  private readonly TAX_RATE = 0.15; // 15% VAT
  private readonly STORAGE_RATE_STANDARD = 40; // R40 per box per month
  private readonly STORAGE_RATE_FIREPROOF = 60; // R60 for fireproof boxes
  private readonly STORAGE_RATE_CLIMATE = 80; // R80 for climate controlled
  private readonly RETRIEVAL_FEE_NORMAL = 10; // R10 per docket
  private readonly RETRIEVAL_FEE_URGENT = 50; // R50 per docket for urgent
  private readonly LATE_PAYMENT_FEE = 100; // R100 late payment fee
  
  private constructor() {}
  
  public static getInstance(): BillingCalculationService {
    if (!BillingCalculationService.instance) {
      BillingCalculationService.instance = new BillingCalculationService();
    }
    return BillingCalculationService.instance;
  }

  /**
   * Calculate monthly billing for a client
   */
  async calculateMonthlyBilling(
    clientId: number, 
    billingMonth: Date
  ): Promise<BillingCalculation> {
    try {
      // Set billing period
      const periodStart = new Date(billingMonth.getFullYear(), billingMonth.getMonth(), 1);
      const periodEnd = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0, 23, 59, 59);
      
      // Get client info
      const clientResult = await query(
        'SELECT id, name, email FROM clients WHERE id = $1',
        [clientId]
      );
      
      if (clientResult.rows.length === 0) {
        throw new Error('Client not found');
      }
      
      const client = clientResult.rows[0];
      const lineItems: BillingLineItem[] = [];
      
      // Calculate storage fees
      const storageResult = await query(`
        SELECT 
          sb.box_type,
          COUNT(*) as box_count,
          SUM(sb.monthly_rate) as total_rate
        FROM storage_boxes sb
        WHERE sb.client_id = $1 
          AND sb.status = 'active'
          AND sb.created_at <= $2
        GROUP BY sb.box_type
      `, [clientId, periodEnd]);
      
      let totalStorageBoxes = 0;
      let totalStorageFees = 0;
      
      for (const row of storageResult.rows) {
        const boxCount = parseInt(row.box_count);
        const rate = parseFloat(row.total_rate);
        totalStorageBoxes += boxCount;
        totalStorageFees += rate;
        
        lineItems.push({
          description: `Storage - ${row.box_type || 'Standard'} boxes (${boxCount} units)`,
          quantity: boxCount,
          unit_price: rate / boxCount,
          total: rate,
          category: 'storage'
        });
      }
      
      // Calculate retrieval fees
      const retrievalResult = await query(`
        SELECT 
          urgency,
          COUNT(*) as request_count,
          SUM(total_items) as total_items,
          SUM(retrieval_fee) as total_fees
        FROM retrieval_requests
        WHERE client_id = $1
          AND created_at BETWEEN $2 AND $3
          AND status IN ('completed', 'ready')
        GROUP BY urgency
      `, [clientId, periodStart, periodEnd]);
      
      let totalRetrievalCount = 0;
      let totalRetrievalFees = 0;
      
      for (const row of retrievalResult.rows) {
        const count = parseInt(row.total_items || row.request_count);
        const fees = parseFloat(row.total_fees || 0);
        totalRetrievalCount += count;
        totalRetrievalFees += fees;
        
        const urgencyLabel = row.urgency === 'urgent' ? 'Urgent' : 'Normal';
        lineItems.push({
          description: `Retrieval - ${urgencyLabel} (${count} items)`,
          quantity: count,
          unit_price: fees / count,
          total: fees,
          category: 'retrieval'
        });
      }
      
      // Check for any additional fees (late payments, special services)
      const otherFeesResult = await query(`
        SELECT 
          description,
          amount
        FROM billing_adjustments
        WHERE client_id = $1
          AND billing_period = DATE_TRUNC('month', $2::date)
          AND status = 'pending'
      `, [clientId, periodStart]);
      
      let totalOtherFees = 0;
      for (const row of otherFeesResult.rows) {
        totalOtherFees += parseFloat(row.amount);
        lineItems.push({
          description: row.description,
          quantity: 1,
          unit_price: parseFloat(row.amount),
          total: parseFloat(row.amount),
          category: 'service'
        });
      }
      
      // Calculate totals
      const subtotal = totalStorageFees + totalRetrievalFees + totalOtherFees;
      const taxAmount = subtotal * this.TAX_RATE;
      const totalAmount = subtotal + taxAmount;
      
      return {
        client_id: clientId,
        client_name: client.name,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        storage_boxes: totalStorageBoxes,
        storage_fees: totalStorageFees,
        retrieval_count: totalRetrievalCount,
        retrieval_fees: totalRetrievalFees,
        other_fees: totalOtherFees,
        subtotal: subtotal,
        tax_rate: this.TAX_RATE,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        line_items: lineItems
      };
      
    } catch (error) {
      logger.error('Error calculating monthly billing:', error);
      throw error;
    }
  }

  /**
   * Generate invoice from billing calculation
   */
  async generateInvoice(calculation: BillingCalculation): Promise<number> {
    return withTransaction(async (client: any) => {
      try {
        // Generate invoice number
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        
        // Create invoice record
        const invoiceResult = await client.query(`
          INSERT INTO invoices (
            invoice_number,
            client_id,
            billing_period_start,
            billing_period_end,
            storage_fees,
            retrieval_fees,
            other_fees,
            subtotal,
            tax_amount,
            total_amount,
            status,
            due_date,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
          RETURNING id
        `, [
          invoiceNumber,
          calculation.client_id,
          calculation.billing_period_start,
          calculation.billing_period_end,
          calculation.storage_fees,
          calculation.retrieval_fees,
          calculation.other_fees,
          calculation.subtotal,
          calculation.tax_amount,
          calculation.total_amount,
          'pending',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Due in 30 days
        ]);
        
        const invoiceId = invoiceResult.rows[0].id;
        
        // Insert line items
        for (const item of calculation.line_items) {
          await client.query(`
            INSERT INTO invoice_line_items (
              invoice_id,
              description,
              quantity,
              unit_price,
              total_amount,
              category
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            invoiceId,
            item.description,
            item.quantity,
            item.unit_price,
            item.total,
            item.category
          ]);
        }
        
        // Mark any billing adjustments as processed
        await client.query(`
          UPDATE billing_adjustments
          SET status = 'processed',
              invoice_id = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE client_id = $2
            AND billing_period = DATE_TRUNC('month', $3::date)
            AND status = 'pending'
        `, [invoiceId, calculation.client_id, calculation.billing_period_start]);
        
        logger.info(`Invoice ${invoiceNumber} generated for client ${calculation.client_id}`, {
          invoiceId,
          totalAmount: calculation.total_amount
        });
        
        return invoiceId;
        
      } catch (error) {
        logger.error('Error generating invoice:', error);
        throw error;
      }
    });
  }

  /**
   * Process batch invoicing for all clients
   */
  async processBatchInvoicing(billingMonth: Date): Promise<number[]> {
    try {
      // Get all active clients with storage boxes
      const clientsResult = await query(`
        SELECT DISTINCT c.id
        FROM clients c
        INNER JOIN storage_boxes sb ON c.id = sb.client_id
        WHERE sb.status = 'active'
          AND c.is_active = true
      `);
      
      const invoiceIds: number[] = [];
      
      for (const row of clientsResult.rows) {
        try {
          const calculation = await this.calculateMonthlyBilling(row.id, billingMonth);
          
          // Only generate invoice if there are charges
          if (calculation.total_amount > 0) {
            const invoiceId = await this.generateInvoice(calculation);
            invoiceIds.push(invoiceId);
          }
        } catch (error) {
          logger.error(`Failed to generate invoice for client ${row.id}:`, error);
          // Continue with other clients
        }
      }
      
      logger.info(`Batch invoicing completed. Generated ${invoiceIds.length} invoices.`);
      return invoiceIds;
      
    } catch (error) {
      logger.error('Error in batch invoicing:', error);
      throw error;
    }
  }

  /**
   * Apply late payment fee
   */
  async applyLatePaymentFee(invoiceId: number): Promise<void> {
    try {
      await query(`
        INSERT INTO billing_adjustments (
          client_id,
          invoice_id,
          description,
          amount,
          billing_period,
          status,
          created_at
        )
        SELECT 
          client_id,
          id,
          'Late payment fee',
          $1,
          billing_period_start,
          'pending',
          CURRENT_TIMESTAMP
        FROM invoices
        WHERE id = $2
          AND status = 'overdue'
          AND NOT EXISTS (
            SELECT 1 FROM billing_adjustments
            WHERE invoice_id = $2
              AND description = 'Late payment fee'
          )
      `, [this.LATE_PAYMENT_FEE, invoiceId]);
      
      logger.info(`Late payment fee applied to invoice ${invoiceId}`);
      
    } catch (error) {
      logger.error('Error applying late payment fee:', error);
      throw error;
    }
  }

  /**
   * Mark invoices as overdue
   */
  async markOverdueInvoices(): Promise<number> {
    try {
      const result = await query(`
        UPDATE invoices
        SET status = 'overdue',
            updated_at = CURRENT_TIMESTAMP
        WHERE status = 'pending'
          AND due_date < CURRENT_DATE
        RETURNING id
      `);
      
      // Apply late fees to overdue invoices
      for (const row of result.rows) {
        await this.applyLatePaymentFee(row.id);
      }
      
      logger.info(`Marked ${result.rowCount} invoices as overdue`);
      return result.rowCount;
      
    } catch (error) {
      logger.error('Error marking overdue invoices:', error);
      throw error;
    }
  }

  /**
   * Get billing summary for dashboard
   */
  async getBillingSummary(clientId?: number): Promise<any> {
    try {
      let conditions = ['1=1'];
      let params: any[] = [];
      
      if (clientId) {
        conditions.push('client_id = $1');
        params.push(clientId);
      }
      
      const result = await query(`
        SELECT 
          COUNT(*) as total_invoices,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
          SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_invoices,
          SUM(total_amount) as total_billed,
          SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_collected,
          SUM(CASE WHEN status IN ('pending', 'overdue') THEN total_amount ELSE 0 END) as total_outstanding,
          AVG(total_amount) as average_invoice_amount,
          MAX(created_at) as last_invoice_date
        FROM invoices
        WHERE ${conditions.join(' AND ')}
          AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      `, params);
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error getting billing summary:', error);
      throw error;
    }
  }
}

export default BillingCalculationService.getInstance();