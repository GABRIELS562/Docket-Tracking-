import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import { ImportService } from './services/ImportService';
import { DatabaseService } from './services/DatabaseService';
import { logger } from './utils/logger';
import importRoutes from './routes/importRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3002;
const WS_PORT = process.env.WS_PORT || 3003;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'csv,xlsx,xls').split(',');
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '500') * 1024 * 1024
  }
});

export { upload, io };

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Phase 3 - Bulk Import Service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/import', importRoutes);

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('subscribe-import', (jobId: number) => {
    socket.join(`import-${jobId}`);
    logger.info(`Client ${socket.id} subscribed to import job ${jobId}`);
  });
  
  socket.on('unsubscribe-import', (jobId: number) => {
    socket.leave(`import-${jobId}`);
    logger.info(`Client ${socket.id} unsubscribed from import job ${jobId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

async function startServer() {
  try {
    await DatabaseService.initialize();
    logger.info('✅ Database initialized');
    
    await DatabaseService.runMigrations();
    logger.info('✅ Migrations completed');
    
    app.listen(PORT, () => {
      logger.info(`🚀 Import service running on port ${PORT}`);
    });
    
    httpServer.listen(WS_PORT, () => {
      logger.info(`📡 WebSocket server running on port ${WS_PORT}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await DatabaseService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await DatabaseService.close();
  process.exit(0);
});

startServer();