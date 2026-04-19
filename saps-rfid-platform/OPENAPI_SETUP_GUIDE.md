# OpenAPI/Swagger Documentation Setup Guide

## Overview

This document describes the complete OpenAPI 3.0.3 specification for the RFID Inventory Platform API. The API uses JWT Bearer authentication and implements a multi-tenant architecture with real-time tracking capabilities.

**Documentation URL**: `http://localhost:8080/api/docs`
**OpenAPI JSON**: `http://localhost:8080/api/docs/openapi.json`

## Quick Start

### 1. Accessing API Documentation

Once the server is running:

```bash
# Start development server
pnpm run dev

# Open in browser
# Interactive docs: http://localhost:8080/api/docs
# Raw OpenAPI JSON: http://localhost:8080/api/docs/openapi.json
```

The Swagger UI provides:
- Interactive API exploration
- Try-it-out functionality for all endpoints
- Real-time schema validation
- Request/response examples

### 2. Authentication

All endpoints (except login, signup, and health checks) require JWT Bearer authentication:

```bash
# 1. Login to get tokens
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "tenantSlug": "acme-corp"
  }'

# Response includes accessToken and refreshToken
# {
#   "success": true,
#   "data": {
#     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
#     "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
#     "expiresIn": "15m",
#     "user": { ... },
#     "tenant": { ... }
#   }
# }

# 2. Include token in Authorization header
curl -X GET http://localhost:8080/api/items \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Token Expiration**: 15 minutes for access token, refresh tokens are long-lived

**Refresh Tokens**: Use the refresh endpoint before expiration:
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```

## Architecture

### File Structure

```
src/presentation/http/
├── swagger.ts                    # Swagger/OpenAPI setup
├── swagger-paths.ts             # JSDoc path annotations
├── openapi/
│   ├── openapi.yaml            # Main OpenAPI 3.0.3 spec (1687 lines)
│   └── schemas/
│       ├── common.yaml         # Error, pagination, analytics schemas
│       ├── auth.yaml           # Authentication schemas
│       ├── docket.yaml         # Item/docket schemas
│       ├── zone.yaml           # Zone schemas
│       ├── reader.yaml         # RFID reader schemas
│       └── tenant.yaml         # Tenant/multi-tenant schemas
```

### Modular Schema Organization

Schemas are separated by domain for maintainability:

- **common.yaml** (1003 lines): Error responses, pagination, health checks, analytics
- **auth.yaml** (371 lines): Login, refresh, user, password change
- **docket.yaml** (346 lines): Items, categories, status, history
- **zone.yaml** (390 lines): Zone definitions, occupancy, occupancy analytics
- **reader.yaml** (407 lines): RFID readers, antennas, performance metrics
- **tenant.yaml** (347 lines): Tenant organization, plans, usage, branding

### Swagger UI Configuration

```typescript
// Located in: src/presentation/http/swagger.ts
swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RFID Platform API Documentation',
  swaggerOptions: {
    persistAuthorization: true,      // Remember Bearer token
    displayRequestDuration: true,    // Show response time
    filter: true,                    // Enable endpoint filtering
    docExpansion: 'none',           // Collapsed by default
    tryItOutEnabled: true,          // Enable "Try it out"
  },
})
```

## API Endpoints Overview

### Authentication (5 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh access token | Yes |
| POST | `/api/auth/logout` | Logout and invalidate tokens | Yes |
| GET | `/api/auth/me` | Get current user profile | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |

### Items (3 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/items` | Search items with filters | Yes |
| POST | `/api/items` | Register new item | Yes |
| GET | `/api/items/{itemNumber}` | Get item details | Yes |
| GET | `/api/items/{itemNumber}/history` | Get item location history | Yes |

### Zones (2 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/zones` | Get all zones with occupancy | Yes |
| GET | `/api/zones/{zoneId}/items` | Get items in zone | Yes |

### Readers (1 endpoint)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/readers` | Get all RFID readers | Yes |

### Analytics (7 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/analytics/dashboard` | Dashboard metrics | Yes |
| GET | `/api/analytics/zones` | Zone analytics | Yes |
| GET | `/api/analytics/zones/{zoneId}` | Single zone analytics | Yes |
| GET | `/api/analytics/readers` | Reader performance | Yes |
| GET | `/api/analytics/readers/{readerId}` | Single reader analytics | Yes |
| GET | `/api/analytics/system` | System metrics | Yes |
| GET | `/api/analytics/export` | Export analytics (JSON/CSV) | Yes |

### Flow Analytics (5 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/flow/journey/{itemNumber}` | Item journey through zones | Yes |
| GET | `/api/flow/zones` | Zone-to-zone flow matrix | Yes |
| GET | `/api/flow/bottlenecks` | Bottleneck analysis | Yes |
| GET | `/api/flow/patterns` | Common path patterns | Yes |
| GET | `/api/flow/anomalies` | Flow anomalies detection | Yes |

### Tenants (9 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/tenants` | Create tenant (signup) | No |
| GET | `/api/tenants` | List all tenants (admin) | Yes |
| GET | `/api/tenants/check-slug/{slug}` | Check slug availability | No |
| GET | `/api/tenants/current` | Get current tenant | Yes |
| GET | `/api/tenants/current/usage` | Get tenant usage | Yes |
| PATCH | `/api/tenants/current/branding` | Update branding | Yes |
| PATCH | `/api/tenants/current/settings` | Update settings | Yes |
| GET | `/api/tenants/{id}` | Get tenant by ID (admin) | Yes |
| POST | `/api/tenants/{id}/suspend` | Suspend tenant (admin) | Yes |
| POST | `/api/tenants/{id}/reactivate` | Reactivate tenant (admin) | Yes |
| POST | `/api/tenants/{id}/upgrade` | Upgrade subscription (admin) | Yes |

### Pathfinding (4 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/pathfinding/find` | Find path between points | Yes |
| POST | `/api/pathfinding/route` | Find route through zones | Yes |
| GET | `/api/pathfinding/graph` | Get zone connectivity graph | Yes |
| GET | `/api/pathfinding/zones/{fromZoneId}/{toZoneId}` | Path between zones | Yes |

### Spatial Analytics (1 endpoint)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/spatial/health` | Spatial service health | No |

### Health (2 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Simple health check | No |
| GET | `/api/health/detailed` | Detailed health check | No |

**Total: 44 endpoints**

## Common Request/Response Patterns

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response payload varies by endpoint
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "duration": 45
  }
}
```

### Error Response

All errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific field error"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "duration": 45
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400) - Request validation failed
- `UNAUTHORIZED` (401) - Authentication required or invalid token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists (e.g., duplicate item number)
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

### Pagination

List endpoints support pagination:

```bash
GET /api/items?limit=10&offset=0&sortBy=createdAt&sortOrder=desc

# Response includes pagination metadata
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "total": 100,
      "limit": 10,
      "offset": 0,
      "hasMore": true,
      "currentPage": 1,
      "totalPages": 10
    }
  }
}
```

**Parameters**:
- `limit`: 1-100 (default: 10)
- `offset`: 0+ (default: 0)
- `sortBy`: createdAt, itemNumber, referenceId, lastSeenAt
- `sortOrder`: asc or desc (default: desc)

## Key Schemas

### Item/Docket Schema

```yaml
Item:
  type: object
  properties:
    id: string (uuid)
    itemNumber: string (unique within tenant, e.g., "INV-2025-000001")
    referenceId: string (external reference, e.g., "PO-12345")
    rfidEpc: string (24-char hex, e.g., "E28011700000020F4A901234")
    description: string
    category: enum [equipment, consumable, electronic, document, material, tool, apparel, container, sample, other]
    status: enum [registered, in_transit, in_processing, archived, disposed, missing]
    currentZoneId: uuid (nullable)
    currentZoneName: string
    lastSeenAt: datetime
    createdAt: datetime
    metadata: object (custom fields)
```

**Create Item Requirements**:
- `itemNumber`: Required, alphanumeric with hyphen/underscore, max 50 chars
- `rfidEpc`: Required, exactly 24 hex characters
- `description`: Required, 1-500 chars
- `category`: Required, one of 10 categories
- `referenceId`: Optional, max 100 chars
- `serialNumber`: Optional
- `receivedBy`: Optional
- `metadata`: Optional custom fields

### User Schema

```yaml
User:
  type: object
  properties:
    id: uuid
    email: string (email format)
    firstName: string
    lastName: string
    role: enum [viewer, operator, admin, owner]
    status: enum [active, inactive, suspended]
    lastLoginAt: datetime (nullable)
    createdAt: datetime
```

**Roles**:
- `viewer`: Read-only access to dashboards and reports
- `operator`: Can manage items, zones, and readers
- `admin`: Full control including user management
- `owner`: Tenant owner with billing access

### Tenant Schema

```yaml
Tenant:
  type: object
  properties:
    id: uuid
    name: string (2-100 chars)
    slug: string (3-50 chars, lowercase alphanumeric-hyphen)
    plan: enum [free, starter, professional, enterprise]
    status: enum [active, suspended, cancelled]
    settings: object (custom settings)
    branding:
      logo: string (URL)
      primaryColor: string (hex, e.g., "#FF0000")
      secondaryColor: string (hex)
    createdAt: datetime
```

**Plan Limits** (approximate):
- `free`: 10 items, 2 zones, 2 readers
- `starter`: 100 items, 5 zones, 5 readers
- `professional`: 1000 items, 20 zones, 20 readers
- `enterprise`: Unlimited, custom limits

## Rate Limiting

API implements rate limiting of **100 requests per minute per IP**:

```bash
# Response headers
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1640000000
```

When limit is exceeded, receive 429 response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

## Multi-Tenant Isolation

All requests are automatically scoped to the authenticated user's tenant:

- Tenants cannot access other tenants' data
- Database includes `tenant_id` on all tables
- Cache keys are namespaced: `tenant:{tenant_id}:item:{item_id}`
- No additional headers required (tenant determined from JWT)

## WebSocket Events

Real-time updates are available via WebSocket at `/socket.io`:

```javascript
// Connect
const socket = io('http://localhost:8080', {
  auth: { token: 'Bearer <token>' }
});

// Subscribe to events
socket.on('tag:detected', (data) => {
  console.log('RFID tag detected:', data);
  // { itemNumber, rfidEpc, zoneId, readerId, timestamp }
});

socket.on('docket:moved', (data) => {
  console.log('Item moved:', data);
  // { itemNumber, fromZoneId, toZoneId, timestamp }
});

socket.on('zone:occupancy', (data) => {
  console.log('Zone occupancy changed:', data);
  // { zoneId, occupancy, capacity, percentage }
});
```

## Development Workflow

### 1. Update OpenAPI Spec

**Option A**: Using swagger-jsdoc annotations (JSDoc in routes)

```typescript
/**
 * @openapi
 * /api/items:
 *   get:
 *     tags:
 *       - Items
 *     summary: Search items
 *     parameters:
 *       - name: q
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
```

**Option B**: Edit YAML files directly

Edit `/src/presentation/http/openapi/openapi.yaml` or schemas in `/src/presentation/http/openapi/schemas/`

### 2. Generate/Update OpenAPI JSON

Automatically generated on server startup via `swaggerSpec` in swagger.ts

To export to file:

```bash
# Add to your app initialization
import { generateOpenApiFile } from './presentation/http/swagger';
generateOpenApiFile('./openapi.json');
```

### 3. Validate OpenAPI Spec

```bash
# Using swagger-cli (install separately if needed)
npm install -g swagger-cli
swagger-cli validate src/presentation/http/openapi/openapi.yaml
```

### 4. Generate Client SDK (Optional)

Using OpenAPI Generator:

```bash
# Install
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:8080/api/docs/openapi.json \
  -g typescript-axios \
  -o ./generated/api-client
```

## Testing with Examples

### Example 1: Register an Item

```bash
curl -X POST http://localhost:8080/api/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "itemNumber": "INV-2025-000042",
    "rfidEpc": "E28011700000020F4A901234",
    "description": "Laptop Computer - Dell XPS 15",
    "category": "electronic",
    "referenceId": "PO-54321",
    "serialNumber": "SN-DEL-XPS-001",
    "receivedBy": "John Doe"
  }'

# Response (201)
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "itemNumber": "INV-2025-000042",
    "rfidEpc": "E28011700000020F4A901234",
    "description": "Laptop Computer - Dell XPS 15",
    "category": "electronic",
    "status": "registered",
    "currentZoneId": null,
    "currentZoneName": null,
    "createdAt": "2025-01-01T12:00:00.000Z",
    "updatedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

### Example 2: Search Items with Filters

```bash
curl "http://localhost:8080/api/items?q=laptop&category=electronic&status=registered&limit=10&offset=0" \
  -H "Authorization: Bearer <token>"

# Response includes pagination
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "total": 5,
      "limit": 10,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### Example 3: Get Item Journey

```bash
curl "http://localhost:8080/api/flow/journey/INV-2025-000042" \
  -H "Authorization: Bearer <token>"

# Response shows complete path through zones
{
  "success": true,
  "data": {
    "itemNumber": "INV-2025-000042",
    "path": [
      {
        "zoneId": "...",
        "zoneName": "Receiving Bay",
        "enteredAt": "2025-01-01T08:00:00.000Z",
        "exitedAt": "2025-01-01T08:45:00.000Z",
        "dwellMinutes": 45
      },
      {
        "zoneId": "...",
        "zoneName": "Processing Lab",
        "enteredAt": "2025-01-01T08:45:00.000Z",
        "exitedAt": null,
        "dwellMinutes": 180
      }
    ],
    "transitions": [
      {
        "fromZone": "Receiving Bay",
        "toZone": "Processing Lab",
        "transitionTime": "2025-01-01T08:45:00.000Z",
        "durationMinutes": 5
      }
    ]
  }
}
```

### Example 4: Create Tenant (Signup)

```bash
curl -X POST http://localhost:8080/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "ownerEmail": "owner@acme.com",
    "ownerPassword": "SecurePassword123!",
    "ownerFirstName": "Jane",
    "ownerLastName": "Doe"
  }'

# Response (201)
{
  "success": true,
  "data": {
    "tenant": {
      "id": "...",
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "plan": "free",
      "status": "active"
    },
    "owner": {
      "id": "...",
      "email": "owner@acme.com",
      "role": "owner"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## Troubleshooting

### Swagger UI not loading

1. Check server is running: `http://localhost:8080/api/docs`
2. Verify swagger-jsdoc dependencies: `npm list swagger-jsdoc swagger-ui-express`
3. Check console for errors in server startup

### Token-related errors

- **401 Unauthorized**: Token missing or expired
  - Solution: Get new token via `/api/auth/login` or `/api/auth/refresh`

- **403 Forbidden**: User lacks required role
  - Solution: Check user role in `/api/auth/me`, may need admin approval

### Schema validation errors

- Update routes/schemas and restart server
- OpenAPI spec auto-updates from JSDoc and YAML files
- Validate YAML syntax in schema files

### Cross-origin errors with Swagger UI

CORS is configured in Server.ts:
```typescript
cors({
  origin: this.config.corsOrigins || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
})
```

Update `corsOrigins` in environment config if needed.

## References

- **OpenAPI 3.0.3 Spec**: https://spec.openapis.org/oas/v3.0.3
- **Swagger UI Docs**: https://swagger.io/tools/swagger-ui/
- **swagger-jsdoc**: https://github.com/Surnet/swagger-jsdoc
- **JWT Authentication**: https://jwt.io/

## Updates & Maintenance

### To add a new endpoint:

1. Implement route in `src/presentation/http/routes/*.ts`
2. Add JSDoc `@openapi` annotation with full path definition, OR
3. Update `src/presentation/http/openapi/openapi.yaml` with path
4. Add any new schemas to appropriate file in `schemas/` folder
5. Restart server - Swagger UI auto-updates

### To modify schemas:

1. Edit relevant YAML file in `schemas/` folder
2. Update references in paths if needed
3. Restart server for changes to take effect

### To export OpenAPI spec:

```bash
# Get current spec as JSON
curl http://localhost:8080/api/docs/openapi.json > openapi.json

# Or use the generateOpenApiFile function in code
```

## Summary

The RFID Platform API provides a complete, well-documented REST interface with:
- **44 endpoints** across 9 feature areas
- **JWT Bearer authentication** with token refresh
- **Multi-tenant isolation** by design
- **Real-time WebSocket events** for live updates
- **Comprehensive OpenAPI 3.0.3 specification** with Swagger UI
- **Modular schema organization** (7 YAML files)
- **Consistent error handling** with detailed error codes
- **Rate limiting** at 100 req/min per IP
- **Full pagination support** on list endpoints

Access documentation at: **http://localhost:8080/api-docs**
