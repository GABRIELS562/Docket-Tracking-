/**
 * AI Classification API Routes
 * Endpoints for AI-powered document classification
 */

import { Router, Request, Response } from 'express';
import { query } from '../database/connection';
import { authMiddleware } from '../middleware/auth';
import { auditMiddleware } from '../middleware/auditMiddleware';
import AIClassificationService from '../services/AIClassificationService';
import { logger } from '../utils/logger';

const router = Router();
const aiService = AIClassificationService.getInstance();

// Apply authentication to all AI routes
router.use(authMiddleware);

/**
 * Classify a single document
 */
router.post('/classify/:documentId', auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    // Get document details
    const docResult = await query(`
      SELECT id, docket_code as title, description, category
      FROM dockets
      WHERE id = $1
    `, [documentId]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const document = docResult.rows[0];
    
    // Classify document
    const classification = await aiService.classifyDocument(document);
    
    res.json({
      success: true,
      data: classification
    });
  } catch (error) {
    logger.error('Classification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Classification failed'
    });
  }
});

/**
 * Batch classify multiple documents
 */
router.post('/classify/batch', auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentIds, autoApply } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({
        success: false,
        error: 'Document IDs array required'
      });
    }
    
    // Get documents
    const docsResult = await query(`
      SELECT id, docket_code as title, description, category
      FROM dockets
      WHERE id = ANY($1)
    `, [documentIds]);
    
    // Classify documents
    const classifications = await aiService.classifyBatch(docsResult.rows);
    
    // Auto-apply high confidence classifications if requested
    if (autoApply) {
      for (const classification of classifications) {
        if (classification.confidence > 0.8 && !classification.isAnomaly) {
          await query(`
            UPDATE dockets
            SET 
              category = $1,
              ai_tags = $2,
              ai_classified = TRUE,
              ai_confidence = $3
            WHERE id = $4
          `, [
            classification.predictedCategory,
            JSON.stringify(classification.suggestedTags),
            classification.confidence,
            classification.documentId
          ]);
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        total: classifications.length,
        classified: classifications.filter(c => c.confidence > 0.5).length,
        anomalies: classifications.filter(c => c.isAnomaly).length,
        results: classifications
      }
    });
  } catch (error) {
    logger.error('Batch classification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch classification failed'
    });
  }
});

/**
 * Get AI suggestions for a document
 */
router.get('/suggestions/:documentId', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    const suggestions = await aiService.getSuggestions(parseInt(documentId));
    
    if (!suggestions) {
      return res.status(404).json({
        success: false,
        error: 'No suggestions found'
      });
    }
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Failed to get suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

/**
 * Provide feedback on classification
 */
router.post('/feedback/:documentId', auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { correctCategory, correctTags, feedbackType, comments } = req.body;
    const userId = (req as any).user?.id;
    
    // Get latest classification
    const classResult = await query(`
      SELECT id FROM ai_classifications
      WHERE document_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [documentId]);
    
    // Store feedback
    await query(`
      INSERT INTO ai_feedback (
        document_id, classification_id, user_id,
        correct_category, correct_tags, feedback_type, comments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      documentId,
      classResult.rows[0]?.id,
      userId,
      correctCategory,
      JSON.stringify(correctTags),
      feedbackType || 'correction',
      comments
    ]);
    
    // Update AI service with feedback
    await aiService.provideFeedback(
      parseInt(documentId),
      correctCategory,
      correctTags
    );
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    logger.error('Failed to record feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback'
    });
  }
});

/**
 * Get documents requiring review
 */
router.get('/review/pending', async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await query(`
      SELECT 
        d.id,
        d.docket_code,
        d.title,
        d.category,
        ac.predicted_category,
        ac.confidence,
        ac.anomaly_score,
        ac.suggested_tags,
        ac.created_at as classified_at
      FROM dockets d
      JOIN ai_classifications ac ON d.id = ac.document_id
      WHERE d.requires_review = TRUE
        OR ac.confidence < 0.7
        OR ac.anomaly_score > 0.7
      ORDER BY ac.anomaly_score DESC, ac.confidence ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to get review queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get review queue'
    });
  }
});

/**
 * Train model with new data
 */
router.post('/train', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { useExistingData, trainingData } = req.body;
    const userId = (req as any).user?.id;
    
    // Check admin permission
    const userResult = await query(`
      SELECT is_admin FROM users WHERE id = $1
    `, [userId]);
    
    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin permission required'
      });
    }
    
    // Start training
    const metrics = await aiService.trainModel(trainingData);
    
    res.json({
      success: true,
      data: {
        message: 'Model training completed',
        metrics
      }
    });
  } catch (error) {
    logger.error('Model training failed:', error);
    res.status(500).json({
      success: false,
      error: 'Model training failed'
    });
  }
});

/**
 * Get AI performance metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await query(`
      SELECT 
        metric_date,
        accuracy_rate,
        avg_confidence,
        anomalies_detected,
        user_corrections,
        avg_processing_time_ms
      FROM ai_metrics
      WHERE metric_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY metric_date DESC
    `);
    
    // Get real-time stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_classifications,
        AVG(confidence) as avg_confidence,
        COUNT(CASE WHEN anomaly_score > 0.7 THEN 1 END) as anomalies_detected,
        AVG(processing_time_ms) as avg_processing_time
      FROM ai_classifications
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    `);
    
    res.json({
      success: true,
      data: {
        historical: result.rows,
        current: statsResult.rows[0]
      }
    });
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

/**
 * Get anomaly patterns
 */
router.get('/anomalies/patterns', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT * FROM ai_anomaly_patterns
      ORDER BY severity DESC, pattern_name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to get anomaly patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get patterns'
    });
  }
});

/**
 * Get detected anomalies
 */
router.get('/anomalies/detected', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    
    const result = await query(`
      SELECT 
        d.id,
        d.docket_code,
        d.title,
        ac.predicted_category,
        ac.confidence,
        ac.anomaly_score,
        ac.suggested_tags,
        ac.created_at,
        u.full_name as last_modified_by
      FROM ai_classifications ac
      JOIN dockets d ON ac.document_id = d.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE ac.anomaly_score > 0.7
      ORDER BY ac.created_at DESC
      LIMIT $1
    `, [limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to get anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get anomalies'
    });
  }
});

/**
 * Get tag suggestions
 */
router.get('/tags/suggest', async (req: Request, res: Response) => {
  try {
    const { q, category } = req.query;
    
    let sql = `
      SELECT tag, tag_type, usage_count
      FROM ai_tag_dictionary
      WHERE auto_suggest = TRUE
    `;
    
    const params: any[] = [];
    
    if (q) {
      sql += ` AND tag ILIKE $1`;
      params.push(`%${q}%`);
    }
    
    sql += ` ORDER BY usage_count DESC LIMIT 20`;
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to get tag suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

/**
 * Add training data
 */
router.post('/training/add', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentText, category, tags, source } = req.body;
    const userId = (req as any).user?.id;
    
    await query(`
      INSERT INTO ai_training_data (
        document_text, category, tags, source, created_by
      ) VALUES ($1, $2, $3, $4, $5)
    `, [documentText, category, JSON.stringify(tags), source || 'manual', userId]);
    
    res.json({
      success: true,
      message: 'Training data added successfully'
    });
  } catch (error) {
    logger.error('Failed to add training data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add training data'
    });
  }
});

/**
 * Export AI model
 */
router.get('/model/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    // Check admin permission
    const userResult = await query(`
      SELECT is_admin FROM users WHERE id = $1
    `, [userId]);
    
    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin permission required'
      });
    }
    
    const modelData = await aiService.exportModel();
    
    res.json({
      success: true,
      data: modelData
    });
  } catch (error) {
    logger.error('Failed to export model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export model'
    });
  }
});

/**
 * Import AI model
 */
router.post('/model/import', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { modelData } = req.body;
    const userId = (req as any).user?.id;
    
    // Check admin permission
    const userResult = await query(`
      SELECT is_admin FROM users WHERE id = $1
    `, [userId]);
    
    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin permission required'
      });
    }
    
    await aiService.importModel(modelData);
    
    res.json({
      success: true,
      message: 'Model imported successfully'
    });
  } catch (error) {
    logger.error('Failed to import model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import model'
    });
  }
});

export default router;