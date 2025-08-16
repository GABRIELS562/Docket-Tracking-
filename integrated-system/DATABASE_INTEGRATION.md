# Database Integration Guide

## Overview
The RFID Docket Tracking System now has full PostgreSQL database integration with 500,000+ docket capacity.

## Database Setup
- **Database**: PostgreSQL (local, zero-cost)
- **Tables**: 17 tables for complete tracking system
- **Test Data**: Pre-seeded with sample data

## Key API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/register` - Register new user

### Search Operations
- `GET /api/search/docket` - Search dockets by code, case, RFID, or barcode
  ```javascript
  fetch('/api/search/docket?query=DOCKET-2024&type=docket', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  ```

### Storage Management
- `GET /api/storage-db/zones` - Get all storage zones
- `GET /api/storage-db/boxes` - Get storage boxes (with filters)
- `POST /api/storage-db/boxes` - Create new storage box
- `GET /api/storage-db/statistics` - Get storage statistics

### Retrieval Requests
- `POST /api/storage-db/requests/retrieval` - Create retrieval request
- `GET /api/storage-db/requests/retrieval` - Get retrieval requests

## Frontend Integration

### 1. Basic Query Pattern
```javascript
const token = localStorage.getItem('authToken');
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

### 2. Database Field Mapping
The database uses snake_case, while frontend uses camelCase:
- `docket_code` → `docketCode`
- `case_number` → `caseNumber`
- `rfid_tag` → `rfidTag`
- `current_location` → `currentLocation`

### 3. Example Implementation
See `/src/examples/DatabaseQueryExample.tsx` for complete examples:
- Basic queries
- Creating records
- Real-time updates
- Filtered searches
- Custom hooks

## Testing the Database

### Run Database Tests
```bash
npx ts-node src/tests/database-test.ts
```

### Manual Database Access
```bash
psql -U user -d rfid_tracking
```

### Common Queries
```sql
-- View all dockets
SELECT * FROM dockets LIMIT 10;

-- Search dockets
SELECT d.*, c.name as client_name 
FROM dockets d 
LEFT JOIN clients c ON d.client_id = c.id
WHERE d.docket_code ILIKE '%DOCKET-2024%';

-- Storage statistics
SELECT COUNT(*) as total_dockets,
       COUNT(DISTINCT client_id) as total_clients,
       COUNT(DISTINCT storage_box_id) as boxes_used
FROM dockets;
```

## Default Credentials
- **Admin**: admin@govstorageservices.gov.za / admin123
- **Manager**: manager@govstorageservices.gov.za / manager123
- **Operator**: operator@govstorageservices.gov.za / operator123

## Database Schema Highlights

### Core Tables
- `users` - System users with roles and permissions
- `clients` - Government departments/clients
- `dockets` - Main docket records (500,000+ capacity)
- `storage_zones` - Physical storage zones
- `storage_boxes` - Storage boxes within zones
- `rfid_readers` - RFID reader devices
- `rfid_events` - RFID scan events
- `docket_movements` - Movement history
- `retrieval_requests` - Retrieval request tracking

### Key Features
- Automatic timestamps (created_at, updated_at)
- Audit logging for all changes
- UUID generation for unique identifiers
- Full-text search indexes
- Cascade deletes for data integrity
- Transaction support for complex operations

## Performance Optimizations
- Indexed fields for fast searches
- Connection pooling (max 20 connections)
- Query monitoring (logs slow queries >100ms)
- Prepared statements for security

## Next Steps
1. ✅ Database schema created
2. ✅ API routes connected to database
3. ✅ Database tests passing
4. ✅ Frontend integration examples provided
5. ⏳ Add more seed data for testing
6. ⏳ Implement real-time WebSocket updates
7. ⏳ Add database backup/restore scripts