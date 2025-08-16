/**
 * Integration tests for API endpoints
 */

import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

// Mock the database connection
jest.mock('../../database/connection');

// Import app setup (you'll need to export this from your main server file)
const setupApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import and setup routes
  const authRouter = require('../../routes/auth').default;
  const docketsRouter = require('../../routes/dockets').default;
  const auditRouter = require('../../routes/audit').default;
  const analyticsRouter = require('../../routes/analytics').default;
  const mobileRouter = require('../../routes/mobile').default;
  
  app.use('/api/auth', authRouter);
  app.use('/api/dockets', docketsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/mobile', mobileRouter);
  
  return app;
};

describe('API Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  
  beforeAll(() => {
    app = setupApp();
    // Generate a test token
    authToken = jwt.sign(
      { userId: 1, email: 'test@example.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
      it('should authenticate valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'wrong@example.com',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com'
            // Missing password
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/auth/verify', () => {
      it('should verify valid token', async () => {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('valid', true);
      });

      it('should reject invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });

      it('should reject missing token', async () => {
        const response = await request(app)
          .get('/api/auth/verify');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Dockets Endpoints', () => {
    describe('GET /api/dockets', () => {
      it('should return paginated dockets list', async () => {
        const response = await request(app)
          .get('/api/dockets')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('dockets');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
      });

      it('should filter dockets by status', async () => {
        const response = await request(app)
          .get('/api/dockets')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ status: 'active' });

        expect(response.status).toBe(200);
        expect(response.body.dockets).toBeInstanceOf(Array);
      });

      it('should search dockets by keyword', async () => {
        const response = await request(app)
          .get('/api/dockets')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ search: 'contract' });

        expect(response.status).toBe(200);
      });
    });

    describe('POST /api/dockets', () => {
      it('should create new docket with valid data', async () => {
        const newDocket = {
          docket_number: 'DOC-2025-0100',
          title: 'Test Document',
          description: 'Test description',
          category: 'Legal',
          priority: 'high',
          department_id: 1
        };

        const response = await request(app)
          .post('/api/dockets')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newDocket);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('docket_number', newDocket.docket_number);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/dockets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Incomplete Document'
            // Missing required fields
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('PUT /api/dockets/:id', () => {
      it('should update existing docket', async () => {
        const updates = {
          status: 'archived',
          location: 'Zone B'
        };

        const response = await request(app)
          .put('/api/dockets/1')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'archived');
      });

      it('should return 404 for non-existent docket', async () => {
        const response = await request(app)
          .put('/api/dockets/99999')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'archived' });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Audit Trail Endpoints', () => {
    describe('GET /api/audit/logs', () => {
      it('should return audit logs with pagination', async () => {
        const response = await request(app)
          .get('/api/audit/logs')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 20 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('logs');
        expect(response.body.logs).toBeInstanceOf(Array);
      });

      it('should filter logs by date range', async () => {
        const response = await request(app)
          .get('/api/audit/logs')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            startDate: '2025-01-01',
            endDate: '2025-01-31'
          });

        expect(response.status).toBe(200);
      });

      it('should filter logs by user', async () => {
        const response = await request(app)
          .get('/api/audit/logs')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ userId: 1 });

        expect(response.status).toBe(200);
      });
    });

    describe('GET /api/audit/compliance-report', () => {
      it('should generate compliance report', async () => {
        const response = await request(app)
          .get('/api/audit/compliance-report')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            startDate: '2025-01-01',
            endDate: '2025-01-31'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('violations');
        expect(response.body).toHaveProperty('recommendations');
      });
    });
  });

  describe('Analytics Endpoints', () => {
    describe('GET /api/analytics/dashboard', () => {
      it('should return dashboard metrics', async () => {
        const response = await request(app)
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('metrics');
        expect(response.body.metrics).toHaveProperty('totalDockets');
        expect(response.body.metrics).toHaveProperty('activeRetrievals');
      });
    });

    describe('GET /api/analytics/trends', () => {
      it('should return trend analysis', async () => {
        const response = await request(app)
          .get('/api/analytics/trends')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ period: '30d' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('trends');
        expect(response.body.trends).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/analytics/predictions', () => {
      it('should return predictive analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/predictions')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('storage');
        expect(response.body).toHaveProperty('retrieval');
        expect(response.body).toHaveProperty('peak');
      });
    });
  });

  describe('Mobile API Endpoints', () => {
    describe('POST /api/mobile/sync', () => {
      it('should sync offline data', async () => {
        const syncData = {
          lastSync: new Date(Date.now() - 86400000).toISOString(),
          operations: [
            {
              type: 'create',
              entity: 'docket',
              data: { title: 'Offline Created' },
              timestamp: new Date().toISOString()
            }
          ]
        };

        const response = await request(app)
          .post('/api/mobile/sync')
          .set('Authorization', `Bearer ${authToken}`)
          .send(syncData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('synced');
        expect(response.body).toHaveProperty('conflicts');
      });
    });

    describe('GET /api/mobile/offline-data', () => {
      it('should return data for offline mode', async () => {
        const response = await request(app)
          .get('/api/mobile/offline-data')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('dockets');
        expect(response.body).toHaveProperty('storageZones');
        expect(response.body).toHaveProperty('lastUpdate');
      });
    });
  });

  describe('RFID Endpoints', () => {
    describe('POST /api/rfid/scan', () => {
      it('should record RFID scan', async () => {
        const scanData = {
          tagId: 'RFID-001',
          readerId: 'R001',
          signalStrength: 0.85,
          location: { lat: 40.7128, lng: -74.0060 }
        };

        const response = await request(app)
          .post('/api/rfid/scan')
          .set('Authorization', `Bearer ${authToken}`)
          .send(scanData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('scanId');
      });
    });

    describe('GET /api/rfid/track/:tagId', () => {
      it('should track RFID tag location', async () => {
        const response = await request(app)
          .get('/api/rfid/track/RFID-001')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('currentLocation');
        expect(response.body).toHaveProperty('history');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/dockets')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const { query } = require('../../database/connection');
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/dockets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(101).fill(null).map(() =>
        request(app)
          .get('/api/dockets')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});