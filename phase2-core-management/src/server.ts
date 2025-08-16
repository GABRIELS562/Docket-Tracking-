import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import winston from 'winston';
import path from 'path';

// Routes
import objectRoutes from './routes/objects';
import personnelRoutes from './routes/personnel';
import locationRoutes from './routes/locations';
import rfidRoutes from './routes/rfid';
import searchRoutes from './routes/search';
import analyticsRoutes from './routes/analytics';
import authRoutes from './routes/auth';

// Middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Services
import { DatabaseService } from './services/DatabaseService';
import { CacheService } from './services/CacheService';
import { RfidService } from './services/RfidService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_DIR || './logs', 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(process.env.LOG_DIR || './logs', 'combined.log') 
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    phase: 'Phase 2: Core Object Management',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/objects', authMiddleware, objectRoutes);
app.use('/api/personnel', authMiddleware, personnelRoutes);
app.use('/api/locations', authMiddleware, locationRoutes);
app.use('/api/rfid', authMiddleware, rfidRoutes);
app.use('/api/search', authMiddleware, searchRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:rfid', (data) => {
    socket.join(`rfid:${data.locationId || 'all'}`);
    logger.info(`Client ${socket.id} subscribed to RFID events`);
  });

  socket.on('subscribe:objects', (data) => {
    socket.join(`objects:${data.type || 'all'}`);
    logger.info(`Client ${socket.id} subscribed to object updates`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Initialize database
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    logger.info('Database service initialized');

    // Initialize cache
    const cacheService = CacheService.getInstance();
    await cacheService.connect();
    logger.info('Cache service initialized');

    // Initialize RFID service
    const rfidService = RfidService.getInstance(io);
    await rfidService.initialize();
    logger.info('RFID service initialized');

    // Run migrations
    await dbService.runMigrations();
    logger.info('Database migrations completed');

  } catch (error) {
    logger.error('Service initialization failed:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3002;

initializeServices().then(() => {
  httpServer.listen(PORT, () => {
    logger.info(`Phase 2 Core Management Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`RFID Mode: ${process.env.RFID_SIMULATION_MODE === 'true' ? 'Simulation' : 'Live'}`);
  });
}).catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, io, logger };