import express, { Express, Request, Response } from 'express';
import request from 'supertest';

import { correlationId } from '@presentation/http/middleware/correlationId';

describe('correlationId middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(correlationId);
    app.get('/test', (req: Request, res: Response) => {
      res.json({ requestId: req.headers['x-request-id'] });
    });
  });

  describe('ID generation', () => {
    it('should generate a UUID when no X-Request-ID header is provided', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      // Verify it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body.requestId).toMatch(uuidRegex);
    });

    it('should set X-Request-ID response header with generated UUID', async () => {
      const response = await request(app).get('/test');

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.headers['x-request-id']).toMatch(uuidRegex);
    });

    it('should generate unique IDs for different requests', async () => {
      const response1 = await request(app).get('/test');
      const response2 = await request(app).get('/test');

      expect(response1.body.requestId).not.toBe(response2.body.requestId);
    });
  });

  describe('Client-provided ID handling', () => {
    it('should use client-provided X-Request-ID when present', async () => {
      const clientRequestId = 'client-provided-request-id-abc123';

      const response = await request(app).get('/test').set('X-Request-ID', clientRequestId);

      expect(response.body.requestId).toBe(clientRequestId);
    });

    it('should echo client-provided ID in response header', async () => {
      const clientRequestId = 'client-provided-request-id-xyz789';

      const response = await request(app).get('/test').set('X-Request-ID', clientRequestId);

      expect(response.headers['x-request-id']).toBe(clientRequestId);
    });

    it('should preserve client ID even if lowercase header name is used', async () => {
      const clientRequestId = 'lowercase-header-request-id';

      const response = await request(app).get('/test').set('x-request-id', clientRequestId);

      expect(response.body.requestId).toBe(clientRequestId);
      expect(response.headers['x-request-id']).toBe(clientRequestId);
    });

    it('should not generate new ID when client provides one', async () => {
      const clientRequestId = 'my-custom-trace-id';

      const response = await request(app).get('/test').set('X-Request-ID', clientRequestId);

      // Should be exactly the client ID, not a UUID
      expect(response.body.requestId).toBe(clientRequestId);
      expect(response.body.requestId).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
    });
  });

  describe('Header persistence across middleware chain', () => {
    it('should make request ID available to subsequent middleware', async () => {
      const appWithChain = express();
      let capturedRequestId: string | undefined;

      appWithChain.use(correlationId);
      appWithChain.use((req: Request, _res: Response, next) => {
        capturedRequestId = req.headers['x-request-id'] as string;
        next();
      });
      appWithChain.get('/test', (_req: Request, res: Response) => {
        res.sendStatus(200);
      });

      await request(appWithChain).get('/test');

      expect(capturedRequestId).toBeDefined();
      // Should be a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(capturedRequestId).toMatch(uuidRegex);
    });

    it('should persist request ID through multiple middleware', async () => {
      const appWithMultiple = express();
      const capturedIds: string[] = [];

      appWithMultiple.use(correlationId);

      // First middleware
      appWithMultiple.use((req: Request, _res: Response, next) => {
        capturedIds.push(req.headers['x-request-id'] as string);
        next();
      });

      // Second middleware
      appWithMultiple.use((req: Request, _res: Response, next) => {
        capturedIds.push(req.headers['x-request-id'] as string);
        next();
      });

      appWithMultiple.get('/test', (_req: Request, res: Response) => {
        res.sendStatus(200);
      });

      await request(appWithMultiple).get('/test');

      // Both middleware should see the same request ID
      expect(capturedIds.length).toBe(2);
      expect(capturedIds[0]).toBe(capturedIds[1]);
    });

    it('should preserve client-provided ID through middleware chain', async () => {
      const appWithChain = express();
      const capturedIds: string[] = [];
      const clientRequestId = 'client-trace-id-12345';

      appWithChain.use(correlationId);
      appWithChain.use((req: Request, _res: Response, next) => {
        capturedIds.push(req.headers['x-request-id'] as string);
        next();
      });
      appWithChain.get('/test', (_req: Request, res: Response) => {
        res.sendStatus(200);
      });

      await request(appWithChain).get('/test').set('X-Request-ID', clientRequestId);

      expect(capturedIds[0]).toBe(clientRequestId);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty X-Request-ID header by generating new UUID', async () => {
      const response = await request(app).get('/test').set('X-Request-ID', '');

      // Empty string is falsy, so should generate new UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body.requestId).toMatch(uuidRegex);
    });

    it('should work with POST requests', async () => {
      app.post('/test-post', (req: Request, res: Response) => {
        res.json({ requestId: req.headers['x-request-id'] });
      });

      const response = await request(app).post('/test-post').send({ data: 'test' });

      expect(response.headers['x-request-id']).toBeDefined();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.headers['x-request-id']).toMatch(uuidRegex);
    });

    it('should work with different HTTP methods', async () => {
      app.put('/test-put', (req: Request, res: Response) => {
        res.json({ requestId: req.headers['x-request-id'] });
      });
      app.delete('/test-delete', (req: Request, res: Response) => {
        res.json({ requestId: req.headers['x-request-id'] });
      });
      app.patch('/test-patch', (req: Request, res: Response) => {
        res.json({ requestId: req.headers['x-request-id'] });
      });

      const putResponse = await request(app).put('/test-put').send({});
      const deleteResponse = await request(app).delete('/test-delete');
      const patchResponse = await request(app).patch('/test-patch').send({});

      expect(putResponse.headers['x-request-id']).toBeDefined();
      expect(deleteResponse.headers['x-request-id']).toBeDefined();
      expect(patchResponse.headers['x-request-id']).toBeDefined();
    });

    it('should preserve long request IDs', async () => {
      const longRequestId = 'a'.repeat(256);

      const response = await request(app).get('/test').set('X-Request-ID', longRequestId);

      expect(response.body.requestId).toBe(longRequestId);
      expect(response.headers['x-request-id']).toBe(longRequestId);
    });

    it('should handle special characters in request ID', async () => {
      const specialRequestId = 'req-123_abc.xyz-456';

      const response = await request(app).get('/test').set('X-Request-ID', specialRequestId);

      expect(response.body.requestId).toBe(specialRequestId);
    });

    it('should handle UUID-format client request ID', async () => {
      const clientUuid = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app).get('/test').set('X-Request-ID', clientUuid);

      expect(response.body.requestId).toBe(clientUuid);
    });
  });

  describe('Response header format', () => {
    it('should set response header', async () => {
      const response = await request(app).get('/test');

      // supertest normalizes headers to lowercase, but we verify it's present
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should set consistent request ID in body and response header', async () => {
      const response = await request(app).get('/test');

      expect(response.body.requestId).toBe(response.headers['x-request-id']);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent requests with unique IDs', async () => {
      const requests = Array.from({ length: 5 }, () => request(app).get('/test'));
      const responses = await Promise.all(requests);

      const requestIds = responses.map((r) => r.body.requestId);

      // All IDs should be unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(requestIds.length);
    });
  });
});
