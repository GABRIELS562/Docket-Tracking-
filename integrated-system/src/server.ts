import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Import database connection
import { testConnection } from './database/connection';

// Import all route modules
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import auditRoutes from './routes/audit';
import analyticsAdvancedRoutes from './routes/analytics-advanced';
import objectRoutes from './routes/objects';
import personnelRoutes from './routes/personnel';
import locationRoutes from './routes/locations';
import rfidRoutes from './routes/rfid';
import storageRoutes from './routes/storage';
import storageDbRoutes from './routes/storage-db';
import storageExtendedRoutes from './routes/storage-extended';
import importRoutes from './routes/import';
import analyticsRoutes from './routes/analytics';
import searchRoutes from './routes/search';
import mobileRoutes from './routes/mobile';
import aiClassificationRoutes from './routes/ai-classification';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { auditMiddleware, auditLogin } from './middleware/auditMiddleware';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Import services
import { DatabaseService } from './services/DatabaseService';
import { CacheService } from './services/CacheService';
import { RfidService } from './services/RfidService';
import { ImportService } from './services/ImportService';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    ip: req.ip
  });
  next();
});

// Audit middleware for compliance logging
app.use(auditMiddleware);

// Health check endpoint
app.get('/health', async (_req, res) => {
  const dbService = DatabaseService.getInstance();
  const cacheService = CacheService.getInstance();
  
  try {
    const dbHealth = await dbService.checkHealth();
    const cacheHealth = await cacheService.checkHealth();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'connected' : 'disconnected',
        cache: cacheHealth ? 'connected' : 'disconnected',
        rfid: process.env.RFID_SIMULATION_MODE === 'true' ? 'simulation' : 'live'
      },
      version: '1.0.0',
      phase: 'Integrated System'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Info endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'RFID Docket Tracking System - Integrated API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      objects: '/api/objects',
      personnel: '/api/personnel',
      locations: '/api/locations',
      rfid: '/api/rfid',
      import: '/api/import',
      analytics: '/api/analytics',
      search: '/api/search'
    },
    documentation: '/api/docs',
    status: '/health'
  });
});

// Public routes
app.use('/api/auth', auditLogin, authRoutes);

// Protected routes
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/analytics', authMiddleware, analyticsAdvancedRoutes);
app.use('/api/objects', authMiddleware, objectRoutes);
app.use('/api/personnel', authMiddleware, personnelRoutes);
app.use('/api/locations', authMiddleware, locationRoutes);
app.use('/api/rfid', authMiddleware, rfidRoutes);
app.use('/api/storage', authMiddleware, storageRoutes);
app.use('/api/storage-db', authMiddleware, storageDbRoutes);
app.use('/api/storage-db', authMiddleware, storageExtendedRoutes);
app.use('/api/import', authMiddleware, importRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/search', authMiddleware, searchRoutes);
app.use('/api/mobile', authMiddleware, mobileRoutes);
app.use('/api/ai', authMiddleware, aiClassificationRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Join rooms based on subscription
  socket.on('subscribe:rfid', (data) => {
    const room = `rfid:${data.locationId || 'all'}`;
    socket.join(room);
    logger.info(`Client ${socket.id} subscribed to ${room}`);
  });

  socket.on('subscribe:objects', (data) => {
    const room = `objects:${data.type || 'all'}`;
    socket.join(room);
    logger.info(`Client ${socket.id} subscribed to ${room}`);
  });

  socket.on('subscribe:imports', (jobId) => {
    socket.join(`import:${jobId}`);
    logger.info(`Client ${socket.id} subscribed to import job ${jobId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing services...');

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    logger.info('✅ Database connection established');

    // Initialize database service (for legacy compatibility)
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    logger.info('✅ Database service initialized');

    // Initialize cache
    const cacheService = CacheService.getInstance();
    await cacheService.connect();
    logger.info('✅ Cache service initialized');

    // Initialize RFID service
    const rfidService = RfidService.getInstance(io);
    await rfidService.initialize();
    logger.info('✅ RFID service initialized');

    // Initialize import service
    const importService = ImportService.getInstance(io);
    await importService.initialize();
    logger.info('✅ Import service initialized');

    logger.info('✅ All services initialized successfully');
  } catch (error) {
    logger.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initializeServices();

    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🚀 RFID DOCKET TRACKING SYSTEM - INTEGRATED               ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Server Status: RUNNING                                       ║
║  Port: ${PORT}                                                    ║
║  Environment: ${process.env.NODE_ENV}                                   ║
║                                                                ║
║  API Endpoints:                                               ║
║  • Health Check: http://localhost:${PORT}/health                  ║
║  • API Info: http://localhost:${PORT}/api                         ║
║  • WebSocket: ws://localhost:${PORT}                              ║
║                                                                ║
║  Services:                                                    ║
║  • Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}        ║
║  • Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}                          ║
║  • RFID Mode: ${process.env.RFID_SIMULATION_MODE === 'true' ? 'Simulation' : 'Live Hardware'}                   ║
║                                                                ║
║  Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}               ║
║                                                                ║
║  Default Credentials:                                         ║
║  Email: admin@dockettrack.gov                                 ║
║  Password: admin123                                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
      `);
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Cleanup services
  const dbService = DatabaseService.getInstance();
  await dbService.close();
  
  const cacheService = CacheService.getInstance();
  await cacheService.disconnect();
  
  const rfidService = RfidService.getInstance();
  await rfidService.shutdown();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  process.exit(0);
});

// Start the server
startServer();

export { app, io, httpServer };