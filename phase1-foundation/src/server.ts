import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './utils/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import objectsRoutes from './routes/objects';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length ? req.query : undefined,
    user: req.headers.authorization ? '[authenticated]' : '[anonymous]'
  });
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Phase 1 Foundation Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/objects', objectsRoutes);

// API information endpoint
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: 'RFID Universal Object Tracking System - Phase 1 Foundation API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'User login',
        'POST /api/auth/register': 'User registration',
        'GET /api/auth/profile': 'Get user profile (authenticated)',
        'PUT /api/auth/profile': 'Update user profile (authenticated)'
      },
      objects: {
        'GET /api/objects': 'List all objects with filtering and pagination',
        'GET /api/objects/:id': 'Get specific object by ID',
        'POST /api/objects': 'Create new object (technician+ required)',
        'PUT /api/objects/:id': 'Update object (technician+ required)',
        'DELETE /api/objects/:id': 'Archive object (technician+ required)',
        'GET /api/objects/:id/history': 'Get object audit history'
      }
    },
    supportedObjectTypes: ['docket', 'evidence', 'equipment', 'file', 'tool'],
    roles: ['admin', 'supervisor', 'technician', 'viewer']
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`
🚀 Phase 1 Foundation Server Started Successfully!

📍 Server: http://localhost:${PORT}
📍 Health Check: http://localhost:${PORT}/health
📍 API Info: http://localhost:${PORT}/api

🎯 Features Available:
  ✅ JWT Authentication
  ✅ Universal Object Management (dockets, evidence, equipment, files, tools)
  ✅ Role-based Access Control
  ✅ Complete Audit Trail
  ✅ PostgreSQL Database with Full Schema
  ✅ TypeScript + Express Framework
  
🔐 Default Admin User:
  Email: admin@dockettrack.gov
  Password: admin123 (CHANGE IMMEDIATELY!)

📋 Next Steps:
  1. Change default admin password
  2. Create additional users via /api/auth/register
  3. Test object creation via /api/objects
  4. Begin Phase 2: React Frontend Development

Environment: ${process.env.NODE_ENV || 'development'}
Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();