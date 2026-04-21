/**
 * OpenAPI/Swagger Configuration
 *
 * This module sets up Swagger documentation for the RFID Platform API.
 * It uses swagger-jsdoc to generate OpenAPI 3.0 spec from JSDoc annotations.
 *
 * Documentation is available at /api/docs when the server is running.
 */

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * OpenAPI 3.0 Specification Options
 */
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'RFID Inventory Platform API',
      version: '1.0.0',
      description: `
## Overview

Enterprise-grade RFID tracking backend system for inventory management.
This API provides real-time tracking, analytics, and management of RFID-tagged items.

## Features

- **Real-time Item Tracking**: Track items across multiple zones using RFID readers
- **Multi-tenant Architecture**: Secure isolation between organizations
- **Analytics & Reporting**: Dashboard metrics, flow analysis, and bottleneck detection
- **WebSocket Events**: Real-time updates for tag detection and item movement

## Authentication

Most endpoints require JWT authentication. Obtain tokens via:
1. **Login**: \`POST /api/auth/login\` with email/password
2. Include token in header: \`Authorization: Bearer <token>\`
3. **Refresh**: \`POST /api/auth/refresh\` before token expires

## Rate Limiting

- 100 requests per minute per IP address
- Rate limit headers included in responses:
  - \`RateLimit-Limit\`: Maximum requests allowed
  - \`RateLimit-Remaining\`: Requests remaining in window

## Error Responses

All errors follow a consistent format:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00.000Z",
    "requestId": "uuid"
  }
}
\`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@rfid-platform.com',
      },
      license: {
        name: 'Proprietary',
        url: 'https://rfid-platform.com/license',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
      {
        url: 'https://api.rfid-platform.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'System health and status endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and token management',
      },
      {
        name: 'Items',
        description: 'Item management and tracking',
      },
      {
        name: 'Zones',
        description: 'Zone management and occupancy',
      },
      {
        name: 'Readers',
        description: 'RFID reader status and management',
      },
      {
        name: 'Analytics',
        description: 'Dashboard metrics and reporting',
      },
      {
        name: 'Flow Analytics',
        description: 'Item flow and path analysis',
      },
      {
        name: 'Tenants',
        description: 'Multi-tenant management',
      },
      {
        name: 'Pathfinding',
        description: 'Zone pathfinding and routing',
      },
      {
        name: 'Spatial',
        description: 'Spatial analytics (Open3D integration)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /api/auth/login',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid request parameters',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            meta: {
              $ref: '#/components/schemas/ResponseMeta',
            },
          },
        },
        ResponseMeta: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T12:00:00.000Z',
            },
            requestId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 100,
            },
            limit: {
              type: 'integer',
              example: 10,
            },
            offset: {
              type: 'integer',
              example: 0,
            },
            hasMore: {
              type: 'boolean',
              example: true,
            },
          },
        },

        // Item schemas
        Item: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            itemNumber: {
              type: 'string',
              example: 'INV-2025-000001',
              description: 'Unique item identifier',
            },
            referenceId: {
              type: 'string',
              example: 'PO-12345',
              description: 'External reference ID',
            },
            rfidEpc: {
              type: 'string',
              example: 'E28011700000020F4A901234',
              description: '24-character hexadecimal RFID EPC',
            },
            description: {
              type: 'string',
              example: 'Laptop Computer - Dell XPS 15',
            },
            category: {
              type: 'string',
              enum: [
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
              ],
              example: 'electronic',
            },
            status: {
              type: 'string',
              enum: [
                'registered',
                'in_transit',
                'in_processing',
                'archived',
                'disposed',
                'missing',
              ],
              example: 'registered',
            },
            currentZoneId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            currentZoneName: {
              type: 'string',
              nullable: true,
              example: 'Receiving Bay',
            },
            serialNumber: {
              type: 'string',
              nullable: true,
              example: 'SN-ABC123',
            },
            receivedBy: {
              type: 'string',
              nullable: true,
              example: 'John Doe',
            },
            lastSeenAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        CreateItemRequest: {
          type: 'object',
          required: ['itemNumber', 'rfidEpc', 'description', 'category'],
          properties: {
            itemNumber: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              pattern: '^[A-Za-z0-9][A-Za-z0-9\\-\\/_]{0,49}$',
              example: 'INV-2025-000001',
            },
            referenceId: {
              type: 'string',
              maxLength: 100,
              example: 'PO-12345',
            },
            rfidEpc: {
              type: 'string',
              minLength: 24,
              maxLength: 24,
              pattern: '^[0-9A-Fa-f]{24}$',
              example: 'E28011700000020F4A901234',
            },
            description: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              example: 'Laptop Computer - Dell XPS 15',
            },
            category: {
              type: 'string',
              enum: [
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
              ],
            },
            serialNumber: {
              type: 'string',
              maxLength: 100,
            },
            receivedBy: {
              type: 'string',
              maxLength: 100,
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        ItemHistory: {
          type: 'object',
          properties: {
            itemNumber: {
              type: 'string',
            },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  zoneId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  zoneName: {
                    type: 'string',
                  },
                  enteredAt: {
                    type: 'string',
                    format: 'date-time',
                  },
                  exitedAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  dwellTimeMinutes: {
                    type: 'number',
                  },
                  readerId: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },

        // Zone schemas
        Zone: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Receiving Bay',
            },
            type: {
              type: 'string',
              example: 'receiving',
            },
            capacity: {
              type: 'integer',
              example: 50,
            },
            currentOccupancy: {
              type: 'integer',
              example: 12,
            },
            occupancyPercentage: {
              type: 'number',
              format: 'float',
              example: 24.0,
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'maintenance'],
            },
            coordinates: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                depth: { type: 'number' },
              },
            },
          },
        },

        // Reader schemas
        Reader: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Reader-001',
            },
            ipAddress: {
              type: 'string',
              format: 'ipv4',
              example: '192.168.1.100',
            },
            port: {
              type: 'integer',
              example: 5084,
            },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'error', 'initializing'],
            },
            zoneId: {
              type: 'string',
              format: 'uuid',
            },
            zoneName: {
              type: 'string',
            },
            lastHeartbeat: {
              type: 'string',
              format: 'date-time',
            },
            readsPerMinute: {
              type: 'number',
            },
            errorRate: {
              type: 'number',
              format: 'float',
            },
            antennas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  enabled: { type: 'boolean' },
                  power: { type: 'number' },
                },
              },
            },
          },
        },

        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'password123',
            },
            tenantSlug: {
              type: 'string',
              description: 'Optional tenant slug for multi-tenant login',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                },
                refreshToken: {
                  type: 'string',
                },
                expiresIn: {
                  type: 'string',
                  example: '15m',
                },
                user: {
                  $ref: '#/components/schemas/User',
                },
                tenant: {
                  $ref: '#/components/schemas/Tenant',
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['viewer', 'operator', 'admin', 'owner'],
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              format: 'password',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              minLength: 8,
            },
          },
        },

        // Tenant schemas
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Acme Corporation',
            },
            slug: {
              type: 'string',
              example: 'acme-corp',
            },
            plan: {
              type: 'string',
              enum: ['free', 'starter', 'professional', 'enterprise'],
            },
            status: {
              type: 'string',
              enum: ['active', 'suspended', 'cancelled'],
            },
            settings: {
              type: 'object',
              additionalProperties: true,
            },
            branding: {
              type: 'object',
              properties: {
                logo: { type: 'string' },
                primaryColor: { type: 'string' },
                secondaryColor: { type: 'string' },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateTenantRequest: {
          type: 'object',
          required: ['name', 'slug', 'ownerEmail', 'ownerPassword'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
            slug: {
              type: 'string',
              pattern: '^[a-z0-9-]+$',
              minLength: 3,
              maxLength: 50,
            },
            ownerEmail: {
              type: 'string',
              format: 'email',
            },
            ownerPassword: {
              type: 'string',
              format: 'password',
              minLength: 8,
            },
            ownerFirstName: {
              type: 'string',
            },
            ownerLastName: {
              type: 'string',
            },
          },
        },
        TenantUsage: {
          type: 'object',
          properties: {
            itemCount: {
              type: 'integer',
            },
            zoneCount: {
              type: 'integer',
            },
            readerCount: {
              type: 'integer',
            },
            userCount: {
              type: 'integer',
            },
            apiCallsThisMonth: {
              type: 'integer',
            },
            storageUsedMb: {
              type: 'number',
            },
            limits: {
              type: 'object',
              properties: {
                maxItems: { type: 'integer' },
                maxZones: { type: 'integer' },
                maxReaders: { type: 'integer' },
                maxUsers: { type: 'integer' },
                maxApiCallsPerMonth: { type: 'integer' },
              },
            },
          },
        },

        // Analytics schemas
        DashboardMetrics: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalItems: { type: 'integer' },
                activeItems: { type: 'integer' },
                totalZones: { type: 'integer' },
                activeReaders: { type: 'integer' },
                totalReadsToday: { type: 'integer' },
              },
            },
            comparison: {
              type: 'object',
              properties: {
                itemsChange: { type: 'number' },
                readsChange: { type: 'number' },
                period: { type: 'string' },
              },
            },
            zoneOccupancy: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string' },
                  zoneName: { type: 'string' },
                  occupancy: { type: 'integer' },
                  capacity: { type: 'integer' },
                  percentage: { type: 'number' },
                },
              },
            },
            readerHealth: {
              type: 'object',
              properties: {
                online: { type: 'integer' },
                offline: { type: 'integer' },
                error: { type: 'integer' },
              },
            },
            recentActivity: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  type: { type: 'string' },
                  itemNumber: { type: 'string' },
                  zoneName: { type: 'string' },
                },
              },
            },
          },
        },
        ZoneAnalytics: {
          type: 'object',
          properties: {
            zoneId: {
              type: 'string',
              format: 'uuid',
            },
            zoneName: {
              type: 'string',
            },
            statistics: {
              type: 'object',
              properties: {
                totalVisits: { type: 'integer' },
                uniqueItems: { type: 'integer' },
                averageDwellMinutes: { type: 'number' },
                peakOccupancy: { type: 'integer' },
              },
            },
            timeSeries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  occupancy: { type: 'integer' },
                  entries: { type: 'integer' },
                  exits: { type: 'integer' },
                },
              },
            },
          },
        },
        ReaderAnalytics: {
          type: 'object',
          properties: {
            readerId: {
              type: 'string',
              format: 'uuid',
            },
            readerName: {
              type: 'string',
            },
            performance: {
              type: 'object',
              properties: {
                totalReads: { type: 'integer' },
                uniqueTags: { type: 'integer' },
                averageReadsPerMinute: { type: 'number' },
                errorRate: { type: 'number' },
                uptime: { type: 'number' },
              },
            },
          },
        },
        SystemMetrics: {
          type: 'object',
          properties: {
            current: {
              type: 'object',
              properties: {
                cpuUsage: { type: 'number' },
                memoryUsage: { type: 'number' },
                activeConnections: { type: 'integer' },
                requestsPerSecond: { type: 'number' },
              },
            },
            database: {
              type: 'object',
              properties: {
                connectionPoolSize: { type: 'integer' },
                activeConnections: { type: 'integer' },
                queryLatencyMs: { type: 'number' },
              },
            },
            cache: {
              type: 'object',
              properties: {
                hitRate: { type: 'number' },
                memoryUsedMb: { type: 'number' },
              },
            },
          },
        },

        // Flow Analytics schemas
        ItemJourney: {
          type: 'object',
          properties: {
            itemNumber: {
              type: 'string',
            },
            path: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string', format: 'uuid' },
                  zoneName: { type: 'string' },
                  enteredAt: { type: 'string', format: 'date-time' },
                  exitedAt: { type: 'string', format: 'date-time', nullable: true },
                  dwellMinutes: { type: 'number' },
                },
              },
            },
            transitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fromZone: { type: 'string' },
                  toZone: { type: 'string' },
                  transitionTime: { type: 'string', format: 'date-time' },
                  durationMinutes: { type: 'number' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalZonesVisited: { type: 'integer' },
                totalTransitions: { type: 'integer' },
                totalDwellMinutes: { type: 'number' },
                startTime: { type: 'string', format: 'date-time' },
                endTime: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
        ZoneFlowAnalytics: {
          type: 'object',
          properties: {
            flowMatrix: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fromZoneId: { type: 'string' },
                  fromZoneName: { type: 'string' },
                  toZoneId: { type: 'string' },
                  toZoneName: { type: 'string' },
                  transitionCount: { type: 'integer' },
                  averageDurationMinutes: { type: 'number' },
                },
              },
            },
            topFlows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  corridor: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
            },
          },
        },
        BottleneckAnalysis: {
          type: 'object',
          properties: {
            bottlenecks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string', format: 'uuid' },
                  zoneName: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  averageDwellMinutes: { type: 'number' },
                  congestionLevel: { type: 'number' },
                  peakHours: {
                    type: 'array',
                    items: { type: 'integer' },
                  },
                },
              },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  message: { type: 'string' },
                  priority: { type: 'string' },
                },
              },
            },
          },
        },
        FlowAnomalies: {
          type: 'object',
          properties: {
            anomalies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  type: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  itemNumber: { type: 'string' },
                  description: { type: 'string' },
                  detectedAt: { type: 'string', format: 'date-time' },
                  zoneId: { type: 'string', format: 'uuid' },
                },
              },
            },
            byType: {
              type: 'object',
              additionalProperties: {
                type: 'integer',
              },
            },
          },
        },

        // Health schemas
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
            },
            uptime: {
              type: 'number',
              description: 'Uptime in seconds',
            },
          },
        },
        DetailedHealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
            },
            uptime: {
              type: 'number',
            },
            dependencies: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    latencyMs: { type: 'number' },
                  },
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    latencyMs: { type: 'number' },
                  },
                },
                rfidGateway: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    connectedReaders: { type: 'integer' },
                  },
                },
              },
            },
            memory: {
              type: 'object',
              properties: {
                heapUsed: { type: 'number' },
                heapTotal: { type: 'number' },
                external: { type: 'number' },
                rss: { type: 'number' },
              },
            },
          },
        },

        // Pathfinding schemas
        PathfindingRequest: {
          type: 'object',
          required: ['from', 'to'],
          properties: {
            from: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                  required: ['x', 'y'],
                },
                {
                  type: 'object',
                  properties: {
                    zoneId: { type: 'string', format: 'uuid' },
                  },
                  required: ['zoneId'],
                },
              ],
            },
            to: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                  required: ['x', 'y'],
                },
                {
                  type: 'object',
                  properties: {
                    zoneId: { type: 'string', format: 'uuid' },
                  },
                  required: ['zoneId'],
                },
              ],
            },
            avoidZones: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
              },
            },
          },
        },
        PathfindingResult: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            path: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  zoneId: { type: 'string', format: 'uuid', nullable: true },
                  zoneName: { type: 'string', nullable: true },
                },
              },
            },
            distance: {
              type: 'number',
            },
            estimatedTimeMinutes: {
              type: 'number',
            },
            zonesTraversed: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
        ZoneGraph: {
          type: 'object',
          properties: {
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
              },
            },
            edges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  weight: { type: 'number' },
                  bidirectional: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions for this operation',
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid request parameters',
                  details: [
                    {
                      field: 'itemNumber',
                      message: 'Item number is required',
                    },
                  ],
                },
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later',
                },
              },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'An unexpected error occurred',
                },
              },
            },
          },
        },
      },
    },
    // Define paths in separate route definition files for better organization
    paths: {},
  },
  apis: [
    // Include all route files with JSDoc annotations
    './src/presentation/http/routes/*.ts',
    './src/presentation/http/swagger-paths.ts',
  ],
};

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Setup Swagger UI middleware
 *
 * @param app - Express application
 */
export function setupSwagger(app: Express): void {
  // Serve Swagger UI at /api/docs
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'RFID Platform API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        tryItOutEnabled: true,
      },
    })
  );

  // Serve raw OpenAPI JSON at /api/docs/openapi.json
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

/**
 * Generate OpenAPI JSON file
 *
 * @param outputPath - Path to write the openapi.json file
 */
export function generateOpenApiFile(outputPath?: string): void {
  const filePath = outputPath || resolve(__dirname, '../../../openapi.json');
  writeFileSync(filePath, JSON.stringify(swaggerSpec, null, 2));
  console.log(`OpenAPI specification written to: ${filePath}`);
}

export default { swaggerSpec, setupSwagger, generateOpenApiFile };
