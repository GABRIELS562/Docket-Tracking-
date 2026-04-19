# REST API Contract — Core Docket Tracking

**Version**: 1.0
**Base URL**: `/api/v1`
**Auth**: JWT Bearer token (after LDAP/local auth)

---

## 1. Items (Dockets)

### 1.1 Search Items

```http
GET /api/v1/items/search?q={query}&page={page}&limit={limit}
```

**Query Parameters**:

- `q` (required): Search query (matches item_number, reference_id, station_charge)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (comma-separated)
- `zone_id` (optional): Filter by current zone

**Response**:

```json
{
  "data": [
    {
      "id": "uuid",
      "itemNumber": "LAB-2024-001234",
      "referenceId": "CASE-2024-001",
      "stationCharge": "CPS-001",
      "status": "REGISTERED",
      "currentZone": {
        "id": "uuid",
        "name": "Evidence Room A",
        "code": "EVD-A"
      },
      "lastSeenAt": "2026-04-19T10:30:00Z",
      "locationConfidence": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 1.2 Get Item by ID

```http
GET /api/v1/items/{id}
```

**Response**:

```json
{
  "data": {
    "id": "uuid",
    "itemNumber": "LAB-2024-001234",
    "referenceId": "CASE-2024-001",
    "stationCharge": "CPS-001",
    "rfidTagEpc": "E280116060002004DECA48DA",
    "status": "REGISTERED",
    "currentZone": {
      "id": "uuid",
      "name": "Evidence Room A",
      "code": "EVD-A",
      "floor": 1,
      "building": "Main"
    },
    "lastSeenAt": "2026-04-19T10:30:00Z",
    "lastSeenReader": {
      "id": "uuid",
      "name": "Reader EVD-A-01"
    },
    "locationConfidence": 0.95,
    "metadata": {},
    "createdAt": "2026-01-15T08:00:00Z"
  }
}
```

### 1.3 Get Item Location History

```http
GET /api/v1/items/{id}/history?start={ISO8601}&end={ISO8601}&limit={limit}
```

**Response**:

```json
{
  "data": [
    {
      "time": "2026-04-19T10:30:00Z",
      "zone": {
        "id": "uuid",
        "name": "Evidence Room A",
        "code": "EVD-A"
      },
      "eventType": "entered",
      "confidence": 0.95,
      "reader": {
        "id": "uuid",
        "name": "Reader EVD-A-01"
      }
    }
  ]
}
```

### 1.4 Register Item (Tag Binding)

```http
POST /api/v1/items
Content-Type: application/json
```

**Request Body**:

```json
{
  "itemNumber": "LAB-2024-001234",
  "referenceId": "CASE-2024-001",
  "stationCharge": "CPS-001",
  "rfidTagEpc": "E280116060002004DECA48DA",
  "metadata": {}
}
```

**Response** (201 Created):

```json
{
  "data": {
    "id": "uuid",
    "itemNumber": "LAB-2024-001234",
    "rfidTagEpc": "E280116060002004DECA48DA",
    "status": "REGISTERED",
    "createdAt": "2026-04-19T10:30:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid input (validation error)
- `409 Conflict`: Duplicate item_number or rfid_tag_epc

---

## 2. Zones

### 2.1 List All Zones

```http
GET /api/v1/zones
```

**Response**:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Evidence Room A",
      "code": "EVD-A",
      "zoneType": "STORAGE",
      "isRestricted": false,
      "isExit": false,
      "floor": 1,
      "building": "Main",
      "capacity": 500,
      "currentOccupancy": 245,
      "occupancyPercentage": 49,
      "readers": ["uuid1", "uuid2"],
      "coordinates": { "x": 10, "y": 20, "z": 0 }
    }
  ]
}
```

### 2.2 Get Zone Items (Audit View)

```http
GET /api/v1/zones/{id}/items?page={page}&limit={limit}&stale={boolean}
```

**Query Parameters**:

- `page`, `limit`: Pagination
- `stale` (optional): Filter to items not seen >7 days

**Response**:

```json
{
  "data": [
    {
      "id": "uuid",
      "itemNumber": "LAB-2024-001234",
      "referenceId": "CASE-2024-001",
      "lastSeenAt": "2026-04-19T10:30:00Z",
      "timeInZone": "PT2H30M",
      "isStale": false
    }
  ],
  "pagination": { ... }
}
```

---

## 3. Readers

### 3.1 List All Readers

```http
GET /api/v1/readers
```

**Response**:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Reader EVD-A-01",
      "ipAddress": "192.168.1.100",
      "zoneId": "uuid",
      "zoneName": "Evidence Room A",
      "status": "ONLINE",
      "lastSeenAt": "2026-04-19T10:30:00Z",
      "health": {
        "totalReads": 150000,
        "successRate": 0.998,
        "uptimeSeconds": 86400
      }
    }
  ]
}
```

### 3.2 Restart Reader (Admin Only)

```http
POST /api/v1/readers/{id}/restart
```

**Response** (202 Accepted):

```json
{
  "message": "Reader restart initiated",
  "readerId": "uuid"
}
```

---

## 4. Alerts

### 4.1 List Alerts

```http
GET /api/v1/alerts?status={unacknowledged|acknowledged|all}&type={type}&severity={severity}
```

**Response**:

```json
{
  "data": [
    {
      "id": "uuid",
      "alertType": "EXIT",
      "severity": "HIGH",
      "message": "Docket LAB-2024-001234 exited via Main Exit",
      "item": {
        "id": "uuid",
        "itemNumber": "LAB-2024-001234"
      },
      "zone": {
        "id": "uuid",
        "name": "Main Exit"
      },
      "triggeredAt": "2026-04-19T10:30:00Z",
      "acknowledgedAt": null,
      "acknowledgedBy": null
    }
  ]
}
```

### 4.2 Acknowledge Alert

```http
POST /api/v1/alerts/{id}/acknowledge
```

**Response** (200 OK):

```json
{
  "data": {
    "id": "uuid",
    "acknowledgedAt": "2026-04-19T10:35:00Z",
    "acknowledgedBy": {
      "id": "uuid",
      "displayName": "Jane Supervisor"
    }
  }
}
```

---

## 5. Tag Binding (Printer Integration)

### 5.1 Print and Encode Tag

```http
POST /api/v1/print/tag-label
Content-Type: application/json
```

**Request Body**:

```json
{
  "itemNumber": "LAB-2024-001234",
  "referenceId": "CASE-2024-001",
  "stationCharge": "CPS-001",
  "printerIp": "192.168.1.50"
}
```

**Response** (201 Created):

```json
{
  "data": {
    "itemId": "uuid",
    "rfidTagEpc": "E280116060002004DECA48DA",
    "printStatus": "SUCCESS",
    "message": "Tag encoded and label printed"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid input
- `409 Conflict`: Duplicate item_number
- `503 Service Unavailable`: Printer offline

---

## 6. Authentication

### 6.1 Login (Local)

```http
POST /api/v1/auth/login
Content-Type: application/json
```

**Request Body**:

```json
{
  "email": "user@fsl.gov.za",
  "password": "..."
}
```

**Response**:

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-04-19T18:30:00Z",
    "user": {
      "id": "uuid",
      "email": "user@fsl.gov.za",
      "displayName": "Jane Operator",
      "role": "OPERATOR"
    }
  }
}
```

### 6.2 Login (LDAP/SSO)

```http
POST /api/v1/auth/ldap
Content-Type: application/json
```

**Request Body**:

```json
{
  "username": "joperator",
  "password": "..."
}
```

**Response**: Same as local login

---

## 7. Health

### 7.1 Basic Health

```http
GET /api/v1/health
```

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2026-04-19T10:30:00Z"
}
```

### 7.2 Detailed Health (Admin Only)

```http
GET /api/v1/health/detailed
```

**Response**:

```json
{
  "status": "healthy",
  "components": {
    "database": { "status": "healthy", "latencyMs": 5 },
    "redis": { "status": "healthy", "latencyMs": 2 },
    "mqtt": { "status": "healthy", "connectedReaders": 18 }
  },
  "timestamp": "2026-04-19T10:30:00Z"
}
```

---

## 8. Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item with ID 'uuid' not found",
    "details": { ... }
  }
}
```

**Standard HTTP Status Codes**:

- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Dependency unavailable

---

## Document History

| Version | Date       | Author | Changes              |
| ------- | ---------- | ------ | -------------------- |
| 1.0     | 2026-04-19 | Claude | Initial API contract |
