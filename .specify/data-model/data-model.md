# Data Model — Core Docket Tracking

**Version**: 1.0
**Date**: 2026-04-19

---

## 1. Entity Definitions

### 1.1 Item (Docket)

The primary tracked entity representing a forensic case docket.

```typescript
interface Item {
  id: UUID;
  tenantId: UUID;

  // Three identifiers (all stored, all searchable)
  itemNumber: string; // Lab Number (primary, unique per tenant)
  referenceId: string; // Case Number
  stationCharge: string; // Station Charge (NEW - needs migration)

  // RFID binding
  rfidTagEpc: string; // 24-char hex EPC (unique globally)

  // Status tracking
  status: ItemStatus;
  currentZoneId: UUID | null;
  lastSeenAt: DateTime;
  lastSeenReaderId: UUID | null;
  locationConfidence: number; // 0.0-1.0

  // Metadata
  metadata: Record<string, unknown>;
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum ItemStatus {
  REGISTERED = 'REGISTERED', // Newly tagged, in system
  IN_TRANSIT = 'IN_TRANSIT', // Moving between zones
  IN_PROCESSING = 'IN_PROCESSING', // At examination zone
  ARCHIVED = 'ARCHIVED', // Case closed, stored
  DISPOSED = 'DISPOSED', // Destroyed per retention
  MISSING = 'MISSING', // Not seen past stale threshold
  CHECKED_OUT_EXTERNAL = 'CHECKED_OUT_EXTERNAL', // Exited building
}
```

### 1.2 Zone

Physical or logical area where items are located.

```typescript
interface Zone {
  id: UUID;
  tenantId: UUID;

  // Identity
  name: string; // "Evidence Room A"
  code: string; // "EVD-A" (unique per tenant)

  // Classification
  zoneType: ZoneType;
  isRestricted: boolean; // Triggers alert on entry
  isExit: boolean; // Triggers exit detection logic

  // Location
  floorNumber: number;
  building: string;
  coordinates: { x: number; y: number; z: number };

  // Capacity
  capacity: number;
  currentOccupancy: number;

  // Relationships
  readerIds: UUID[];
  parentZoneId: UUID | null;

  // State
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum ZoneType {
  STORAGE = 'STORAGE',
  EXAMINATION = 'EXAMINATION',
  TRANSIT = 'TRANSIT',
  ARCHIVE = 'ARCHIVE',
  OFFICE = 'OFFICE',
  CORRIDOR = 'CORRIDOR',
  ENTRANCE = 'ENTRANCE',
  EXIT = 'EXIT',
}
```

### 1.3 Reader

RFID reader device assigned to a zone.

```typescript
interface Reader {
  id: UUID;
  tenantId: UUID;

  // Identity
  name: string;
  ipAddress: string; // IPv4
  port: number; // Default 1883 (MQTT) or 5084 (LLRP)

  // Assignment
  zoneId: UUID;

  // Status
  status: ReaderStatus;
  lastSeenAt: DateTime;
  lastReadAt: DateTime;

  // Configuration
  configuration: ReaderConfig;

  // Health
  health: ReaderHealth;

  // Metadata
  readerModel: string;
  serialNumber: string;
  firmwareVersion: string;
  antennaCount: number;

  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum ReaderStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  CONNECTING = 'CONNECTING',
  MAINTENANCE = 'MAINTENANCE',
}

interface ReaderConfig {
  transmitPower: number; // dBm
  antennas: number[]; // Active antenna ports
  readInterval: number; // ms
  rssiThreshold: number; // Minimum RSSI to accept
}

interface ReaderHealth {
  totalReads: number;
  successfulReads: number;
  failedReads: number;
  uptimeSeconds: number;
  lastHealthCheckAt: DateTime;
}
```

### 1.4 Tenant

Multi-tenant organization.

```typescript
interface Tenant {
  id: UUID;
  name: string;
  slug: string; // URL-safe identifier
  contactEmail: string;

  // Subscription (simplified for v1)
  subscriptionTier: 'SINGLE'; // v1: single tier only
  subscriptionStatus: 'ACTIVE' | 'SUSPENDED';

  // Limits
  limits: {
    maxItems: number;
    maxUsers: number;
    maxZones: number;
    maxReaders: number;
  };

  // Settings
  settings: TenantSettings;

  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 1.5 TenantUser

User account within a tenant.

```typescript
interface TenantUser {
  id: UUID;
  tenantId: UUID;

  // Authentication
  email: string;
  passwordHash: string | null; // NULL when using LDAP
  ldapDn: string | null; // LDAP distinguished name (NEW)

  // Profile
  firstName: string;
  lastName: string;
  displayName: string;

  // Authorization
  role: UserRole;
  permissions: string[];

  // Security
  lastLoginAt: DateTime | null;
  failedLoginAttempts: number;
  lockedUntil: DateTime | null;
  mfaEnabled: boolean;

  // Preferences (includes push_subscription for Phase 2)
  preferences: UserPreferences;

  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum UserRole {
  VIEWER = 'VIEWER',
  OPERATOR = 'OPERATOR',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}
```

---

## 2. Time-Series Tables

### 2.1 tag_reads (Raw Reads)

Append-only table for all raw tag reads. TimescaleDB hypertable.

```sql
CREATE TABLE tag_reads (
    time        TIMESTAMPTZ NOT NULL,
    tenant_id   UUID NOT NULL,
    reader_id   UUID NOT NULL,
    epc         TEXT NOT NULL,
    rssi        INTEGER NOT NULL,
    antenna     INTEGER NOT NULL,

    PRIMARY KEY (time, tenant_id, epc)
);

SELECT create_hypertable('tag_reads', 'time',
    chunk_time_interval => INTERVAL '1 day');

-- Compression after 7 days
SELECT add_compression_policy('tag_reads', INTERVAL '7 days');

-- Retention: 365 days
SELECT add_retention_policy('tag_reads', INTERVAL '365 days');

-- Index for EPC lookup
CREATE INDEX idx_tag_reads_epc ON tag_reads (epc, time DESC);
```

### 2.2 location_history (Processed Events)

Derived location events after processing. TimescaleDB hypertable.

```sql
CREATE TABLE location_history (
    time        TIMESTAMPTZ NOT NULL,
    tenant_id   UUID NOT NULL,
    item_id     UUID NOT NULL,
    zone_id     UUID NOT NULL,
    event_type  TEXT NOT NULL,  -- 'entered', 'exited', 'exit_building', 'return'
    confidence  DECIMAL(3,2),
    reader_id   UUID,

    PRIMARY KEY (time, tenant_id, item_id)
);

SELECT create_hypertable('location_history', 'time',
    chunk_time_interval => INTERVAL '1 week');

-- Index for item timeline
CREATE INDEX idx_location_history_item ON location_history (item_id, time DESC);

-- Index for zone audit
CREATE INDEX idx_location_history_zone ON location_history (zone_id, time DESC);
```

---

## 3. Alert Tables

### 3.1 alert_rules

Configuration for alert triggers.

```sql
CREATE TABLE alert_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    alert_type  TEXT NOT NULL,  -- 'EXIT', 'RESTRICTED', 'STALE', 'READER_OFFLINE'
    conditions  JSONB NOT NULL, -- {"event_type": "exit_building", "zone_types": ["EXIT"]}
    actions     JSONB NOT NULL, -- {"email": {"recipients": [...]}, "dashboard": true}
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_tenant ON alert_rules (tenant_id, is_active);
```

### 3.2 alerts

Alert instances.

```sql
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    rule_id         UUID REFERENCES alert_rules(id),
    item_id         UUID REFERENCES items(id),
    zone_id         UUID REFERENCES zones(id),
    reader_id       UUID REFERENCES readers(id),
    alert_type      TEXT NOT NULL,
    severity        TEXT NOT NULL,  -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    message         TEXT NOT NULL,
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES tenant_users(id),
    resolved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant_unacked ON alerts (tenant_id, acknowledged_at)
    WHERE acknowledged_at IS NULL;
CREATE INDEX idx_alerts_item ON alerts (item_id);
CREATE INDEX idx_alerts_triggered ON alerts (triggered_at DESC);
```

---

## 4. Partitioning Strategy

### 4.1 Items Table Partitioning

For >200,000 active items, partition by status:

```sql
-- Create partitioned table
CREATE TABLE items (
    id                  UUID NOT NULL,
    tenant_id           UUID NOT NULL,
    item_number         TEXT NOT NULL,
    reference_id        TEXT,
    station_charge      TEXT,         -- NEW
    rfid_tag_epc        TEXT,
    status              TEXT NOT NULL,
    current_zone_id     UUID,
    last_seen_at        TIMESTAMPTZ,
    last_seen_reader_id UUID,
    location_confidence DECIMAL(3,2),
    metadata            JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (id, status)
) PARTITION BY LIST (status);

-- Hot partition (active items - queried frequently)
CREATE TABLE items_active PARTITION OF items
    FOR VALUES IN ('REGISTERED', 'IN_TRANSIT', 'IN_PROCESSING');

-- Cold partition (archived items - rarely queried)
CREATE TABLE items_archived PARTITION OF items
    FOR VALUES IN ('ARCHIVED', 'DISPOSED', 'MISSING', 'CHECKED_OUT_EXTERNAL');

-- Indexes on each partition
CREATE INDEX idx_items_active_item_number ON items_active (tenant_id, item_number);
CREATE INDEX idx_items_active_epc ON items_active (rfid_tag_epc);
CREATE INDEX idx_items_active_zone ON items_active (tenant_id, current_zone_id);

CREATE INDEX idx_items_archived_item_number ON items_archived (tenant_id, item_number);
```

### 4.2 Migration Path

```sql
-- Step 1: Create new partitioned table
CREATE TABLE items_new (...) PARTITION BY LIST (status);

-- Step 2: Create partitions
CREATE TABLE items_active PARTITION OF items_new ...;
CREATE TABLE items_archived PARTITION OF items_new ...;

-- Step 3: Copy data
INSERT INTO items_new SELECT * FROM items;

-- Step 4: Swap tables (in transaction)
BEGIN;
ALTER TABLE items RENAME TO items_old;
ALTER TABLE items_new RENAME TO items;
COMMIT;

-- Step 5: Drop old table after verification
DROP TABLE items_old;
```

---

## 5. Schema Migrations Required

| Migration                    | Description                             | Priority |
| ---------------------------- | --------------------------------------- | -------- |
| `003_add_station_charge.sql` | Add `station_charge` column to items    | LOW      |
| `004_create_tag_reads.sql`   | Create tag_reads hypertable             | LOW      |
| `005_add_zone_flags.sql`     | Add `is_restricted`, `is_exit` to zones | LOW      |
| `006_create_alerts.sql`      | Create alert_rules and alerts tables    | MEDIUM   |
| `007_add_ldap_dn.sql`        | Add `ldap_dn` to tenant_users           | LOW      |
| `008_partition_items.sql`    | Partition items table by status         | HIGH     |

---

## 6. Value Objects

### 6.1 RfidEpc

```typescript
// 96-bit EPC, 24 hex characters
class RfidEpc {
  private readonly value: string;

  static create(raw: string): Result<RfidEpc, InvalidEpcError>;

  getValue(): string;
  toByteArray(): Uint8Array;
  format(separator: string): string; // "E280-1160-6000-2004-DECA-48DA"
}
```

### 6.2 ItemNumber

```typescript
// Lab number: alphanumeric with hyphens
class ItemNumber {
  private readonly value: string;

  static create(raw: string): Result<ItemNumber, InvalidItemNumberError>;

  getValue(): string;
  getYear(): number | null;
  getPrefix(): string | null;
}
```

### 6.3 IpAddress

```typescript
// IPv4 address
class IpAddress {
  private readonly value: string;

  static create(raw: string): Result<IpAddress, InvalidIpAddressError>;

  getValue(): string;
  isPrivate(): boolean;
  toInteger(): number;
}
```

---

## Document History

| Version | Date       | Author | Changes            |
| ------- | ---------- | ------ | ------------------ |
| 1.0     | 2026-04-19 | Claude | Initial data model |
