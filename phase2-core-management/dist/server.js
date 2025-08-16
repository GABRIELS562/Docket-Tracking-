"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Routes
const objects_1 = __importDefault(require("./routes/objects"));
const personnel_1 = __importDefault(require("./routes/personnel"));
const locations_1 = __importDefault(require("./routes/locations"));
const rfid_1 = __importDefault(require("./routes/rfid"));
const search_1 = __importDefault(require("./routes/search"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const auth_1 = __importDefault(require("./routes/auth"));
// Middleware
const auth_2 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
// Services
const DatabaseService_1 = require("./services/DatabaseService");
const CacheService_1 = require("./services/CacheService");
const RfidService_1 = require("./services/RfidService");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    }
});
exports.io = io;
// Logger setup
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple()
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(process.env.LOG_DIR || './logs', 'error.log'),
            level: 'error'
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(process.env.LOG_DIR || './logs', 'combined.log')
        })
    ]
});
exports.logger = logger;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
app.use('/api/auth', auth_1.default);
app.use('/api/objects', auth_2.authMiddleware, objects_1.default);
app.use('/api/personnel', auth_2.authMiddleware, personnel_1.default);
app.use('/api/locations', auth_2.authMiddleware, locations_1.default);
app.use('/api/rfid', auth_2.authMiddleware, rfid_1.default);
app.use('/api/search', auth_2.authMiddleware, search_1.default);
app.use('/api/analytics', auth_2.authMiddleware, analytics_1.default);
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
app.use(errorHandler_1.errorHandler);
// Initialize services
async function initializeServices() {
    try {
        // Initialize database
        const dbService = DatabaseService_1.DatabaseService.getInstance();
        await dbService.initialize();
        logger.info('Database service initialized');
        // Initialize cache
        const cacheService = CacheService_1.CacheService.getInstance();
        await cacheService.connect();
        logger.info('Cache service initialized');
        // Initialize RFID service
        const rfidService = RfidService_1.RfidService.getInstance(io);
        await rfidService.initialize();
        logger.info('RFID service initialized');
        // Run migrations
        await dbService.runMigrations();
        logger.info('Database migrations completed');
    }
    catch (error) {
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
//# sourceMappingURL=server.js.map