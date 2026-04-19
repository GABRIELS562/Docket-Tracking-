# OpenAPI/Swagger Documentation Index

## Quick Links

| Resource | URL | Purpose |
|----------|-----|---------|
| **Interactive Docs** | `http://localhost:8080/api/docs` | Live Swagger UI |
| **OpenAPI JSON** | `http://localhost:8080/api/docs/openapi.json` | Machine-readable spec |
| **API Root** | `http://localhost:8080/api` | Endpoint overview |
| **Health Check** | `http://localhost:8080/api/health` | System status |

## Documentation Files

### For Learning the API

1. **`SWAGGER_QUICK_REFERENCE.md`** (Read First)
   - Quick commands and access points
   - 5-minute overview
   - Common patterns and examples
   - Error codes quick lookup

2. **`OPENAPI_SETUP_GUIDE.md`** (Complete Reference)
   - Full API documentation
   - Endpoint details and examples
   - Schema documentation
   - Authentication workflows
   - Troubleshooting guide

3. **`SWAGGER_IMPLEMENTATION_SUMMARY.md`** (Overview)
   - What was implemented
   - File locations and statistics
   - Development workflow
   - Quick start instructions

### For Implementation

4. **`src/presentation/http/swagger.ts`** (Code)
   - Swagger UI configuration
   - OpenAPI spec generation
   - Middleware setup

5. **`src/presentation/http/openapi/openapi.yaml`** (Main Spec)
   - Complete OpenAPI 3.0.3 specification
   - All 44 endpoints defined
   - All response schemas

### For Schemas

6. **`src/presentation/http/openapi/schemas/common.yaml`**
   - Errors, pagination, health, analytics

7. **`src/presentation/http/openapi/schemas/auth.yaml`**
   - Authentication schemas

8. **`src/presentation/http/openapi/schemas/docket.yaml`**
   - Item/docket schemas

9. **`src/presentation/http/openapi/schemas/zone.yaml`**
   - Zone schemas

10. **`src/presentation/http/openapi/schemas/reader.yaml`**
    - RFID reader schemas

11. **`src/presentation/http/openapi/schemas/tenant.yaml`**
    - Tenant/multi-tenant schemas

## Navigation Guide

### I want to...

**Access the API Documentation**
→ Open `http://localhost:8080/api/docs` in browser

**Understand Authentication**
→ Read "Authentication" section in `OPENAPI_SETUP_GUIDE.md`

**See All Available Endpoints**
→ Read "API Endpoints Overview" in `OPENAPI_SETUP_GUIDE.md`

**Test an Endpoint**
→ Use Swagger UI at `/api/docs` or copy example from `OPENAPI_SETUP_GUIDE.md`

**Learn Response Format**
→ See "Common Request/Response Patterns" in `OPENAPI_SETUP_GUIDE.md`

**Understand Error Codes**
→ See "Error Codes" section in `SWAGGER_QUICK_REFERENCE.md`

**Add a New Endpoint**
→ See "Development Workflow" in `OPENAPI_SETUP_GUIDE.md`

**Find Schema Details**
→ Search in appropriate `schemas/*.yaml` file

**Generate Client SDK**
→ See "Generate Client SDK" in `SWAGGER_QUICK_REFERENCE.md`

**Troubleshoot Issues**
→ See "Troubleshooting" in `OPENAPI_SETUP_GUIDE.md`

## File Statistics

```
Total OpenAPI Documentation: 4,551 lines of YAML
├── Main Spec: openapi.yaml (1,687 lines)
├── Common Schemas: common.yaml (1,003 lines)
├── Auth Schemas: auth.yaml (371 lines)
├── Zone Schemas: zone.yaml (390 lines)
├── Reader Schemas: reader.yaml (407 lines)
├── Docket Schemas: docket.yaml (346 lines)
└── Tenant Schemas: tenant.yaml (347 lines)

Total Guides: 800+ lines
├── Setup Guide: OPENAPI_SETUP_GUIDE.md
├── Quick Reference: SWAGGER_QUICK_REFERENCE.md
└── Implementation Summary: SWAGGER_IMPLEMENTATION_SUMMARY.md

Code Files:
├── swagger.ts (355 lines)
└── Server.ts (updated)
```

## Key Statistics

- **Endpoints**: 44 total
- **Categories**: 10 (Health, Auth, Items, Zones, Readers, Analytics, Flow, Tenants, Pathfinding, Spatial)
- **Schemas**: 40+
- **Error Codes**: 7
- **HTTP Methods**: 5 (GET, POST, PUT, DELETE, PATCH)
- **Authentication**: JWT Bearer
- **Response Format**: Consistent JSON structure

## Common Tasks

### 1. Get API Token
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

### 2. Make Authenticated Request
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/items
```

### 3. View OpenAPI Spec
```bash
curl http://localhost:8080/api/docs/openapi.json
```

### 4. Start Development Server
```bash
cd saps-rfid-platform
pnpm run dev
```

### 5. Validate TypeScript
```bash
pnpm typecheck
```

## OpenAPI Structure

```
OpenAPI 3.0.3 Specification
├── Info
│   ├── Title: "RFID Inventory Platform API"
│   ├── Version: "1.0.0"
│   └── Description: Complete overview
├── Servers
│   ├── Development (localhost:8080)
│   └── Production (api.rfid-platform.com)
├── Security
│   └── Bearer JWT Authentication
├── Tags (10 categories)
│   ├── Health
│   ├── Authentication
│   ├── Items
│   ├── Zones
│   ├── Readers
│   ├── Analytics
│   ├── Flow Analytics
│   ├── Tenants
│   ├── Pathfinding
│   └── Spatial
├── Paths (44 endpoints)
│   ├── GET, POST, PUT, DELETE, PATCH
│   └── All with request/response schemas
└── Components
    ├── Schemas (40+)
    ├── SecuritySchemes (JWT Bearer)
    └── Responses (standard error formats)
```

## Response Format

All responses follow consistent structure:

**Success (2xx)**
```json
{
  "success": true,
  "data": { /* payload */ },
  "meta": { "timestamp", "requestId", "duration" }
}
```

**Error (4xx/5xx)**
```json
{
  "success": false,
  "error": { "code", "message", "details" },
  "meta": { "timestamp", "requestId" }
}
```

## Getting Help

1. **Quick Questions** → Check `SWAGGER_QUICK_REFERENCE.md`
2. **Detailed Info** → Check `OPENAPI_SETUP_GUIDE.md`
3. **Implementation** → Check `SWAGGER_IMPLEMENTATION_SUMMARY.md`
4. **Schema Details** → Check `schemas/*.yaml` files
5. **Interactive Testing** → Use Swagger UI at `/api/docs`
6. **Code** → Check `swagger.ts` and route files

## Development Resources

- **OpenAPI Spec**: https://spec.openapis.org/oas/v3.0.3
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **swagger-jsdoc**: https://github.com/Surnet/swagger-jsdoc
- **JWT**: https://jwt.io/

## Server Information

- **Language**: TypeScript
- **Framework**: Express.js
- **Port**: 8080 (default)
- **API Prefix**: `/api`
- **Docs Endpoint**: `/api/docs`
- **OpenAPI JSON**: `/api/docs/openapi.json`

## Next Steps

1. ✓ Start server: `pnpm run dev`
2. ✓ View docs: `http://localhost:8080/api/docs`
3. ✓ Login: Use example from QUICK_REFERENCE
4. ✓ Try endpoints: Use Swagger UI or curl
5. ✓ Read full guide: `OPENAPI_SETUP_GUIDE.md`

---

**Last Updated**: April 19, 2026
**Status**: Complete and Production-Ready
**Specification Version**: OpenAPI 3.0.3
