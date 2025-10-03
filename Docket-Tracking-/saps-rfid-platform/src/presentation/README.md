# Presentation Layer - SAPS RFID Platform

Complete REST API and WebSocket server implementation for the SAPS RFID Evidence Tracking Platform.

## Overview

The presentation layer provides HTTP and WebSocket interfaces for client applications to interact with the RFID tracking system.

### Key Features

- ✅ RESTful API design with standard HTTP methods
- ✅ Input validation using Zod schemas
- ✅ Comprehensive error handling with structured responses
- ✅ Rate limiting (100 requests/minute per IP)
- ✅ CORS configuration for cross-origin requests
- ✅ Security headers via Helmet
- ✅ Request correlation IDs for tracing
- ✅ Structured logging with context
- ✅ Real-time updates via WebSocket (Socket.IO)
- ✅ Room-based subscriptions for targeted updates
- ✅ Health check endpoints
- ✅ Graceful shutdown support
- ✅ TypeScript strict mode throughout
- ✅ Dependency injection with tsyringe

## Architecture

```
presentation/
├── http/
│   ├── Server.ts                    # Express server setup
│   ├── middleware/
│   │   ├── errorHandler.ts          # Global error handling
│   │   ├── correlationId.ts         # Request ID tracking
│   │   ├── requestLogger.ts         # Structured logging
│   │   ├── rateLimiter.ts           # Rate limiting
│   │   └── requestValidator.ts      # Zod validation
│   ├── controllers/
│   │   ├── DocketController.ts      # Docket endpoints
│   │   ├── ZoneController.ts        # Zone endpoints
│   │   ├── ReaderController.ts      # Reader endpoints
│   │   └── HealthController.ts      # Health checks
│   ├── routes/
│   │   ├── index.ts                 # Route aggregator
│   │   ├── docket.routes.ts         # Docket routes
│   │   ├── zone.routes.ts           # Zone routes
│   │   ├── reader.routes.ts         # Reader routes
│   │   └── health.routes.ts         # Health routes
│   └── schemas/
│       └── docket.schema.ts         # Validation schemas
├── websocket/
│   └── SocketServer.ts              # WebSocket server
└── index.ts                         # Exports
```

## HTTP Server

### Middleware Stack

The middleware is applied in this order:

1. **Helmet** - Security headers (CSP, X-Frame-Options, etc.)
2. **CORS** - Cross-origin resource sharing
3. **Compression** - gzip compression for responses
4. **Body Parser** - JSON and URL-encoded parsing
5. **Correlation ID** - Adds X-Request-ID to all requests
6. **Morgan** - HTTP request logging
7. **Rate Limiter** - 100 requests/minute per IP
8. **Request Logger** - Structured logging with context
9. **Routes** - API endpoints
10. **Error Handler** - Global error handling

### Starting the Server

```typescript
import { container } from 'tsyringe';
import { Server } from './presentation/http/Server';

// Configure
container.register('ServerConfig', {
  useValue: {
    port: 3000,
    corsOrigins: ['http://localhost:3000'],
  },
});

// Start server
const server = container.resolve(Server);
await server.start();

console.log('Server running on port 3000');
```

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
```

## API Endpoints

### Dockets

#### Register Docket
```http
POST /api/dockets
Content-Type: application/json

{
  "labNumber": "FSL-2024-000001",
  "caseReference": "Armed Robbery - Main Street",
  "rfidEpc": "E28011606000204DECA48DA",
  "evidenceType": "firearm",
  "metadata": {
    "officer": "Smith",
    "priority": "high"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "labNumber": "FSL-2024-000001",
    "caseReference": "Armed Robbery - Main Street",
    "status": "active"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Search Dockets
```http
GET /api/dockets?q=robbery&status=active&limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "labNumber": "FSL-2024-000001",
      "caseReference": "Armed Robbery - Main Street",
      "status": "active",
      "currentZone": "Evidence Storage A",
      "lastSeen": "2024-01-15T10:25:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### Get Docket Details
```http
GET /api/dockets/FSL-2024-000001
```

#### Get Location History
```http
GET /api/dockets/FSL-2024-000001/history?hours=24
```

### Zones

#### Get All Zones
```http
GET /api/zones
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "zoneId": 1,
      "zoneName": "Evidence Storage A",
      "zoneType": "storage",
      "capacity": 10000,
      "currentOccupancy": 234,
      "occupancyPercentage": 2.34,
      "status": "normal"
    }
  ],
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "..."
  }
}
```

#### Get Zone Dockets
```http
GET /api/zones/1/dockets?limit=5
```

### Readers

#### Get All Readers
```http
GET /api/readers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "readerId": "FX7500-01",
      "readerName": "Storage A - North",
      "ipAddress": "192.168.1.101",
      "zoneId": 1,
      "status": "online",
      "lastSeen": "2024-01-15T10:29:55.000Z",
      "configuration": {
        "transmitPower": 25,
        "antennas": [1, 2, 3, 4]
      }
    }
  ],
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "..."
  }
}
```

### Health

#### Simple Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

#### Detailed Health Check
```http
GET /health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "healthy",
      "stats": {
        "connections": 10,
        "idle": 8,
        "waiting": 0
      }
    },
    "rfid": {
      "status": "healthy",
      "readers": 8,
      "metrics": {
        "totalReads": 15234,
        "readRate": 42
      }
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "heapUsed": "245MB",
        "heapTotal": "512MB",
        "percentage": "48%"
      }
    }
  }
}
```

## Error Responses

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "labNumber",
        "message": "Lab number must be in format FSL-YYYY-NNNNNN"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400) - Input validation failed
- `NOT_FOUND` (404) - Resource not found
- `DOMAIN_ERROR` (400) - Business rule violation
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_SERVER_ERROR` (500) - Unexpected error

## WebSocket Server

### Features

- Real-time event broadcasting
- Room-based subscriptions
- Automatic reconnection
- CORS support
- Multiple transport methods (WebSocket, polling)

### Events Emitted to Clients

| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Client connected successfully | `{ socketId, timestamp }` |
| `subscribed` | Subscription confirmed | `{ type, zoneIds/labNumber, timestamp }` |
| `tag:detected` | RFID tag detected | `{ labNumber, epc, zoneId, readerId, timestamp, rssi }` |
| `docket:moved` | Docket moved between zones | `{ labNumber, fromZoneId, toZoneId, timestamp }` |
| `zone:occupancy` | Zone occupancy changed | `{ zoneId, occupancy, capacity, occupancyPercentage, status, timestamp }` |
| `server:shutdown` | Server shutting down | `{ message, timestamp }` |
| `error` | Error occurred | `{ code, message }` |

### Client Usage

```javascript
import io from 'socket.io-client';

// Connect
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
});

// Connection event
socket.on('connected', (data) => {
  console.log('Connected:', data.socketId);
});

// Subscribe to zones
socket.emit('subscribe:zones', [1, 2, 3]);

// Subscribe to specific docket
socket.emit('subscribe:docket', 'FSL-2024-000001');

// Subscribe to all readers
socket.emit('subscribe:readers');

// Listen for tag detections
socket.on('tag:detected', (data) => {
  console.log('Tag detected:', data);
  // { labNumber, epc, zoneId, readerId, timestamp, rssi }
});

// Listen for docket movements
socket.on('docket:moved', (data) => {
  console.log('Docket moved:', data);
  // { labNumber, fromZoneId, toZoneId, timestamp }
});

// Listen for zone occupancy changes
socket.on('zone:occupancy', (data) => {
  console.log('Zone occupancy:', data);
  // { zoneId, occupancy, capacity, occupancyPercentage, status, timestamp }
});

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Unsubscribe
socket.emit('unsubscribe:zones', [1, 2, 3]);
socket.emit('unsubscribe:docket', 'FSL-2024-000001');
socket.emit('unsubscribe:readers');

// Disconnect
socket.disconnect();
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useRealTimeUpdates = (zoneIds: number[]) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tagDetections, setTagDetections] = useState([]);

  useEffect(() => {
    // Connect
    const newSocket = io(process.env.REACT_APP_WS_URL);
    setSocket(newSocket);

    // Subscribe to zones
    newSocket.emit('subscribe:zones', zoneIds);

    // Listen for events
    newSocket.on('tag:detected', (data) => {
      setTagDetections((prev) => [data, ...prev].slice(0, 100));
    });

    // Cleanup
    return () => {
      newSocket.emit('unsubscribe:zones', zoneIds);
      newSocket.disconnect();
    };
  }, [zoneIds]);

  return { socket, tagDetections };
};
```

## Validation Schemas

All request validation uses Zod for type-safe validation.

### Docket Schema

```typescript
import { z } from 'zod';

const createDocketSchema = z.object({
  labNumber: z.string()
    .regex(/^FSL-\d{4}-\d{6}$/, 'Invalid format'),
  caseReference: z.string()
    .min(1).max(500),
  rfidEpc: z.string()
    .length(24)
    .regex(/^[0-9A-Fa-f]{24}$/),
  evidenceType: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

## Rate Limiting

### Default Rate Limit
- **Window:** 1 minute
- **Max Requests:** 100 per IP
- **Headers:** Standard RateLimit-* headers

### Response Headers
```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1642248600
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

## Security

### Helmet Security Headers

The server includes comprehensive security headers:

- **Content-Security-Policy** - XSS protection
- **X-Frame-Options** - Clickjacking protection
- **X-Content-Type-Options** - MIME sniffing protection
- **Strict-Transport-Security** - HTTPS enforcement
- **X-DNS-Prefetch-Control** - DNS prefetching control

### CORS Configuration

```typescript
{
  origin: ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'RateLimit-*'],
  maxAge: 86400
}
```

## Logging

### Request Logging

Every request is logged with:
- HTTP method and path
- Response status code
- Duration in milliseconds
- Request ID (correlation)
- User agent and IP address

### Error Logging

Errors are logged with full context:
- Error message and stack trace
- Request path and method
- Request body (sanitized)
- Request ID for correlation

### Log Levels

- `info` - Normal operations (requests, startup, shutdown)
- `debug` - Detailed information (subscriptions, events)
- `error` - Errors and exceptions
- `warn` - Warnings (high memory usage, etc.)

## Testing

### Unit Testing

```typescript
import request from 'supertest';
import { Server } from './Server';

describe('Docket API', () => {
  let server: Server;

  beforeAll(async () => {
    server = container.resolve(Server);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should create a docket', async () => {
    const response = await request(server.getApp())
      .post('/api/dockets')
      .send({
        labNumber: 'FSL-2024-000001',
        caseReference: 'Test Case',
        rfidEpc: 'E28011606000204DECA48DA',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should validate lab number format', async () => {
    const response = await request(server.getApp())
      .post('/api/dockets')
      .send({
        labNumber: 'INVALID',
        caseReference: 'Test Case',
        rfidEpc: 'E28011606000204DECA48DA',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## Performance

### Response Times

- **Simple GET requests:** < 50ms
- **Database queries:** < 100ms
- **Complex searches:** < 200ms
- **WebSocket events:** < 10ms

### Optimization Features

- **Compression:** gzip for all responses > 1KB
- **Connection pooling:** Reused database connections
- **Caching:** In-memory caching where appropriate
- **Efficient serialization:** Optimized JSON encoding

## Monitoring

### Metrics to Monitor

- Request rate (requests/second)
- Error rate (errors/minute)
- Response time (p50, p95, p99)
- Active connections (HTTP + WebSocket)
- Memory usage
- Database connection pool

### Health Checks

Use `/health/detailed` for comprehensive monitoring:
- Database connectivity
- RFID gateway status
- Memory usage
- Process uptime

## Deployment

### Environment Variables

```bash
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://app.example.com,https://admin.example.com
LOG_LEVEL=info
```

### Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Configure CORS origins
- [ ] Set up HTTPS/TLS
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Configure log aggregation
- [ ] Set up health check endpoints
- [ ] Test graceful shutdown
- [ ] Load testing completed
- [ ] Security headers verified

## License

[Your License]
