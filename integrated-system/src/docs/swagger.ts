/**
 * API Documentation using Swagger/OpenAPI
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RFID Docket Tracking System API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the RFID Docket Tracking System',
      contact: {
        name: 'IT Department',
        email: 'support@dockettrack.gov'
      },
      license: {
        name: 'Government License',
        url: 'https://dockettrack.gov/license'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server'
      },
      {
        url: 'https://api.dockettrack.gov',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            full_name: { type: 'string' },
            department: { type: 'string' },
            role_id: { type: 'integer' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Docket: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            docket_code: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            status: { type: 'string', enum: ['active', 'archived', 'retrieved'] },
            rfid_tag: { type: 'string' },
            location: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            event_id: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            user_id: { type: 'integer' },
            action_type: { type: 'string' },
            resource_type: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            severity: { type: 'string' }
          }
        },
        Analytics: {
          type: 'object',
          properties: {
            totalDockets: { type: 'integer' },
            activeDockets: { type: 'integer' },
            activeUsers: { type: 'integer' },
            rfidScans: { type: 'integer' },
            storageUtilization: { type: 'number' },
            complianceScore: { type: 'number' }
          }
        },
        RFIDEvent: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            tag_id: { type: 'string' },
            reader_id: { type: 'string' },
            location: { type: 'string' },
            signal_strength: { type: 'number' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger documentation
 */
export function setupSwagger(app: Express): void {
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'RFID Tracking API Docs',
    customfavIcon: '/favicon.ico'
  }));

  // Serve OpenAPI spec
  app.get('/api/docs.json', (req, res) => {
    res.json(swaggerSpec);
  });
}

// API Route Documentation Examples
export const apiDocs = {
  auth: {
    login: `
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
`,
    register: `
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - full_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               full_name:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
`
  },
  audit: {
    getLogs: `
/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [AUTHENTICATION, DATA_CHANGE, SECURITY_EVENT]
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 */
`
  },
  analytics: {
    getMetrics: `
/**
 * @swagger
 * /analytics/metrics/current:
 *   get:
 *     summary: Get current analytics metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Analytics'
 */
`,
    getKPIs: `
/**
 * @swagger
 * /analytics/kpi/dashboard:
 *   get:
 *     summary: Get KPI dashboard data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPI data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       kpiCode:
 *                         type: string
 *                       kpiName:
 *                         type: string
 *                       actualValue:
 *                         type: number
 *                       targetValue:
 *                         type: number
 *                       status:
 *                         type: string
 */
`
  },
  rfid: {
    scan: `
/**
 * @swagger
 * /rfid/scan:
 *   post:
 *     summary: Submit RFID scan
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagId
 *               - readerId
 *             properties:
 *               tagId:
 *                 type: string
 *               readerId:
 *                 type: string
 *               signalStrength:
 *                 type: number
 *               location:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *                   z:
 *                     type: number
 *     responses:
 *       200:
 *         description: Scan processed
 */
`,
    startTracking: `
/**
 * @swagger
 * /rfid/tracking/start:
 *   post:
 *     summary: Start RFID tracking session
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagId
 *             properties:
 *               tagId:
 *                 type: string
 *               docketId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tracking session started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                     tagId:
 *                       type: string
 *                     status:
 *                       type: string
 */
`
  },
  mobile: {
    getTasks: `
/**
 * @swagger
 * /mobile/tasks/pending:
 *   get:
 *     summary: Get pending mobile tasks
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       title:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       dueTime:
 *                         type: string
 *                         format: date-time
 */
`,
    sync: `
/**
 * @swagger
 * /mobile/sync:
 *   post:
 *     summary: Sync offline mobile data
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scans:
 *                 type: array
 *                 items:
 *                   type: object
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *               lastSync:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Data synced successfully
 */
`
  }
};

export default swaggerSpec;