"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
// Load environment variables
dotenv_1.default.config();
// Import all route modules
const auth_1 = __importDefault(require("./routes/auth"));
const objects_1 = __importDefault(require("./routes/objects"));
const personnel_1 = __importDefault(require("./routes/personnel"));
const locations_1 = __importDefault(require("./routes/locations"));
const rfid_1 = __importDefault(require("./routes/rfid"));
const import_1 = __importDefault(require("./routes/import"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const search_1 = __importDefault(require("./routes/search"));
// Import middleware
const auth_2 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
// Import services
const DatabaseService_1 = require("./services/DatabaseService");
const CacheService_1 = require("./services/CacheService");
const RfidService_1 = require("./services/RfidService");
const ImportService_1 = require("./services/ImportService");
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
        credentials: true
    }
});
exports.io = io;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Request logging
app.use((req, _res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        ip: req.ip
    });
    next();
});
// Health check endpoint
app.get('/health', async (_req, res) => {
    const dbService = DatabaseService_1.DatabaseService.getInstance();
    const cacheService = CacheService_1.CacheService.getInstance();
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
    }
    catch (error) {
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
app.use('/api/auth', auth_1.default);
// Protected routes
app.use('/api/objects', auth_2.authMiddleware, objects_1.default);
app.use('/api/personnel', auth_2.authMiddleware, personnel_1.default);
app.use('/api/locations', auth_2.authMiddleware, locations_1.default);
app.use('/api/rfid', auth_2.authMiddleware, rfid_1.default);
app.use('/api/import', auth_2.authMiddleware, import_1.default);
app.use('/api/analytics', auth_2.authMiddleware, analytics_1.default);
app.use('/api/search', auth_2.authMiddleware, search_1.default);
// WebSocket connection handling
io.on('connection', (socket) => {
    logger_1.logger.info(`WebSocket client connected: ${socket.id}`);
    // Join rooms based on subscription
    socket.on('subscribe:rfid', (data) => {
        const room = `rfid:${data.locationId || 'all'}`;
        socket.join(room);
        logger_1.logger.info(`Client ${socket.id} subscribed to ${room}`);
    });
    socket.on('subscribe:objects', (data) => {
        const room = `objects:${data.type || 'all'}`;
        socket.join(room);
        logger_1.logger.info(`Client ${socket.id} subscribed to ${room}`);
    });
    socket.on('subscribe:imports', (jobId) => {
        socket.join(`import:${jobId}`);
        logger_1.logger.info(`Client ${socket.id} subscribed to import job ${jobId}`);
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
});
// Error handling
app.use(errorHandler_1.errorHandler);
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
        logger_1.logger.info('Initializing services...');
        // Initialize database
        const dbService = DatabaseService_1.DatabaseService.getInstance();
        await dbService.initialize();
        logger_1.logger.info('✅ Database service initialized');
        // Run migrations
        await dbService.runMigrations();
        logger_1.logger.info('✅ Database migrations completed');
        // Initialize cache
        const cacheService = CacheService_1.CacheService.getInstance();
        await cacheService.connect();
        logger_1.logger.info('✅ Cache service initialized');
        // Initialize RFID service
        const rfidService = RfidService_1.RfidService.getInstance(io);
        await rfidService.initialize();
        logger_1.logger.info('✅ RFID service initialized');
        // Initialize import service
        const importService = ImportService_1.ImportService.getInstance(io);
        await importService.initialize();
        logger_1.logger.info('✅ Import service initialized');
        logger_1.logger.info('✅ All services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Service initialization failed:', error);
        process.exit(1);
    }
}
// Start server
const PORT = process.env.PORT || 3000;
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
            logger_1.logger.info(`Server started on port ${PORT}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
    // Cleanup services
    const dbService = DatabaseService_1.DatabaseService.getInstance();
    await dbService.close();
    const cacheService = CacheService_1.CacheService.getInstance();
    await cacheService.disconnect();
    const rfidService = RfidService_1.RfidService.getInstance();
    await rfidService.shutdown();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down...');
    process.exit(0);
});
// Start the server
startServer();
//# sourceMappingURL=server.js.map