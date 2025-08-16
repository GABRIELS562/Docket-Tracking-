import { Router, Request, Response } from 'express';
import ImportService from '../services/ImportService';
import { upload } from '../server';
import { logger } from '../utils/logger';

const router = Router();

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { originalname, path: filePath, size } = req.file;
    
    const jobId = await ImportService.createImportJob(
      originalname,
      filePath,
      size,
      1
    );

    ImportService.processFile(jobId, filePath).catch(error => {
      logger.error(`Background processing failed for job ${jobId}:`, error);
    });

    res.json({
      success: true,
      data: {
        jobId,
        message: 'File uploaded successfully. Processing started.',
        filename: originalname,
        size
      }
    });

  } catch (error: any) {
    logger.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await ImportService['constructor'].prototype.constructor.query(
      `SELECT j.*, 
              (SELECT COUNT(*) FROM import_errors WHERE job_id = j.id) as error_count
       FROM import_jobs j 
       ORDER BY j.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await ImportService['constructor'].prototype.constructor.query(
      'SELECT COUNT(*) as total FROM import_jobs'
    );

    res.json({
      success: true,
      data: {
        jobs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      }
    });

  } catch (error: any) {
    logger.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve jobs'
    });
  }
});

router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    
    const job = await ImportService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });

  } catch (error: any) {
    logger.error('Get job error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve job'
    });
  }
});

router.get('/jobs/:jobId/errors', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const limit = parseInt(req.query.limit as string) || 100;
    
    const errors = await ImportService.getJobErrors(jobId, limit);

    res.json({
      success: true,
      data: {
        errors,
        count: errors.length
      }
    });

  } catch (error: any) {
    logger.error('Get job errors error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve errors'
    });
  }
});

router.post('/jobs/:jobId/pause', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    
    await ImportService.pauseJob(jobId);

    res.json({
      success: true,
      message: 'Job paused successfully'
    });

  } catch (error: any) {
    logger.error('Pause job error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pause job'
    });
  }
});

router.post('/jobs/:jobId/resume', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    
    await ImportService.resumeJob(jobId);

    res.json({
      success: true,
      message: 'Job resumed successfully'
    });

  } catch (error: any) {
    logger.error('Resume job error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resume job'
    });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { DatabaseService } = await import('../services/DatabaseService');
    const stats = await DatabaseService.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve stats'
    });
  }
});

router.get('/download-template', (req: Request, res: Response) => {
  const template = `object_code,name,description,object_type,category,priority_level,status,rfid_tag_id,location,assigned_to
DOC-2025-001,Sample Document 1,Description of document 1,docket,legal,normal,active,RFID-001,STOR-001,EMP-001
DOC-2025-002,Sample Document 2,Description of document 2,evidence,forensic,high,active,RFID-002,LAB-001,EMP-002
DOC-2025-003,Sample Document 3,Description of document 3,equipment,technical,low,active,RFID-003,STOR-002,EMP-001`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="import-template.csv"');
  res.send(template);
});

export default router;