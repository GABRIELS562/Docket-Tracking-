# Swagger/OpenAPI Quick Reference

## Access Points

| Resource | URL |
|----------|-----|
| Interactive Docs | `http://localhost:8080/api/docs` |
| OpenAPI JSON | `http://localhost:8080/api/docs/openapi.json` |
| Root API | `http://localhost:8080/api` |

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `swagger.ts` | 150 | Swagger UI setup, configuration |
| `openapi.yaml` | 1687 | Main OpenAPI 3.0.3 specification |
| `schemas/common.yaml` | 1003 | Errors, pagination, analytics |
| `schemas/auth.yaml` | 371 | Authentication endpoints |
| `schemas/docket.yaml` | 346 | Item/docket management |
| `schemas/zone.yaml` | 390 | Zone definitions |
| `schemas/reader.yaml` | 407 | RFID reader management |
| `schemas/tenant.yaml` | 347 | Multi-tenant management |

## Quick Commands

### Start Server with Swagger
```bash
pnpm run dev
# Then open: http://localhost:8080/api/docs
```

### TypeScript Validation
```bash
pnpm typecheck
```

### Build for Production
```bash
pnpm run build
```

## API Quick Reference

### Authentication Flow
```bash
# 1. Login
POST /api/auth/login
Body: { email, password, tenantSlug }
Response: { accessToken, refreshToken, expiresIn: "15m", user, tenant }

# 2. Refresh (before 15min expires)
POST /api/auth/refresh
Header: Authorization: Bearer <refreshToken>

# 3. Logout
POST /api/auth/logout
Header: Authorization: Bearer <token>
```

### Common Patterns

**Get Current User**
```bash
GET /api/auth/me
Header: Authorization: Bearer <token>
```

**Search Items with Pagination**
```bash
GET /api/items?q=search&limit=10&offset=0&sortBy=createdAt&sortOrder=desc
Header: Authorization: Bearer <token>
```

**Create Item**
```bash
POST /api/items
Header: Authorization: Bearer <token>
Body: {
  itemNumber, rfidEpc, description, category,
  [referenceId], [serialNumber], [receivedBy], [metadata]
}
```

**Get Zone Analytics**
```bash
GET /api/analytics/zones/{zoneId}?startDate=...&endDate=...&granularity=hour
Header: Authorization: Bearer <token>
```

**Get Item Journey**
```bash
GET /api/flow/journey/{itemNumber}
Header: Authorization: Bearer <token>
```

## Schema Validation Rules

### Item Number
- Required, unique per tenant
- Pattern: `^[A-Za-z0-9][A-Za-z0-9\-\/_]{0,49}$`
- Max 50 chars
- Example: `INV-2025-000001`

### RFID EPC
- Required
- Exactly 24 hexadecimal characters
- Pattern: `^[0-9A-Fa-f]{24}$`
- Example: `E28011700000020F4A901234`

### Category
One of: `equipment`, `consumable`, `electronic`, `document`, `material`, `tool`, `apparel`, `container`, `sample`, `other`

### Item Status
One of: `registered`, `in_transit`, `in_processing`, `archived`, `disposed`, `missing`

### User Roles
- `viewer`: Read-only
- `operator`: Can manage resources
- `admin`: Full control
- `owner`: Tenant owner

### Tenant Plans
- `free`: 10 items, 2 zones, 2 readers
- `starter`: 100 items, 5 zones, 5 readers
- `professional`: 1000 items, 20 zones, 20 readers
- `enterprise`: Unlimited

## Response Format

### Success (Any 2xx)
```json
{
  "success": true,
  "data": { /* endpoint-specific */ },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "requestId": "uuid",
    "duration": 45
  }
}
```

### Error (Any 4xx/5xx)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human message",
    "details": [{ "field": "name", "message": "error" }]
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

## Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate (item number, slug, etc) |
| `RATE_LIMIT_EXCEEDED` | 429 | 100 requests/min exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

## Endpoint Categories

| Category | Endpoint Count | Path |
|----------|---|---|
| Health | 2 | `/api/health*` |
| Auth | 5 | `/api/auth/*` |
| Items | 4 | `/api/items*` |
| Zones | 2 | `/api/zones*` |
| Readers | 1 | `/api/readers` |
| Analytics | 7 | `/api/analytics/*` |
| Flow Analytics | 5 | `/api/flow/*` |
| Tenants | 9 | `/api/tenants*` |
| Pathfinding | 4 | `/api/pathfinding/*` |
| Spatial | 1 | `/api/spatial/*` |
| **Total** | **40** | |

## Development Tips

### Add New Endpoint

1. Create route handler in `src/presentation/http/routes/`
2. Add JSDoc annotation (swagger-jsdoc) OR update `openapi.yaml`
3. Add new schemas to appropriate file in `schemas/`
4. Restart server - Swagger UI auto-updates

### Modify Schema

1. Edit `src/presentation/http/openapi/schemas/[domain].yaml`
2. Restart server

### Export OpenAPI Spec

```bash
curl http://localhost:8080/api/docs/openapi.json > openapi.json
```

### Generate Client SDK

```bash
npm install -g @openapitools/openapi-generator-cli

openapi-generator-cli generate \
  -i http://localhost:8080/api/docs/openapi.json \
  -g typescript-axios \
  -o ./generated/api-client
```

## Dependencies

```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.1"
}
```

## Authentication Example

```bash
# 1. Get token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}' \
  | jq -r '.data.accessToken')

# 2. Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/items

# 3. Refresh if expired
NEW_TOKEN=$(curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data.accessToken')
```

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- **Response**: 429 with `RATE_LIMIT_EXCEEDED` error

## WebSocket Events

Connect to: `ws://localhost:8080/socket.io?token=<jwt>`

```javascript
socket.on('tag:detected', data => { /* itemNumber, rfidEpc, zoneId, readerId */ });
socket.on('docket:moved', data => { /* itemNumber, fromZoneId, toZoneId */ });
socket.on('zone:occupancy', data => { /* zoneId, occupancy, capacity */ });
```

## Support

- Full docs: See `OPENAPI_SETUP_GUIDE.md`
- OpenAPI spec: https://spec.openapis.org/oas/v3.0.3
- Swagger UI: https://swagger.io/tools/swagger-ui/
- Help: Check server logs or `/api` root endpoint
