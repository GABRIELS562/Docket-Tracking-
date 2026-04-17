# System Specification — RFID Inventory Tracking Platform

**Version:** 1.0.0
**Generated:** 2026-04-17
**Status:** Retroactive specification of existing system

---

## 1. Executive Summary

This is a **multi-tier RFID inventory tracking platform** that tracks physical items tagged with RFID in a warehouse or facility environment. The system consists of:

- **React Frontend** - 3D/2D visualization dashboard
- **Node.js Backend** - Clean architecture API with real-time WebSocket
- **PostgreSQL + TimescaleDB** - Relational + time-series data storage
- **RFID Integration** - LLRP protocol reader communication

---

## 2. Core Concepts

### 2.1 Domain Entities

| Entity | Description |
|--------|-------------|
| **Item** | Physical object with RFID tag. Has status lifecycle: REGISTERED → IN_TRANSIT → IN_PROCESSING → ARCHIVED/DISPOSED. Becomes MISSING after 30h without detection. |
| **Zone** | Physical area in facility (lab, storage, corridor). Has capacity limits. Contains readers. |
| **Reader** | LLRP RFID reader hardware. Detects tags via antenna. Has health status (ONLINE/OFFLINE/ERROR). |
| **Tenant** | Multi-tenant isolation. Each tenant has own items, zones, readers. |
| **LocationHistory** | Time-series audit trail of item movements. Stored in TimescaleDB hypertable. |

### 2.2 Item Status State Machine

```
REGISTERED ──┬──> IN_TRANSIT ──> IN_PROCESSING ──> ARCHIVED
             │         │
             │         └── (30h no detection) ──> MISSING
             │                                      │
             │                                      v
             └─────────────────────────────────> DISPOSED
```

---

## 3. Features

### 3.1 Real-Time Tracking
- RFID tag detection within 1 second of physical read
- WebSocket push to all connected dashboards
- Zone occupancy updates in real-time
- Reader health monitoring with alerts

### 3.2 3D Visualization
- React Three Fiber 3D warehouse rendering
- Items rendered as particles/instances (max 500 visible)
- Zone heat maps showing occupancy
- Multiple view modes: 3D, 2D top-down, split screen

### 3.3 Search & Filtering
- Full-text search on item descriptions
- Filter by zone, status, category, date range
- Paginated results (max 50-500 per request)

### 3.4 Analytics
- Zone occupancy trends (24h, 7d, 30d)
- Reader activity metrics (reads/hour)
- Flow analysis: item journey, bottleneck detection
- AI-detected anomalies [NEEDS CLARIFICATION: What ML model is used?]

### 3.5 Multi-Tenancy
- Complete data isolation per tenant
- Tenant-scoped WebSocket rooms
- Per-tenant limits (items, readers, API calls)
- JWT authentication with tenant context

---

## 4. API Surface

### 4.1 REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Authenticate, get JWT |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/items` | Search items with filters |
| POST | `/api/items` | Register new item |
| GET | `/api/items/:itemNumber` | Get item details |
| GET | `/api/items/:itemNumber/history` | Item location history |
| GET | `/api/zones` | List all zones |
| GET | `/api/zones/:zoneId/items` | Items in specific zone |
| GET | `/api/readers` | All readers with status |
| GET | `/api/analytics/dashboard` | Dashboard KPIs |
| GET | `/api/analytics/zones/:zoneId` | Zone analytics |
| GET | `/api/flow/item-journey/:itemId` | Item movement history |
| GET | `/api/flow/bottlenecks` | Bottleneck detection |
| GET | `/api/flow/anomalies` | AI anomalies |
| POST | `/api/spatial/pathfinding` | A* path between zones |
| GET | `/api/health` | Health check |

### 4.2 WebSocket Events

**Server → Client:**
- `tag:detected` - Raw RFID read (epc, zoneId, readerId, rssi, timestamp)
- `item:moved` - Item changed zones
- `zone:occupancy` - Zone capacity update
- `reader:status` - Reader online/offline

**Client → Server:**
- `subscribe:zones` - Subscribe to zone updates
- `subscribe:item` - Follow specific item
- `subscribe:readers` - All reader updates
- `unsubscribe:*` - Unsubscribe variants

---

## 5. Data Model

### 5.1 Database Tables

```sql
-- Core tracking
items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  item_number VARCHAR(50) UNIQUE,
  rfid_epc VARCHAR(24) UNIQUE,
  reference_id VARCHAR(100),
  description TEXT,
  category VARCHAR(50),
  current_zone_id UUID,
  last_seen_at TIMESTAMP,
  status VARCHAR(20),
  created_at TIMESTAMP
)

zones (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100),
  code VARCHAR(20) UNIQUE,
  zone_type VARCHAR(50),
  capacity INTEGER,
  current_occupancy INTEGER,
  coordinates JSONB
)

readers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100),
  ip_address VARCHAR(15),
  port INTEGER DEFAULT 5084,
  zone_id UUID,
  status VARCHAR(20),
  configuration JSONB
)

-- TimescaleDB hypertable
location_history (
  time TIMESTAMPTZ NOT NULL,
  item_id UUID NOT NULL,
  zone_id UUID,
  reader_id UUID,
  rssi INTEGER,
  confidence DECIMAL
)
SELECT create_hypertable('location_history', 'time');

-- Multi-tenant
tenants (id, slug, name, status, tier, limits)
tenant_users (id, tenant_id, email, role, password_hash)
```

---

## 6. Architecture

### 6.1 Clean Architecture Layers

```
┌─────────────────────────────────────────────┐
│           PRESENTATION LAYER                │
│  (Express Controllers, WebSocket Server)    │
├─────────────────────────────────────────────┤
│           APPLICATION LAYER                 │
│  (Use Cases, DTOs, Mappers)                 │
├─────────────────────────────────────────────┤
│            DOMAIN LAYER                     │
│  (Entities, Value Objects, Domain Events)   │
│  (NO external dependencies)                 │
├─────────────────────────────────────────────┤
│         INFRASTRUCTURE LAYER                │
│  (PostgreSQL, LLRP Gateway, Redis, Logger)  │
└─────────────────────────────────────────────┘
```

### 6.2 RFID Event Flow

```
RFID Reader (LLRP binary)
    ↓
LLRPGateway (parse protocol)
    ↓
TagDeduplicator (filter multi-read)
    ↓
TagProcessor (map EPC → Item)
    ↓
EventBus (domain events)
    ├→ Database (location_history INSERT)
    ├→ WebSocket (broadcast to clients)
    └→ Analytics (aggregate metrics)
```

---

## 7. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, React Three Fiber, Zustand, TanStack Query |
| Backend | Node.js 20, Express, TypeScript (strict), tsyringe DI |
| Database | PostgreSQL 14+, TimescaleDB |
| Real-time | Socket.IO |
| RFID | LLRP protocol (TCP port 5084) |
| Logging | Winston (structured JSON) |
| Testing | Jest |
| Container | Docker, docker-compose |

---

## 8. Performance Targets

| Metric | Target |
|--------|--------|
| API response | < 300ms |
| Tag detection latency | < 1 second |
| 3D rendering | 60 FPS |
| Max visible 3D items | 500 |
| Event throughput | 1000+ events/min |
| DB simple query | < 10ms |
| DB complex query | < 100ms |

---

## 9. Open Questions

- [NEEDS CLARIFICATION] What ML model powers the anomaly detection in `/api/flow/anomalies`?
- [NEEDS CLARIFICATION] Is Open3D spatial analytics (Phase 5) implemented or planned?
- [NEEDS CLARIFICATION] What are the exact tenant tier limits?
- [NEEDS CLARIFICATION] Is Redis caching currently active or future?
- [NEEDS CLARIFICATION] What is the retention policy for location_history?

---

## 10. Known Limitations

1. **Backend tests failing** - 160 of 643 tests fail, temporarily disabled in CI
2. **No E2E tests** - Only unit and integration tests exist
3. **Console.log usage** - Not fully migrated to Winston logger
4. **Missing specs/** - LLRP protocol documentation not created
5. **Missing docs/adr/** - No Architecture Decision Records yet

---

*This specification documents the system as it exists. It does not invent features.*
