/**
 * Presentation Layer - Exports
 *
 * HTTP Server and WebSocket server for the SAPS RFID Platform
 */

// HTTP Server
export { Server, ServerConfig } from './http/Server';

// WebSocket Server
export { SocketServer } from './websocket/SocketServer';

// Controllers
export { DocketController } from './http/controllers/DocketController';
export { ZoneController } from './http/controllers/ZoneController';
export { ReaderController } from './http/controllers/ReaderController';
export { HealthController } from './http/controllers/HealthController';

// Middleware
export { errorHandler } from './http/middleware/errorHandler';
export { correlationId } from './http/middleware/correlationId';
export { requestLogger } from './http/middleware/requestLogger';
export { rateLimiter, strictRateLimiter } from './http/middleware/rateLimiter';
export { validate, validateQuery, validateParams } from './http/middleware/requestValidator';

// Schemas
export * from './http/schemas/docket.schema';

// Error classes
export { DomainError } from '../shared/errors/DomainError';
export { ValidationError } from '../shared/errors/ValidationError';
export { NotFoundError } from '../shared/errors/NotFoundError';
