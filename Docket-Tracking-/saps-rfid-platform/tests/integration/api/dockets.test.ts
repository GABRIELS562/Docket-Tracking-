import request from 'supertest';
import { container } from 'tsyringe';
import { Server } from '../../../src/presentation/http/Server';
import { TestDatabase } from '../../helpers/TestDatabase';
import { initializeConfig } from '../../../src/config';
import { initializeContainer } from '../../../src/container';

describe('Dockets API Integration Tests', () => {
  let server: Server;
  let app: any;
  let testDb: TestDatabase;

  beforeAll(async () => {
    // Initialize configuration and container
    initializeConfig();
    initializeContainer();

    // Start server
    server = container.resolve(Server);
    await server.start();
    app = server.getApp();

    // Setup test database
    testDb = new TestDatabase();
    await testDb.connect();
  });

  afterAll(async () => {
    await testDb.disconnect();
    await testDb.closePool();
    await server.stop();
  });

  beforeEach(async () => {
    // Clear and seed data before each test
    await testDb.clearAllData();
    await testDb.seedZones();
    await testDb.seedReaders();
  });

  describe('POST /api/dockets', () => {
    it('should create a new docket', async () => {
      const response = await request(app)
        .post('/api/dockets')
        .send({
          labNumber: 'FSL-2024-000001',
          caseReference: 'Armed Robbery - Main Street',
          rfidEpc: 'E28011606000204DECA48DA',
          evidenceType: 'firearm',
          metadata: { officer: 'Smith' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.labNumber).toBe('FSL-2024-000001');
      expect(response.body.data.caseReference).toBe('Armed Robbery - Main Street');
    });

    it('should reject invalid lab number format', async () => {
      const response = await request(app)
        .post('/api/dockets')
        .send({
          labNumber: 'INVALID',
          caseReference: 'Test Case',
          rfidEpc: 'E28011606000204DECA48DA',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid RFID EPC', async () => {
      const response = await request(app)
        .post('/api/dockets')
        .send({
          labNumber: 'FSL-2024-000001',
          caseReference: 'Test Case',
          rfidEpc: 'INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate lab number', async () => {
      // Create first docket
      await testDb.seedDocket('FSL-2024-000001', 'Test Case', 'E28011606000204DECA48DA');

      // Try to create duplicate
      const response = await request(app)
        .post('/api/dockets')
        .send({
          labNumber: 'FSL-2024-000001',
          caseReference: 'Another Case',
          rfidEpc: 'E28011606000204DECA48DB',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/dockets', () => {
    it('should search dockets with default pagination', async () => {
      // Seed test data
      await testDb.seedDocket('FSL-2024-000001', 'Robbery Case', 'E28011606000204DECA48DA');
      await testDb.seedDocket('FSL-2024-000002', 'Assault Case', 'E28011606000204DECA48DB');

      const response = await request(app).get('/api/dockets');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter by status', async () => {
      await testDb.seedDocket('FSL-2024-000001', 'Active Case', 'E28011606000204DECA48DA');

      const response = await request(app)
        .get('/api/dockets')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by zone', async () => {
      await testDb.seedDocket('FSL-2024-000001', 'Test Case', 'E28011606000204DECA48DA', 1);

      const response = await request(app)
        .get('/api/dockets')
        .query({ zoneId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should respect pagination limits', async () => {
      // Seed multiple dockets
      for (let i = 1; i <= 15; i++) {
        const labNum = `FSL-2024-${String(i).padStart(6, '0')}`;
        const epc = `E28011606000204DECA${String(i).padStart(4, '0')}`;
        await testDb.seedDocket(labNum, `Case ${i}`, epc);
      }

      const response = await request(app)
        .get('/api/dockets')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.hasMore).toBe(true);
    });
  });

  describe('GET /api/dockets/:labNumber', () => {
    it('should get docket by lab number', async () => {
      await testDb.seedDocket('FSL-2024-000001', 'Test Case', 'E28011606000204DECA48DA');

      const response = await request(app).get('/api/dockets/FSL-2024-000001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.labNumber).toBe('FSL-2024-000001');
    });

    it('should return 404 for non-existent docket', async () => {
      const response = await request(app).get('/api/dockets/FSL-2024-999999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/dockets/:labNumber/history', () => {
    it('should get location history', async () => {
      await testDb.seedDocket('FSL-2024-000001', 'Test Case', 'E28011606000204DECA48DA');

      const response = await request(app)
        .get('/api/dockets/FSL-2024-000001/history')
        .query({ hours: 24 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make 101 requests (limit is 100/minute)
      const requests = Array(101)
        .fill(null)
        .map(() => request(app).get('/api/dockets'));

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/dockets')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Request ID', () => {
    it('should include request ID in response', async () => {
      const response = await request(app).get('/api/dockets');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();
    });
  });
});
