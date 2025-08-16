import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { DatabaseService } from './services/DatabaseService';
import ZebraReaderService from './services/ZebraReaderService';
import RfidEventProcessor from './services/RfidEventProcessor';
import RfidSimulator from './simulators/RfidSimulator';
import rfidRoutes from './routes/rfidRoutes';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3004;
const WS_PORT = process.env.WS_PORT || 3005;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Phase 5 - RFID Integration Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/rfid', rfidRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  
  socket.on('subscribe-reader', (readerId: string) => {
    socket.join(`reader-${readerId}`);
    logger.debug(`Client ${socket.id} subscribed to reader ${readerId}`);
  });
  
  socket.on('subscribe-events', () => {
    socket.join('events');
    logger.debug(`Client ${socket.id} subscribed to events`);
  });
  
  socket.on('subscribe-alerts', () => {
    socket.join('alerts');
    logger.debug(`Client ${socket.id} subscribed to alerts`);
  });
  
  socket.on('subscribe-simulation', () => {
    socket.join('simulation');
    logger.debug(`Client ${socket.id} subscribed to simulation`);
  });
  
  socket.on('unsubscribe-reader', (readerId: string) => {
    socket.leave(`reader-${readerId}`);
    logger.debug(`Client ${socket.id} unsubscribed from reader ${readerId}`);
  });
  
  socket.on('unsubscribe-events', () => {
    socket.leave('events');
    logger.debug(`Client ${socket.id} unsubscribed from events`);
  });
  
  socket.on('unsubscribe-alerts', () => {
    socket.leave('alerts');
    logger.debug(`Client ${socket.id} unsubscribed from alerts`);
  });
  
  socket.on('unsubscribe-simulation', () => {
    socket.leave('simulation');
    logger.debug(`Client ${socket.id} unsubscribed from simulation`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Export io for use by other services
export { io };

// Setup event forwarding to WebSocket clients
function setupEventForwarding() {
  // RFID Event Processor events
  RfidEventProcessor.on('event_queued', (data) => {
    io.to('events').emit('event_queued', data);
  });

  RfidEventProcessor.on('batch_processed', (data) => {
    io.to('events').emit('batch_processed', data);
  });

  RfidEventProcessor.on('object_moved', (data) => {
    io.to('events').emit('object_moved', data);
  });

  RfidEventProcessor.on('collision_detected', (data) => {
    io.to('events').emit('collision_detected', data);
    io.to('alerts').emit('alert_created', {
      type: 'collision',
      data
    });
  });

  RfidEventProcessor.on('alert_created', (data) => {
    io.to('alerts').emit('alert_created', data);
  });

  // Zebra Reader Service events
  ZebraReaderService.on('reader_connected', (data) => {
    io.to(`reader-${data.readerId}`).emit('reader_connected', data);
    io.to('events').emit('reader_status_changed', {
      readerId: data.readerId,
      status: 'connected'
    });
  });

  ZebraReaderService.on('reader_disconnected', (data) => {
    io.to(`reader-${data.readerId}`).emit('reader_disconnected', data);
    io.to('events').emit('reader_status_changed', {
      readerId: data.readerId,
      status: 'disconnected'
    });
  });

  ZebraReaderService.on('tag_read', (data) => {
    io.to(`reader-${data.readerId}`).emit('tag_read', data);
    io.to('events').emit('tag_read', data);
  });

  ZebraReaderService.on('reader_health_updated', (data) => {
    io.to(`reader-${data.readerId}`).emit('health_updated', data);
  });

  ZebraReaderService.on('connection_status_changed', (data) => {
    io.to(`reader-${data.readerId}`).emit('connection_status_changed', data);
  });

  // RFID Simulator events
  RfidSimulator.on('simulation_started', (data) => {
    io.to('simulation').emit('simulation_started', data);
  });

  RfidSimulator.on('simulation_stopped', (data) => {
    io.to('simulation').emit('simulation_stopped', data);
  });

  RfidSimulator.on('tag_read', (data) => {
    io.to('simulation').emit('simulated_tag_read', data);
  });

  RfidSimulator.on('tag_moved', (data) => {
    io.to('simulation').emit('simulated_tag_moved', data);
  });

  RfidSimulator.on('collision_simulated', (data) => {
    io.to('simulation').emit('simulated_collision', data);
  });

  RfidSimulator.on('error_simulated', (data) => {
    io.to('simulation').emit('simulated_error', data);
  });

  RfidSimulator.on('reader_disconnected', (data) => {
    io.to('simulation').emit('simulated_reader_disconnected', data);
  });

  RfidSimulator.on('reader_reconnected', (data) => {
    io.to('simulation').emit('simulated_reader_reconnected', data);
  });

  RfidSimulator.on('config_updated', (data) => {
    io.to('simulation').emit('simulation_config_updated', data);
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown handling
async function gracefulShutdown() {
  logger.info('🛑 Graceful shutdown initiated');
  
  try {
    await RfidSimulator.stopSimulation();
    await ZebraReaderService.shutdown();
    await DatabaseService.close();
    
    httpServer.close(() => {
      logger.info('✅ HTTP server closed');
    });
    
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Server startup
async function startServer() {
  try {
    // Initialize database
    await DatabaseService.initialize();
    logger.info('✅ Database initialized');
    
    // Run migrations
    await DatabaseService.runMigrations();
    logger.info('✅ Migrations completed');
    
    // Initialize services based on configuration
    if (process.env.RFID_MODE === 'simulation') {
      await RfidSimulator.initialize();
      await RfidSimulator.startSimulation();
      logger.info('✅ RFID Simulator initialized and started');
    } else {
      await ZebraReaderService.initialize();
      logger.info('✅ Zebra Reader Service initialized');
    }
    
    // Setup event forwarding
    setupEventForwarding();
    logger.info('✅ Event forwarding configured');
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 RFID Integration service running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API endpoint: http://localhost:${PORT}/api/rfid`);
      logger.info(`🎯 Mode: ${process.env.RFID_MODE || 'hardware'}`);
    });
    
    // Start WebSocket server
    httpServer.listen(WS_PORT, () => {
      logger.info(`📡 WebSocket server running on port ${WS_PORT}`);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Performance monitoring
setInterval(async () => {
  try {
    const stats = RfidEventProcessor.getStats();
    if (stats.queueSize > 1000) {
      logger.warn('High event queue size detected', { queueSize: stats.queueSize });
    }
    
    if (stats.isProcessing && stats.processingQueueSize > 10) {
      logger.warn('High processing queue size detected', { 
        processingQueueSize: stats.processingQueueSize 
      });
    }
  } catch (error) {
    logger.error('Performance monitoring error:', error);
  }
}, 60000); // Check every minute

startServer();

export default app;