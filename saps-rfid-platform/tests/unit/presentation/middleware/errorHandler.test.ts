import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';

import { errorHandler } from '@presentation/http/middleware/errorHandler';
import { DomainError } from '@shared/errors/DomainError';
import { NotFoundError } from '@shared/errors/NotFoundError';
import { ValidationError } from '@shared/errors/ValidationError';
import type { ILogger } from '@application/interfaces/ILogger';

describe('errorHandler middleware', () => {
  let app: Express;
  let mockLogger: jest.Mocked<ILogger>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    app = express();
    app.use(express.json());

    // Add request ID header for testing
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = 'test-request-id-123';
      next();
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('ValidationError handling', () => {
    beforeEach(() => {
      app.get('/test-validation', (_req: Request, _res: Response, next: NextFunction) => {
        const error = new ValidationError('Validation failed', [
          { field: 'email', message: 'Invalid email format' },
          { field: 'name', message: 'Name is required' },
        ]);
        next(error);
      });
      app.use(errorHandler(mockLogger));
    });

    it('should return 400 status for ValidationError', async () => {
      const response = await request(app).get('/test-validation');

      expect(response.status).toBe(400);
    });

    it('should return correct error structure for ValidationError', async () => {
      const response = await request(app).get('/test-validation');

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'name', message: 'Name is required' },
          ],
        },
      });
    });

    it('should include meta with timestamp and requestId', async () => {
      const response = await request(app).get('/test-validation');

      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.requestId).toBe('test-request-id-123');
      expect(response.body.meta.timestamp).toBeDefined();
      expect(() => new Date(response.body.meta.timestamp)).not.toThrow();
    });

    it('should log error with full context', async () => {
      await request(app).get('/test-validation');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          error: 'Validation failed',
          path: '/test-validation',
          method: 'GET',
          requestId: 'test-request-id-123',
        })
      );
    });
  });

  describe('NotFoundError handling', () => {
    beforeEach(() => {
      app.get('/test-not-found', (_req: Request, _res: Response, next: NextFunction) => {
        const error = new NotFoundError('Item with ID item-123 not found');
        next(error);
      });
      app.use(errorHandler(mockLogger));
    });

    it('should return 404 status for NotFoundError', async () => {
      const response = await request(app).get('/test-not-found');

      expect(response.status).toBe(404);
    });

    it('should return correct error structure for NotFoundError', async () => {
      const response = await request(app).get('/test-not-found');

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Item with ID item-123 not found',
        },
      });
    });

    it('should not include details field for NotFoundError', async () => {
      const response = await request(app).get('/test-not-found');

      expect(response.body.error.details).toBeUndefined();
    });
  });

  describe('DomainError handling', () => {
    beforeEach(() => {
      app.get('/test-domain', (_req: Request, _res: Response, next: NextFunction) => {
        const error = new DomainError('Cannot archive disposed item', 'ITEM_ALREADY_DISPOSED');
        next(error);
      });
      app.use(errorHandler(mockLogger));
    });

    it('should return 400 status for DomainError', async () => {
      const response = await request(app).get('/test-domain');

      expect(response.status).toBe(400);
    });

    it('should return correct error structure for DomainError with code', async () => {
      const response = await request(app).get('/test-domain');

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ITEM_ALREADY_DISPOSED',
          message: 'Cannot archive disposed item',
        },
      });
    });

    it('should use DOMAIN_ERROR as default code when not provided', async () => {
      const appWithNoCode = express();
      appWithNoCode.use(express.json());
      appWithNoCode.use((req: Request, _res: Response, next: NextFunction) => {
        req.headers['x-request-id'] = 'test-request-id-123';
        next();
      });
      appWithNoCode.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
        const error = new DomainError('Business rule violation');
        next(error);
      });
      appWithNoCode.use(errorHandler(mockLogger));

      const response = await request(appWithNoCode).get('/test');

      expect(response.body.error.code).toBe('DOMAIN_ERROR');
    });
  });

  describe('Generic Error handling (500)', () => {
    beforeEach(() => {
      app.get('/test-generic', (_req: Request, _res: Response, next: NextFunction) => {
        const error = new Error('Database connection failed');
        next(error);
      });
    });

    describe('in development environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        app.use(errorHandler(mockLogger));
      });

      it('should return 500 status for generic Error', async () => {
        const response = await request(app).get('/test-generic');

        expect(response.status).toBe(500);
      });

      it('should expose error message in non-production', async () => {
        const response = await request(app).get('/test-generic');

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          },
        });
      });

      it('should include stack trace in non-production', async () => {
        const response = await request(app).get('/test-generic');

        expect(response.body.error.stack).toBeDefined();
        expect(response.body.error.stack).toContain('Error: Database connection failed');
      });
    });

    describe('in production environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        app.use(errorHandler(mockLogger));
      });

      it('should hide error details in production', async () => {
        const response = await request(app).get('/test-generic');

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        });
      });

      it('should not include stack trace in production', async () => {
        const response = await request(app).get('/test-generic');

        expect(response.body.error.stack).toBeUndefined();
      });
    });
  });

  describe('Request body logging', () => {
    beforeEach(() => {
      app.post('/test-body', (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error('Test error'));
      });
      app.use(errorHandler(mockLogger));
    });

    it('should log request body in error context', async () => {
      const requestBody = { username: 'testuser', action: 'create' };

      await request(app).post('/test-body').send(requestBody);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          body: requestBody,
        })
      );
    });
  });

  describe('Error stack logging', () => {
    beforeEach(() => {
      app.get('/test-stack', (_req: Request, _res: Response, next: NextFunction) => {
        const error = new Error('Test error with stack');
        next(error);
      });
      app.use(errorHandler(mockLogger));
    });

    it('should log error stack trace', async () => {
      await request(app).get('/test-stack');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          stack: expect.stringContaining('Error: Test error with stack'),
        })
      );
    });
  });

  describe('Missing request ID', () => {
    it('should handle missing request ID gracefully', async () => {
      const appNoRequestId = express();
      appNoRequestId.use(express.json());
      appNoRequestId.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error('Test error'));
      });
      appNoRequestId.use(errorHandler(mockLogger));

      const response = await request(appNoRequestId).get('/test');

      expect(response.body.meta.requestId).toBeUndefined();
    });
  });
});
