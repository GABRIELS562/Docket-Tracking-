import request from 'supertest';
import { container } from 'tsyringe';
import { Server } from '../../../src/presentation/http/Server';
import { TestDatabase } from '../../helpers/TestDatabase';
import { initializeConfig } from '../../../src/config';
import { initializeContainer } from '../../../src/container';

/**
 * Items API Integration Tests
 *
 * @description
 * End-to-end tests for the generic Item API endpoints.
 * Tests the full stack: HTTP -> Controller -> Use Case -> Repository -> Database
 *
 * These tests use generic terminology (Item instead of Docket) and
 * validate the Phase 0 genericization work.
 */
describe('Items API Integration Tests', () => {
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

  // ============================================================================
  // POST /api/items - Register new item
  // ============================================================================
  describe('POST /api/items', () => {
    it('should create a new item with all fields', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-2025-000001',
          referenceId: 'PO-2025-12345',
          rfidEpc: 'E280116060002004DECA48DA',
          description: 'Dell Latitude 7430 Laptop',
          category: 'electronic',
          serialNumber: 'SN-DELL-12345',
          receivedBy: 'John Smith',
          metadata: { department: 'IT', purchaseDate: '2025-01-15' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemNumber).toBe('INV-2025-000001');
      expect(response.body.data.referenceId).toBe('PO-2025-12345');
      expect(response.body.data.description).toBe('Dell Latitude 7430 Laptop');
      expect(response.body.data.category).toBe('electronic');
      expect(response.body.data.status).toBe('registered');
    });

    it('should create item with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'ITEM-001',
          rfidEpc: 'E280116060002004DECA48DA',
          description: 'Test Item',
          category: 'other',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemNumber).toBe('ITEM-001');
      expect(response.body.data.referenceId).toBe('N/A'); // Default value
    });

    it('should accept various item number formats', async () => {
      const formats = [
        { itemNumber: '12345', epc: 'E28011606000204DECA0001' },
        { itemNumber: 'INV-2025-000001', epc: 'E28011606000204DECA0002' },
        { itemNumber: '12345/25', epc: 'E28011606000204DECA0003' },
        { itemNumber: 'ASSET_2025_001', epc: 'E28011606000204DECA0004' },
        { itemNumber: 'A1', epc: 'E28011606000204DECA0005' },
      ];

      for (const { itemNumber, epc } of formats) {
        const response = await request(app)
          .post('/api/items')
          .send({
            itemNumber,
            rfidEpc: epc,
            description: `Test item ${itemNumber}`,
            category: 'other',
          });

        expect(response.status).toBe(201);
        expect(response.body.data.itemNumber).toBe(itemNumber);
      }
    });

    it('should accept all category types', async () => {
      const categories = [
        'equipment',
        'consumable',
        'electronic',
        'document',
        'material',
        'tool',
        'apparel',
        'container',
        'sample',
        'other',
      ];

      for (let i = 0; i < categories.length; i++) {
        const response = await request(app)
          .post('/api/items')
          .send({
            itemNumber: `CAT-${i.toString().padStart(3, '0')}`,
            rfidEpc: `E28011606000204DECA${i.toString().padStart(4, '0')}`,
            description: `Test ${categories[i]} item`,
            category: categories[i],
          });

        expect(response.status).toBe(201);
        expect(response.body.data.category).toBe(categories[i]);
      }
    });

    it('should reject invalid item number format', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: '-INVALID', // Cannot start with hyphen
          rfidEpc: 'E280116060002004DECA48DA',
          description: 'Test',
          category: 'other',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid RFID EPC', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-001',
          rfidEpc: 'INVALID', // Must be 24 hex chars
          description: 'Test',
          category: 'other',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid EPC length', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-001',
          rfidEpc: 'E28011606000', // Too short
          description: 'Test',
          category: 'other',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-001',
          rfidEpc: 'E280116060002004DECA48DA',
          description: 'Test',
          category: 'invalid_category',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty description', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-001',
          rfidEpc: 'E280116060002004DECA48DA',
          description: '',
          category: 'other',
        });

      expect(response.status).toBe(400);
    });

    it('should reject description over 500 characters', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-001',
          rfidEpc: 'E280116060002004DECA48DA',
          description: 'A'.repeat(501),
          category: 'other',
        });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate item number', async () => {
      // Create first item
      await testDb.seedItem('INV-2025-000001', 'Test', 'E280116060002004DECA48DA');

      // Try to create duplicate
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-2025-000001',
          rfidEpc: 'E280116060002004DECA48DB',
          description: 'Another item',
          category: 'other',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate RFID EPC', async () => {
      // Create first item
      await testDb.seedItem('INV-2025-000001', 'Test', 'E280116060002004DECA48DA');

      // Try to create with same EPC
      const response = await request(app)
        .post('/api/items')
        .send({
          itemNumber: 'INV-2025-000002',
          rfidEpc: 'E280116060002004DECA48DA', // Same EPC
          description: 'Another item',
          category: 'other',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // GET /api/items - Search items
  // ============================================================================
  describe('GET /api/items', () => {
    it('should search items with default pagination', async () => {
      // Seed test data
      await testDb.seedItem('INV-2025-000001', 'Dell Laptop', 'E280116060002004DECA48DA');
      await testDb.seedItem('INV-2025-000002', 'HP Monitor', 'E280116060002004DECA48DB');

      const response = await request(app).get('/api/items');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should search with text query', async () => {
      await testDb.seedItem('INV-2025-000001', 'Dell Laptop Computer', 'E280116060002004DECA48DA');
      await testDb.seedItem('INV-2025-000002', 'HP Desktop Monitor', 'E280116060002004DECA48DB');

      const response = await request(app)
        .get('/api/items')
        .query({ q: 'laptop' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].description.toLowerCase()).toContain('laptop');
    });

    it('should filter by status', async () => {
      await testDb.seedItem('INV-2025-000001', 'Active Item', 'E280116060002004DECA48DA', 'registered');

      const response = await request(app)
        .get('/api/items')
        .query({ status: 'registered' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by category', async () => {
      await testDb.seedItem('INV-2025-000001', 'Laptop', 'E280116060002004DECA48DA', 'registered', 'electronic');

      const response = await request(app)
        .get('/api/items')
        .query({ category: 'electronic' });

      expect(response.status).toBe(200);
    });

    it('should filter by zone', async () => {
      await testDb.seedItemInZone('INV-2025-000001', 'Test Item', 'E280116060002004DECA48DA', 'zone-001');

      const response = await request(app)
        .get('/api/items')
        .query({ zoneId: 'zone-001' });

      expect(response.status).toBe(200);
    });

    it('should respect pagination limits', async () => {
      // Seed multiple items
      for (let i = 1; i <= 15; i++) {
        const itemNum = `INV-2025-${String(i).padStart(6, '0')}`;
        const epc = `E28011606000204DECA${String(i).padStart(4, '0')}`;
        await testDb.seedItem(itemNum, `Item ${i}`, epc);
      }

      const response = await request(app)
        .get('/api/items')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should handle offset pagination', async () => {
      // Seed items
      for (let i = 1; i <= 10; i++) {
        const itemNum = `INV-2025-${String(i).padStart(6, '0')}`;
        const epc = `E28011606000204DECA${String(i).padStart(4, '0')}`;
        await testDb.seedItem(itemNum, `Item ${i}`, epc);
      }

      const response = await request(app)
        .get('/api/items')
        .query({ limit: 5, offset: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.offset).toBe(5);
    });

    it('should sort by item number ascending', async () => {
      await testDb.seedItem('INV-2025-000003', 'Item C', 'E28011606000204DECA0003');
      await testDb.seedItem('INV-2025-000001', 'Item A', 'E28011606000204DECA0001');
      await testDb.seedItem('INV-2025-000002', 'Item B', 'E28011606000204DECA0002');

      const response = await request(app)
        .get('/api/items')
        .query({ sortBy: 'itemNumber', sortOrder: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.data[0].itemNumber).toBe('INV-2025-000001');
    });

    it('should handle empty results', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ q: 'nonexistent-item-xyz' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should reject invalid limit', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ limit: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should reject limit over 100', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ limit: 150 });

      expect(response.status).toBe(400);
    });

    it('should reject invalid sort field', async () => {
      const response = await request(app)
        .get('/api/items')
        .query({ sortBy: 'invalidField' });

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/items/:itemNumber - Get item details
  // ============================================================================
  describe('GET /api/items/:itemNumber', () => {
    it('should get item by item number', async () => {
      await testDb.seedItem('INV-2025-000001', 'Dell Laptop', 'E280116060002004DECA48DA');

      const response = await request(app).get('/api/items/INV-2025-000001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemNumber).toBe('INV-2025-000001');
      expect(response.body.data.description).toBe('Dell Laptop');
    });

    it('should get item with slash in number', async () => {
      await testDb.seedItem('12345/25', 'Test Item', 'E280116060002004DECA48DA');

      const response = await request(app).get('/api/items/12345%2F25'); // URL encoded

      expect(response.status).toBe(200);
      expect(response.body.data.itemNumber).toBe('12345/25');
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app).get('/api/items/INV-2025-999999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should include zone information when item is in a zone', async () => {
      await testDb.seedItemInZone('INV-2025-000001', 'Test Item', 'E280116060002004DECA48DA', 'zone-001');

      const response = await request(app).get('/api/items/INV-2025-000001');

      expect(response.status).toBe(200);
      expect(response.body.data.currentZone).toBeDefined();
      expect(response.body.data.currentZone.id).toBe('zone-001');
    });
  });

  // ============================================================================
  // GET /api/items/:itemNumber/history - Get item history
  // ============================================================================
  describe('GET /api/items/:itemNumber/history', () => {
    it('should get location history', async () => {
      await testDb.seedItem('INV-2025-000001', 'Test Item', 'E280116060002004DECA48DA');

      const response = await request(app)
        .get('/api/items/INV-2025-000001/history')
        .query({ hours: 24 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toBeInstanceOf(Array);
      expect(response.body.data.itemNumber).toBe('INV-2025-000001');
    });

    it('should respect hours parameter', async () => {
      await testDb.seedItem('INV-2025-000001', 'Test Item', 'E280116060002004DECA48DA');

      const response = await request(app)
        .get('/api/items/INV-2025-000001/history')
        .query({ hours: 48 });

      expect(response.status).toBe(200);
    });

    it('should respect limit parameter', async () => {
      await testDb.seedItem('INV-2025-000001', 'Test Item', 'E280116060002004DECA48DA');

      const response = await request(app)
        .get('/api/items/INV-2025-000001/history')
        .query({ limit: 50 });

      expect(response.status).toBe(200);
    });

    it('should accept custom time range', async () => {
      await testDb.seedItem('INV-2025-000001', 'Test Item', 'E280116060002004DECA48DA');

      const response = await request(app)
        .get('/api/items/INV-2025-000001/history')
        .query({
          startTime: '2025-01-01T00:00:00Z',
          endTime: '2025-12-31T23:59:59Z',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid hours value', async () => {
      await testDb.seedItem('INV-2025-000001', 'Test Item', 'E280116060002004DECA48DA');

      const response = await request(app)
        .get('/api/items/INV-2025-000001/history')
        .query({ hours: 200 }); // Max is 168

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .get('/api/items/INV-2025-999999/history');

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/zones/:zoneId/items - Get items in zone
  // ============================================================================
  describe('GET /api/zones/:zoneId/items', () => {
    it('should get items in a zone', async () => {
      await testDb.seedItemInZone('INV-2025-000001', 'Item 1', 'E28011606000204DECA0001', 'zone-001');
      await testDb.seedItemInZone('INV-2025-000002', 'Item 2', 'E28011606000204DECA0002', 'zone-001');

      const response = await request(app).get('/api/zones/zone-001/items');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.zoneId).toBe('zone-001');
      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(response.body.data.items.length).toBe(2);
    });

    it('should include occupancy metrics', async () => {
      await testDb.seedItemInZone('INV-2025-000001', 'Item 1', 'E28011606000204DECA0001', 'zone-001');

      const response = await request(app).get('/api/zones/zone-001/items');

      expect(response.status).toBe(200);
      expect(response.body.data.totalItems).toBeDefined();
      expect(response.body.data.capacity).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      // Seed multiple items
      for (let i = 1; i <= 10; i++) {
        const itemNum = `INV-2025-${String(i).padStart(6, '0')}`;
        const epc = `E28011606000204DECA${String(i).padStart(4, '0')}`;
        await testDb.seedItemInZone(itemNum, `Item ${i}`, epc, 'zone-001');
      }

      const response = await request(app)
        .get('/api/zones/zone-001/items')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeLessThanOrEqual(5);
    });

    it('should filter to recent items only', async () => {
      await testDb.seedItemInZone('INV-2025-000001', 'Recent Item', 'E28011606000204DECA0001', 'zone-001');

      const response = await request(app)
        .get('/api/zones/zone-001/items')
        .query({ recentOnly: 'true' });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent zone', async () => {
      const response = await request(app).get('/api/zones/non-existent-zone/items');

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // API Response Format
  // ============================================================================
  describe('API Response Format', () => {
    it('should include request ID in response', async () => {
      const response = await request(app).get('/api/items');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();
    });

    it('should include timestamp in response', async () => {
      const response = await request(app).get('/api/items');

      expect(response.body.meta.timestamp).toBeDefined();
      expect(new Date(response.body.meta.timestamp)).toBeInstanceOf(Date);
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });
  });

  // ============================================================================
  // CORS Headers
  // ============================================================================
  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/items')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  // ============================================================================
  // Rate Limiting
  // ============================================================================
  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make many requests quickly
      const requests = Array(101)
        .fill(null)
        .map(() => request(app).get('/api/items'));

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});
