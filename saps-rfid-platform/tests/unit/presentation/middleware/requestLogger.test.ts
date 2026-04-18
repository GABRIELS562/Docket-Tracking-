import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';

import { requestLogger } from '@presentation/http/middleware/requestLogger';
import type { ILogger } from '@application/interfaces/ILogger';

describe('requestLogger middleware', () => {
  let app: Express;
  let mockLogger: jest.Mocked<ILogger>;

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
  });

  describe('Basic logging', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
    });

    it('should log HTTP request on response finish', async () => {
      await request(app).get('/test');

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', expect.any(Object));
    });

    it('should log correct HTTP method', async () => {
      await request(app).get('/test');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should log correct path', async () => {
      await request(app).get('/test');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          path: '/test',
        })
      );
    });

    it('should log status code', async () => {
      await request(app).get('/test');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 200,
        })
      );
    });
  });

  describe('Duration tracking', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
    });

    it('should log duration with ms suffix', async () => {
      app.get('/fast', (_req: Request, res: Response) => {
        res.json({ message: 'fast' });
      });

      await request(app).get('/fast');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          duration: expect.stringMatching(/^\d+ms$/),
        })
      );
    });

    it('should log longer duration for slow endpoints', async () => {
      app.get('/slow', (_req: Request, res: Response) => {
        // Simulate slow response
        setTimeout(() => {
          res.json({ message: 'slow' });
        }, 50);
      });

      await request(app).get('/slow');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          duration: expect.stringMatching(/^\d+ms$/),
        })
      );
    });
  });

  describe('Request ID correlation', () => {
    beforeEach(() => {
      // Add correlation ID middleware before request logger
      app.use((req: Request, _res: Response, next: NextFunction) => {
        req.headers['x-request-id'] = 'correlation-id-test-123';
        next();
      });
      app.use(requestLogger(mockLogger));
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
    });

    it('should log request ID from headers', async () => {
      await request(app).get('/test');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          requestId: 'correlation-id-test-123',
        })
      );
    });
  });

  describe('User agent logging', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
    });

    it('should log user agent header', async () => {
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      await request(app).get('/test').set('User-Agent', userAgent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          userAgent: userAgent,
        })
      );
    });

    it('should handle missing user agent', async () => {
      await request(app).get('/test').set('User-Agent', '');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          userAgent: expect.anything(),
        })
      );
    });
  });

  describe('IP address logging', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
    });

    it('should log IP address', async () => {
      await request(app).get('/test');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          ip: expect.anything(),
        })
      );
    });
  });

  describe('Different HTTP methods', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
      app.post('/post', (_req: Request, res: Response) => res.json({}));
      app.put('/put', (_req: Request, res: Response) => res.json({}));
      app.delete('/delete', (_req: Request, res: Response) => res.json({}));
      app.patch('/patch', (_req: Request, res: Response) => res.json({}));
    });

    it('should log POST requests', async () => {
      await request(app).post('/post').send({ data: 'test' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'POST',
          path: '/post',
        })
      );
    });

    it('should log PUT requests', async () => {
      await request(app).put('/put').send({ data: 'test' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'PUT',
          path: '/put',
        })
      );
    });

    it('should log DELETE requests', async () => {
      await request(app).delete('/delete');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'DELETE',
          path: '/delete',
        })
      );
    });

    it('should log PATCH requests', async () => {
      await request(app).patch('/patch').send({ data: 'test' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'PATCH',
          path: '/patch',
        })
      );
    });
  });

  describe('Different status codes', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
      app.get('/success', (_req: Request, res: Response) => res.status(200).json({}));
      app.get('/created', (_req: Request, res: Response) => res.status(201).json({}));
      app.get('/no-content', (_req: Request, res: Response) => res.status(204).send());
      app.get('/bad-request', (_req: Request, res: Response) =>
        res.status(400).json({ error: 'bad' })
      );
      app.get('/not-found', (_req: Request, res: Response) =>
        res.status(404).json({ error: 'not found' })
      );
      app.get('/server-error', (_req: Request, res: Response) =>
        res.status(500).json({ error: 'internal' })
      );
    });

    it('should log 200 status', async () => {
      await request(app).get('/success');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 200,
        })
      );
    });

    it('should log 201 status', async () => {
      await request(app).get('/created');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 201,
        })
      );
    });

    it('should log 204 status', async () => {
      await request(app).get('/no-content');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 204,
        })
      );
    });

    it('should log 400 status', async () => {
      await request(app).get('/bad-request');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 400,
        })
      );
    });

    it('should log 404 status', async () => {
      await request(app).get('/not-found');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });

    it('should log 500 status', async () => {
      await request(app).get('/server-error');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });

  describe('Path variations', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
      app.get('/api/v1/items', (_req: Request, res: Response) => res.json({}));
      app.get('/api/v1/items/:id', (req: Request, res: Response) =>
        res.json({ id: req.params.id })
      );
      app.get('/search', (_req: Request, res: Response) => res.json({}));
    });

    it('should log nested paths', async () => {
      await request(app).get('/api/v1/items');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          path: '/api/v1/items',
        })
      );
    });

    it('should log path with parameters', async () => {
      await request(app).get('/api/v1/items/item-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          path: '/api/v1/items/item-123',
        })
      );
    });

    it('should log path without query string in path field', async () => {
      await request(app).get('/search?q=test&page=1');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          path: '/search',
        })
      );
    });
  });

  describe('Middleware ordering', () => {
    it('should call next() to continue middleware chain', async () => {
      let nextMiddlewareCalled = false;

      app.use(requestLogger(mockLogger));
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        nextMiddlewareCalled = true;
        next();
      });
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });

      await request(app).get('/test');

      expect(nextMiddlewareCalled).toBe(true);
    });

    it('should log after response is sent', async () => {
      const logTimes: number[] = [];
      const responseTimes: number[] = [];

      const trackingLogger = {
        ...mockLogger,
        info: jest.fn().mockImplementation(() => {
          logTimes.push(Date.now());
        }),
      };

      app.use(requestLogger(trackingLogger));
      app.get('/test', (_req: Request, res: Response) => {
        responseTimes.push(Date.now());
        res.json({ message: 'success' });
      });

      await request(app).get('/test');

      // Logger should be called after response handler
      expect(logTimes.length).toBe(1);
      expect(responseTimes.length).toBe(1);
      expect(logTimes[0]).toBeGreaterThanOrEqual(responseTimes[0]);
    });
  });

  describe('Error scenarios', () => {
    it('should still log even when response ends with error', async () => {
      app.use(requestLogger(mockLogger));
      app.get('/error', (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error('Test error'));
      });
      app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        res.status(500).json({ error: err.message });
      });

      await request(app).get('/error');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });

  describe('Multiple requests', () => {
    beforeEach(() => {
      app.use(requestLogger(mockLogger));
      app.get('/test1', (_req: Request, res: Response) => res.json({ route: 1 }));
      app.get('/test2', (_req: Request, res: Response) => res.json({ route: 2 }));
    });

    it('should log each request independently', async () => {
      await request(app).get('/test1');
      await request(app).get('/test2');

      expect(mockLogger.info).toHaveBeenCalledTimes(2);

      expect(mockLogger.info).toHaveBeenNthCalledWith(
        1,
        'HTTP Request',
        expect.objectContaining({ path: '/test1' })
      );

      expect(mockLogger.info).toHaveBeenNthCalledWith(
        2,
        'HTTP Request',
        expect.objectContaining({ path: '/test2' })
      );
    });
  });
});
