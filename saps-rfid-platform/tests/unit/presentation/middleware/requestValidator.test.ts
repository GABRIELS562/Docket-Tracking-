import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { z } from 'zod';

import {
  validate,
  validateQuery,
  validateParams,
} from '@presentation/http/middleware/requestValidator';
import { ValidationError } from '@shared/errors/ValidationError';

describe('requestValidator middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  // Custom error handler to capture ValidationError
  const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.details,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: err.message,
        },
      });
    }
  };

  describe('validate (body)', () => {
    const userSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email format'),
      age: z.number().int().min(18, 'Must be at least 18').optional(),
    });

    beforeEach(() => {
      app.post('/users', validate(userSchema), (req: Request, res: Response) => {
        res.status(201).json({ user: req.body });
      });
      app.use(errorHandler);
    });

    describe('successful validation', () => {
      it('should pass validation with valid body', async () => {
        const validBody = {
          name: 'John Doe',
          email: 'john@example.com',
        };

        const response = await request(app).post('/users').send(validBody);

        expect(response.status).toBe(201);
        expect(response.body.user).toEqual(validBody);
      });

      it('should pass validation with all optional fields', async () => {
        const validBody = {
          name: 'Jane Doe',
          email: 'jane@example.com',
          age: 25,
        };

        const response = await request(app).post('/users').send(validBody);

        expect(response.status).toBe(201);
        expect(response.body.user).toEqual(validBody);
      });

      it('should call next() on successful validation', async () => {
        const validBody = {
          name: 'Test User',
          email: 'test@example.com',
        };

        const response = await request(app).post('/users').send(validBody);

        expect(response.status).toBe(201);
      });

      it('should transform request body with validated data', async () => {
        // Schema that transforms data
        const transformSchema = z.object({
          email: z.string().email().toLowerCase(),
        });

        const transformApp = express();
        transformApp.use(express.json());
        transformApp.post(
          '/transform',
          validate(transformSchema),
          (req: Request, res: Response) => {
            res.json({ email: req.body.email });
          }
        );

        const response = await request(transformApp)
          .post('/transform')
          .send({ email: 'TEST@EXAMPLE.COM' });

        expect(response.body.email).toBe('test@example.com');
      });
    });

    describe('failed validation', () => {
      it('should return 400 for missing required field', async () => {
        const invalidBody = {
          email: 'john@example.com',
          // missing name
        };

        const response = await request(app).post('/users').send(invalidBody);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error message', async () => {
        const invalidBody = {
          name: '',
          email: 'john@example.com',
        };

        const response = await request(app).post('/users').send(invalidBody);

        expect(response.body.error.message).toBe('Validation failed');
      });

      it('should return field-level error details', async () => {
        const invalidBody = {
          name: '',
          email: 'invalid-email',
        };

        const response = await request(app).post('/users').send(invalidBody);

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.any(String),
            }),
            expect.objectContaining({
              field: 'email',
              message: 'Invalid email format',
            }),
          ])
        );
      });

      it('should return error for invalid optional field', async () => {
        const invalidBody = {
          name: 'John',
          email: 'john@example.com',
          age: 16, // Below minimum
        };

        const response = await request(app).post('/users').send(invalidBody);

        expect(response.status).toBe(400);
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: 'Must be at least 18',
            }),
          ])
        );
      });

      it('should handle nested field paths', async () => {
        const nestedSchema = z.object({
          address: z.object({
            city: z.string().min(1, 'City is required'),
            zip: z.string().length(5, 'ZIP must be 5 characters'),
          }),
        });

        const nestedApp = express();
        nestedApp.use(express.json());
        nestedApp.post('/nested', validate(nestedSchema), (_req: Request, res: Response) => {
          res.json({});
        });
        nestedApp.use(errorHandler);

        const response = await request(nestedApp)
          .post('/nested')
          .send({ address: { city: '', zip: '123' } });

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'address.city',
            }),
            expect.objectContaining({
              field: 'address.zip',
            }),
          ])
        );
      });

      it('should handle array field paths', async () => {
        const arraySchema = z.object({
          items: z.array(z.string().min(1, 'Item cannot be empty')),
        });

        const arrayApp = express();
        arrayApp.use(express.json());
        arrayApp.post('/array', validate(arraySchema), (_req: Request, res: Response) => {
          res.json({});
        });
        arrayApp.use(errorHandler);

        const response = await request(arrayApp)
          .post('/array')
          .send({ items: ['valid', ''] });

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'items.1',
            }),
          ])
        );
      });
    });

    describe('non-ZodError handling', () => {
      it('should pass non-Zod errors to next', async () => {
        // Create a schema that throws a non-Zod error
        const errorSchema = {
          parseAsync: jest.fn().mockRejectedValue(new Error('Unexpected error')),
        } as unknown as z.ZodSchema;

        const errorApp = express();
        errorApp.use(express.json());
        errorApp.post('/error', validate(errorSchema), (_req: Request, res: Response) => {
          res.json({});
        });
        errorApp.use(errorHandler);

        const response = await request(errorApp).post('/error').send({ data: 'test' });

        expect(response.status).toBe(500);
        expect(response.body.error.message).toBe('Unexpected error');
      });
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
      limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
      search: z.string().optional(),
    });

    beforeEach(() => {
      app.get('/items', validateQuery(querySchema), (req: Request, res: Response) => {
        res.json({ query: req.query });
      });
      app.use(errorHandler);
    });

    describe('successful validation', () => {
      it('should validate query parameters successfully', async () => {
        const response = await request(app).get('/items').query({ page: '1', limit: '10' });

        expect(response.status).toBe(200);
        expect(response.body.query).toEqual({
          page: '1',
          limit: '10',
        });
      });

      it('should pass with no query parameters', async () => {
        const response = await request(app).get('/items');

        expect(response.status).toBe(200);
        expect(response.body.query).toEqual({});
      });

      it('should handle search parameter', async () => {
        const response = await request(app).get('/items').query({ search: 'test query' });

        expect(response.status).toBe(200);
        expect(response.body.query.search).toBe('test query');
      });
    });

    describe('failed validation', () => {
      it('should return 400 for invalid query parameter', async () => {
        const response = await request(app).get('/items').query({ page: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return appropriate error message for query validation', async () => {
        const response = await request(app).get('/items').query({ page: 'abc' });

        expect(response.body.error.message).toBe('Query parameter validation failed');
      });

      it('should include field details for invalid query params', async () => {
        const response = await request(app).get('/items').query({ page: 'abc', limit: 'xyz' });

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'page' }),
            expect.objectContaining({ field: 'limit' }),
          ])
        );
      });
    });
  });

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid UUID format'),
    });

    beforeEach(() => {
      app.get('/items/:id', validateParams(paramsSchema), (req: Request, res: Response) => {
        res.json({ id: req.params.id });
      });
      app.use(errorHandler);
    });

    describe('successful validation', () => {
      it('should validate URL parameters successfully', async () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';

        const response = await request(app).get(`/items/${validUuid}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(validUuid);
      });
    });

    describe('failed validation', () => {
      it('should return 400 for invalid URL parameter', async () => {
        const response = await request(app).get('/items/invalid-id');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return appropriate error message for params validation', async () => {
        const response = await request(app).get('/items/not-a-uuid');

        expect(response.body.error.message).toBe('URL parameter validation failed');
      });

      it('should include field details', async () => {
        const response = await request(app).get('/items/bad-id');

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              message: 'Invalid UUID format',
            }),
          ])
        );
      });
    });

    describe('multiple params', () => {
      it('should validate multiple URL parameters', async () => {
        const multiParamsSchema = z.object({
          tenantId: z.string().uuid('Invalid tenant UUID'),
          itemId: z.string().uuid('Invalid item UUID'),
        });

        const multiApp = express();
        multiApp.use(express.json());
        multiApp.get(
          '/tenants/:tenantId/items/:itemId',
          validateParams(multiParamsSchema),
          (req: Request, res: Response) => {
            res.json({ tenantId: req.params.tenantId, itemId: req.params.itemId });
          }
        );
        multiApp.use(errorHandler);

        const validTenantId = '123e4567-e89b-12d3-a456-426614174000';
        const validItemId = '987fcdeb-51a2-3c4d-b567-890123456789';

        const response = await request(multiApp).get(
          `/tenants/${validTenantId}/items/${validItemId}`
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          tenantId: validTenantId,
          itemId: validItemId,
        });
      });

      it('should report all invalid params', async () => {
        const multiParamsSchema = z.object({
          tenantId: z.string().uuid('Invalid tenant UUID'),
          itemId: z.string().uuid('Invalid item UUID'),
        });

        const multiApp = express();
        multiApp.use(express.json());
        multiApp.get(
          '/tenants/:tenantId/items/:itemId',
          validateParams(multiParamsSchema),
          (_req: Request, res: Response) => {
            res.json({});
          }
        );
        multiApp.use(errorHandler);

        const response = await request(multiApp).get('/tenants/invalid-tenant/items/invalid-item');

        expect(response.status).toBe(400);
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'tenantId' }),
            expect.objectContaining({ field: 'itemId' }),
          ])
        );
      });
    });
  });

  describe('Combined validators', () => {
    it('should chain multiple validators', async () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      const querySchema = z.object({
        include: z.string().optional(),
      });

      const bodySchema = z.object({
        name: z.string().min(1),
      });

      const combinedApp = express();
      combinedApp.use(express.json());
      combinedApp.put(
        '/items/:id',
        validateParams(paramsSchema),
        validateQuery(querySchema),
        validate(bodySchema),
        (req: Request, res: Response) => {
          res.json({
            id: req.params.id,
            include: req.query.include,
            name: req.body.name,
          });
        }
      );
      combinedApp.use(errorHandler);

      const validId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(combinedApp)
        .put(`/items/${validId}`)
        .query({ include: 'details' })
        .send({ name: 'Updated Item' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: validId,
        include: 'details',
        name: 'Updated Item',
      });
    });

    it('should fail on first invalid validator in chain', async () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      const bodySchema = z.object({
        name: z.string().min(1),
      });

      const chainApp = express();
      chainApp.use(express.json());
      chainApp.put(
        '/items/:id',
        validateParams(paramsSchema),
        validate(bodySchema),
        (_req: Request, res: Response) => {
          res.json({});
        }
      );
      chainApp.use(errorHandler);

      // Invalid params should fail before body validation
      const response = await request(chainApp).put('/items/invalid-id').send({ name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('URL parameter validation failed');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty body', async () => {
      const schema = z.object({
        name: z.string().optional(),
      });

      app.post('/empty', validate(schema), (req: Request, res: Response) => {
        res.json({ body: req.body });
      });
      app.use(errorHandler);

      const response = await request(app).post('/empty').send({});

      expect(response.status).toBe(200);
    });

    it('should strip unknown fields with strict schema', async () => {
      const strictSchema = z
        .object({
          allowed: z.string(),
        })
        .strict();

      const strictApp = express();
      strictApp.use(express.json());
      strictApp.post('/strict', validate(strictSchema), (req: Request, res: Response) => {
        res.json({ body: req.body });
      });
      strictApp.use(errorHandler);

      const response = await request(strictApp)
        .post('/strict')
        .send({ allowed: 'yes', notAllowed: 'no' });

      expect(response.status).toBe(400);
    });

    it('should handle async schema validation', async () => {
      const asyncSchema = z
        .object({
          email: z.string().email(),
        })
        .refine(
          async (data) => {
            // Simulate async validation (e.g., checking unique email)
            await new Promise((resolve) => setTimeout(resolve, 10));
            return !data.email.includes('blocked');
          },
          { message: 'Email is blocked', path: ['email'] }
        );

      const asyncApp = express();
      asyncApp.use(express.json());
      asyncApp.post('/async', validate(asyncSchema), (_req: Request, res: Response) => {
        res.json({ success: true });
      });
      asyncApp.use(errorHandler);

      const validResponse = await request(asyncApp)
        .post('/async')
        .send({ email: 'valid@example.com' });

      expect(validResponse.status).toBe(200);

      const invalidResponse = await request(asyncApp)
        .post('/async')
        .send({ email: 'blocked@example.com' });

      expect(invalidResponse.status).toBe(400);
    });
  });
});
