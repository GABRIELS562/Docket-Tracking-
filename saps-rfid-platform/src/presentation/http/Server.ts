import { Server as HttpServer } from 'http';

import compression from 'compression';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { injectable, inject } from 'tsyringe';

import { correlationId } from './middleware/correlationId';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { createRoutes } from './routes';
import { ILogger } from '../../application/interfaces/ILogger';

/**
 * HTTP Server - Express application setup
 *
 * Middleware Stack (in order):
 * 1. Helmet - Security headers
 * 2. CORS - Cross-origin resource sharing
 * 3. Compression - gzip compression for responses
 * 4. Body parsing - JSON and URL-encoded
 * 5. Correlation ID - Request tracking
 * 6. Morgan - HTTP request logging
 * 7. Rate limiting - DoS protection
 * 8. Custom request logger - Structured logging
 * 9. Routes - API endpoints
 * 10. Error handler - Global error handling
 *
 * Features:
 * - RESTful API design
 * - Comprehensive security headers
 * - Request correlation for tracing
 * - Rate limiting (100 req/min per IP)
 * - Structured JSON responses
 * - Graceful shutdown support
 */
@injectable()
export class Server {
  private app: Express;
  private httpServer: HttpServer | null = null;
  private port: number;

  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject('ServerConfig') private config: ServerConfig
  ) {
    this.app = express();
    this.port = config.port || 3000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Set up middleware
   */
  private setupMiddleware(): void {
    // Security headers with Helmet
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginEmbedderPolicy: false, // Allow embedding for WebSocket
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: this.config.corsOrigins || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining'],
        maxAge: 86400, // 24 hours
      })
    );

    // Compression
    this.app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6, // Balanced compression level
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Correlation ID for request tracing
    this.app.use(correlationId);

    // HTTP request logging with Morgan
    this.app.use(
      morgan('combined', {
        stream: {
          write: (message) => this.logger.info(message.trim()),
        },
        skip: (req) => req.path === '/health', // Skip health check logs
      })
    );

    // Rate limiting
    this.app.use(rateLimiter);

    // Custom structured request logger
    this.app.use(requestLogger(this.logger));
  }

  /**
   * Set up routes
   */
  private setupRoutes(): void {
    // Root endpoint - API information
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        name: 'RFID Inventory Platform API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api-docs',
        endpoints: {
          health: '/health',
          api: '/api',
          websocket: 'ws://[host]/socket.io',
        },
      });
    });

    // API routes (all prefixed with /api)
    this.app.use('/api', createRoutes());

    // 404 handler for unknown routes
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.path} not found`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
        },
      });
    });
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    // Global error handler (must be last)
    this.app.use(errorHandler(this.logger));
  }

  /**
   * Start HTTP server
   *
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    return await new Promise((resolve) => {
      this.httpServer = this.app.listen(this.port, () => {
        this.logger.info('HTTP Server started', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          corsOrigins: this.config.corsOrigins,
        });
        resolve();
      });

      // Handle server errors
      this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          this.logger.error(`Port ${this.port} is already in use`);
        } else {
          this.logger.error('Server error', { error });
        }
        process.exit(1);
      });
    });
  }

  /**
   * Stop HTTP server gracefully
   *
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    if (!this.httpServer) {
      return;
    }

    return await new Promise((resolve, reject) => {
      this.httpServer!.close((err) => {
        if (err) {
          this.logger.error('Error stopping server', { error: err });
          reject(err);
        } else {
          this.logger.info('HTTP Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get Express app instance (for testing)
   *
   * @returns Express application
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get HTTP server instance (for WebSocket attachment)
   *
   * @returns HTTP server or null if not started
   */
  getHttpServer(): HttpServer | null {
    return this.httpServer;
  }

  /**
   * Get server port number
   */
  getPort(): number {
    return this.port;
  }
}

/**
 * Server Configuration
 */
export interface ServerConfig {
  port: number;
  corsOrigins: string[];
}
