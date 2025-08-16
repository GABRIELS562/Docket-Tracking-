/**
 * Storage Service API Routes
 * Handles managed storage operations
 */

import { Router } from 'express';
import { StorageManagementService } from '../services/StorageManagementService';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import Joi from 'joi';
import { logger } from '../utils/logger';

const router = Router();

// All storage routes require authentication
router.use(authMiddleware);

// Initialize service
const storageService = StorageManagementService.getInstance();

// Validation schemas
const createBoxSchema = Joi.object({
  clientId: Joi.number().required(),
  boxType: Joi.string().valid('standard', 'fireproof', 'climate_controlled').optional()
});

const addDocketSchema = Joi.object({
  docketId: Joi.number().required(),
  boxId: Joi.number().required()
});

const retrievalRequestSchema = Joi.object({
  clientId: Joi.number().required(),
  docketIds: Joi.array().items(Joi.number()).min(1).required(),
  urgency: Joi.string().valid('normal', 'urgent').optional()
});

// =====================================================
// BOX MANAGEMENT
// =====================================================

// Create new storage box
router.post('/boxes', validateRequest(createBoxSchema), async (req, res) => {
  try {
    const { clientId, boxType } = req.body;
    const box = await storageService.createStorageBox(clientId, boxType);
    
    res.status(201).json({
      success: true,
      data: box,
      message: `Storage box ${box.boxCode} created successfully`
    });
  } catch (error) {
    logger.error('Error creating storage box:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create storage box' 
    });
  }
});

// Add docket to box
router.post('/boxes/add-docket', validateRequest(addDocketSchema), async (req, res) => {
  try {
    const { docketId, boxId } = req.body;
    const userId = (req as any).user.id;
    
    await storageService.addDocketToBox(docketId, boxId, userId);
    
    res.json({
      success: true,
      message: 'Docket added to storage box successfully'
    });
  } catch (error) {
    logger.error('Error adding docket to box:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add docket to box'
    });
  }
});

// Get available boxes
router.get('/boxes/available', async (req, res) => {
  try {
    const capacity = parseInt(req.query.capacity as string) || 50;
    const boxes = await storageService.getAvailableBoxes(capacity);
    
    res.json({
      success: true,
      data: boxes
    });
  } catch (error) {
    logger.error('Error fetching available boxes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch available boxes' 
    });
  }
});

// Get box utilization
router.get('/boxes/utilization', async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
    const utilization = await storageService.getBoxUtilization(clientId);
    
    res.json({
      success: true,
      data: utilization
    });
  } catch (error) {
    logger.error('Error fetching box utilization:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch box utilization' 
    });
  }
});

// =====================================================
// RETRIEVAL REQUESTS
// =====================================================

// Create retrieval request
router.post('/requests/retrieval', validateRequest(retrievalRequestSchema), async (req, res) => {
  try {
    const { clientId, docketIds, urgency } = req.body;
    const userId = (req as any).user.id;
    
    const request = await storageService.createRetrievalRequest(
      clientId, 
      docketIds, 
      urgency, 
      userId
    );
    
    res.status(201).json({
      success: true,
      data: request,
      message: urgency === 'urgent' 
        ? 'Urgent retrieval request created - will be processed within 30 minutes'
        : 'Retrieval request created - will be processed within 2 hours'
    });
  } catch (error) {
    logger.error('Error creating retrieval request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create retrieval request' 
    });
  }
});

// Complete retrieval request
router.put('/requests/:requestId/complete', async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const userId = (req as any).user.id;
    
    await storageService.completeRetrieval(requestId, userId);
    
    res.json({
      success: true,
      message: 'Retrieval request completed successfully'
    });
  } catch (error) {
    logger.error('Error completing retrieval:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete retrieval' 
    });
  }
});

// =====================================================
// BILLING
// =====================================================

// Generate monthly invoice
router.post('/billing/generate-invoice', async (req, res) => {
  try {
    const { clientId, billingMonth } = req.body;
    const invoice = await storageService.generateMonthlyInvoice(
      clientId, 
      new Date(billingMonth)
    );
    
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    logger.error('Error generating invoice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate invoice' 
    });
  }
});

// =====================================================
// ANALYTICS
// =====================================================

// Get storage analytics
router.get('/analytics', async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
    const analytics = await storageService.getStorageAnalytics(clientId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching storage analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch storage analytics' 
    });
  }
});

// =====================================================
// DASHBOARD DATA
// =====================================================

// Get storage dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
    
    // Get multiple metrics in parallel
    const [analytics, utilization, availableBoxes] = await Promise.all([
      storageService.getStorageAnalytics(clientId),
      storageService.getBoxUtilization(clientId),
      storageService.getAvailableBoxes(10)
    ]);
    
    res.json({
      success: true,
      data: {
        summary: analytics,
        boxUtilization: utilization.slice(0, 10), // Top 10
        availableCapacity: availableBoxes.length,
        metrics: {
          totalRevenue: analytics.monthly_revenue || 0,
          averageUtilization: analytics.avg_utilization || 0,
          activeRequests: analytics.monthly_requests || 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data' 
    });
  }
});

export default router;