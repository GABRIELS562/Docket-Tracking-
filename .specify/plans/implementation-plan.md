# Implementation Plan — Core Docket Tracking

**Spec Version**: 1.4 (Scope Corrected)
**Plan Version**: 1.0
**Date**: 2026-04-19

---

## 1. Architecture Overview

### 1.1 System Diagram

```
                                    ┌─────────────────────────────────────────┐
                                    │           FSL SITE (On-Premises)        │
                                    │                                         │
┌─────────────┐                     │  ┌─────────────────────────────────┐   │
│ Tag-Binding │                     │  │         Docker Host             │   │
│ Workstation │                     │  │                                 │   │
│             │                     │  │  ┌─────────────────────────┐   │   │
│ ┌─────────┐ │                     │  │  │    React Frontend       │   │   │
│ │ DS2208  │─┼─────────────────────┼──┼──│    (Nginx container)    │   │   │
│ │ Scanner │ │  Keyboard Wedge     │  │  │    Port 80/443          │   │   │
│ └─────────┘ │                     │  │  └──────────┬──────────────┘   │   │
│             │                     │  │             │ /api proxy       │   │
│ ┌─────────┐ │                     │  │             ▼                  │   │
│ │ ZD621R  │─┼──── TCP 9100 ───────┼──┼──┌─────────────────────────┐   │   │
│ │Printer/ │ │  (ZPL commands)     │  │  │    Node.js Backend      │   │   │
│ │Encoder  │ │                     │  │  │    (Express container)  │   │   │
│ └─────────┘ │                     │  │  │    Port 8080            │   │   │
│             │                     │  │  │                         │   │   │
│  Chrome     │◀──── WebSocket ─────┼──┼──│    ┌─────────────────┐  │   │   │
│  Browser    │                     │  │  │    │ Socket.io       │  │   │   │
└─────────────┘                     │  │  │    └─────────────────┘  │   │   │
                                    │  │  │                         │   │   │
                                    │  │  │    ┌─────────────────┐  │   │   │
┌─────────────┐                     │  │  │    │ MQTT Subscriber │  │   │   │
│  MC3330xR   │                     │  │  │    └────────┬────────┘  │   │   │
│  Handheld   │                     │  │  └─────────────┼───────────┘   │   │
│             │                     │  │                │               │   │
│ ┌─────────┐ │                     │  │                ▼               │   │
│ │ Native  │ │                     │  │  ┌─────────────────────────┐   │   │
│ │ Android │ │                     │  │  │    Mosquitto Broker     │   │   │
│ │ Wrapper │ │                     │  │  │    (MQTT container)     │   │   │
│ └────┬────┘ │                     │  │  │    Port 1883            │   │   │
│      │      │                     │  │  └──────────▲──────────────┘   │   │
│ ┌────┴────┐ │                     │  │             │ MQTT Publish     │   │
│ │ WebView │ │                     │  │             │                  │   │
│ │ (React) │─┼─────HTTP/WS─────────┼──┤             │                  │   │
│ └─────────┘ │                     │  │  ┌──────────┴──────────────┐   │   │
│             │                     │  │  │    TimescaleDB          │   │   │
│ ┌─────────┐ │                     │  │  │    (PostgreSQL 15)      │   │   │
│ │Zebra    │ │                     │  │  │    Port 5432            │   │   │
│ │RFID SDK │ │                     │  │  │                         │   │   │
│ └─────────┘ │                     │  │  │ - items (partitioned)   │   │   │
└─────────────┘                     │  │  │ - location_history      │   │   │
                                    │  │  │ - tag_reads             │   │   │
                                    │  │  └─────────────────────────┘   │   │
                                    │  │                                │   │
┌─────────────┐                     │  │  ┌─────────────────────────┐   │   │
│  FX9600     │                     │  │  │    Redis                │   │   │
│  Reader 1   │───── MQTT ──────────┼──┼──│    Port 6379            │   │   │
└─────────────┘                     │  │  │    (Session, Cache)     │   │   │
                                    │  │  └─────────────────────────┘   │   │
┌─────────────┐                     │  │                                │   │
│  FX9600     │                     │  └────────────────────────────────┘   │
│  Reader N   │───── MQTT ──────────┼───────────────────────────────────────┘
└─────────────┘                     │
      (×20)                         └─────────────────────────────────────────┘
```

### 1.2 Key Architectural Decisions

| Decision            | Choice                      | Rationale                                                   |
| ------------------- | --------------------------- | ----------------------------------------------------------- |
| Reader Protocol     | MQTT via Mosquitto          | Native FX9600 support via IoT Connector; simpler than LLRP  |
| Handheld RFID       | Native Android Wrapper      | DataWedge lacks RSSI for proximity-find; Zebra SDK required |
| Printer Integration | ZPL over TCP 9100           | Network decoupling; standard Zebra pattern                  |
| Database            | PostgreSQL 15 + TimescaleDB | Time-series for reads; partitioning for scale               |
| Authentication      | LDAP/SSO (v1)               | Customer requirement; fallback to local admin               |
| Licensing           | Site-bound RSA-signed file  | On-prem turnkey; no cloud dependency                        |
| Analytics           | Phase 2                     | No frontend consumer; SQL aggregates sufficient for v1      |

### 1.3 Container Stack

```yaml
# docker-compose.yml services for v1
services:
  frontend: # Nginx + React build
  backend: # Node.js Express API
  mosquitto: # MQTT broker (NEW)
  postgres: # TimescaleDB
  redis: # Session + cache
  # analytics-engine: REMOVED for v1
```

---

## 2. Data Model

### 2.1 Entity Relationship Diagram

```
┌─────────────────────┐     ┌─────────────────────┐
│       TENANT        │     │     TENANT_USER     │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │──┐  │ id (PK)             │
│ name                │  │  │ tenant_id (FK)      │──┐
│ slug (unique)       │  │  │ email               │  │
│ subscription_tier   │  │  │ password_hash       │  │
│ settings (JSONB)    │  │  │ ldap_dn             │  │
│ is_active           │  │  │ role                │  │
│ created_at          │  │  │ permissions (JSONB) │  │
└─────────────────────┘  │  │ last_login_at       │  │
         │               │  └─────────────────────┘  │
         │               └───────────────────────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│        ZONE         │     │       READER        │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │──┐  │ id (PK)             │
│ tenant_id (FK)      │  │  │ tenant_id (FK)      │
│ name                │  │  │ name                │
│ code (unique/tenant)│  │  │ ip_address          │
│ zone_type           │  │  │ zone_id (FK)        │──┐
│ is_restricted       │  │  │ status              │  │
│ is_exit             │  │  │ last_seen_at        │  │
│ floor_number        │  │  │ configuration       │  │
│ building            │  └──│ health (JSONB)      │  │
│ capacity            │     └─────────────────────┘  │
│ current_occupancy   │                              │
│ coordinates (JSONB) │◀─────────────────────────────┘
└─────────────────────┘
         │
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                        ITEM                          │
├──────────────────────────────────────────────────────┤
│ id (PK)                                              │
│ tenant_id (FK)                                       │
│ item_number (unique/tenant) ← Lab Number             │
│ reference_id                ← Case Number            │
│ station_charge              ← Station Charge (NEW)   │
│ rfid_tag_epc (unique)                                │
│ status (REGISTERED|IN_TRANSIT|ARCHIVED|MISSING|...)  │
│ current_zone_id (FK)                                 │
│ last_seen_at                                         │
│ last_seen_reader_id (FK)                             │
│ location_confidence                                  │
│ metadata (JSONB)                                     │
│ created_at                                           │
└──────────────────────────────────────────────────────┘
         │
         │ 1:N (Time-series)
         ▼
┌─────────────────────────────────────────────────────┐
│              LOCATION_HISTORY (Hypertable)           │
├──────────────────────────────────────────────────────┤
│ time (PK, partitioned)                               │
│ tenant_id                                            │
│ item_id (FK)                                         │
│ zone_id (FK)                                         │
│ event_type (entered|exited|exit_building|return)     │
│ confidence                                           │
│ reader_id (FK)                                       │
└──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               TAG_READS (Hypertable) — NEW           │
├──────────────────────────────────────────────────────┤
│ time (PK, partitioned by day)                        │
│ tenant_id                                            │
│ reader_id                                            │
│ epc                                                  │
│ rssi                                                 │
│ antenna                                              │
│ -- Retention: 365 days rolling                       │
│ -- Compression: after 7 days                         │
└──────────────────────────────────────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│     ALERT_RULE      │     │        ALERT        │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │──┐  │ id (PK)             │
│ tenant_id (FK)      │  │  │ tenant_id (FK)      │
│ name                │  │  │ rule_id (FK)        │──┘
│ alert_type          │  │  │ item_id (FK)        │
│ conditions (JSONB)  │  │  │ zone_id (FK)        │
│ actions (JSONB)     │  │  │ triggered_at        │
│ is_active           │  └──│ acknowledged_at     │
└─────────────────────┘     │ severity            │
                            │ message             │
                            └─────────────────────┘
```

### 2.2 Partitioning Strategy (>200k Active Items)

```sql
-- Items table partitioning by status
CREATE TABLE items (
    id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    status TEXT NOT NULL,
    -- ... other columns
) PARTITION BY LIST (status);

CREATE TABLE items_active PARTITION OF items
    FOR VALUES IN ('REGISTERED', 'IN_TRANSIT', 'IN_PROCESSING');

CREATE TABLE items_archived PARTITION OF items
    FOR VALUES IN ('ARCHIVED', 'DISPOSED', 'MISSING');

-- Hot partition (active) kept lean
-- Cold partition (archived) can grow without affecting queries

-- Tag reads hypertable (TimescaleDB)
SELECT create_hypertable('tag_reads', 'time',
    chunk_time_interval => INTERVAL '1 day');

-- Compression after 7 days
SELECT add_compression_policy('tag_reads', INTERVAL '7 days');

-- Retention after 365 days
SELECT add_retention_policy('tag_reads', INTERVAL '365 days');

-- Location history hypertable
SELECT create_hypertable('location_history', 'time',
    chunk_time_interval => INTERVAL '1 week');

-- Index strategy for fast lookups
CREATE INDEX idx_items_item_number ON items(tenant_id, item_number);
CREATE INDEX idx_items_reference_id ON items(tenant_id, reference_id);
CREATE INDEX idx_items_current_zone ON items(tenant_id, current_zone_id);
CREATE INDEX idx_items_epc ON items(rfid_tag_epc);
CREATE INDEX idx_location_history_item ON location_history(item_id, time DESC);
```

---

## 3. Native Android Wrapper Architecture

### 3.1 Recommendation: Custom Java Bridge

**Selected Approach**: Option 2 — Custom Java Bridge with WebView + @JavascriptInterface

**Rationale**:

- Capacitor plugin (Option 1) adds dependency bloat and upgrade complexity
- TagMatiks (Option 3) is proprietary and license-cost unknown
- Custom bridge is minimal, under our control, and well-documented by Zebra

### 3.2 Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Android APK (rfid-wrapper)                               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MainActivity.java                                │   │
│  │                                                  │   │
│  │  onCreate() {                                    │   │
│  │    webView = new WebView();                      │   │
│  │    webView.addJavascriptInterface(               │   │
│  │      new ZebraRfidBridge(this), "zebraRfid"     │   │
│  │    );                                            │   │
│  │    webView.loadUrl(REACT_APP_URL);               │   │
│  │  }                                               │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ZebraRfidBridge.java                             │   │
│  │                                                  │   │
│  │  @JavascriptInterface                            │   │
│  │  void startRead(String targetEpc) {              │   │
│  │    rfidHandler.setFilter(targetEpc);             │   │
│  │    rfidHandler.performInventory();               │   │
│  │  }                                               │   │
│  │                                                  │   │
│  │  @JavascriptInterface                            │   │
│  │  void stopRead() {                               │   │
│  │    rfidHandler.stop();                           │   │
│  │  }                                               │   │
│  │                                                  │   │
│  │  // Callback to JS                               │   │
│  │  void onTagRead(String epc, int rssi) {          │   │
│  │    webView.evaluateJavascript(                   │   │
│  │      "window.onZebraTagRead({epc,rssi})", null   │   │
│  │    );                                            │   │
│  │  }                                               │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Zebra RFID SDK (com.zebra.rfid.api3)             │   │
│  │                                                  │   │
│  │  RFIDHandler.java                                │   │
│  │  - connect()                                     │   │
│  │  - setAntennaConfig()                            │   │
│  │  - setFilterConfig()                             │   │
│  │  - performInventory()                            │   │
│  │  - stop()                                        │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MC3330xR Integrated UHF RFID Radio               │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 3.3 JavaScript API Contract

```typescript
// Exposed by native wrapper
interface Window {
  zebraRfid: {
    startRead(targetEpc?: string): void;
    stopRead(): void;
    isAvailable(): boolean;
  };
  onZebraTagRead?: (tag: { epc: string; rssi: number }) => void;
}

// Usage in React ProximityFind component
function ProximityFind({ targetEpc }: { targetEpc: string }) {
  const [rssi, setRssi] = useState<number | null>(null);

  useEffect(() => {
    window.onZebraTagRead = (tag) => {
      if (tag.epc === targetEpc) {
        setRssi(tag.rssi);
        playBeep(rssiToFrequency(tag.rssi));
      }
    };
    window.zebraRfid?.startRead(targetEpc);
    return () => window.zebraRfid?.stopRead();
  }, [targetEpc]);

  return <SignalStrengthDisplay rssi={rssi} />;
}
```

---

## 4. MQTT Integration

### 4.1 Topic Schema

```
# Tag reads from fixed readers
rfid/tenant/{tenantId}/readers/{readerId}/tags
  Payload: { "epc": "E280...", "rssi": -45, "antenna": 1, "timestamp": "ISO8601" }

# Reader status (online/offline/error)
rfid/tenant/{tenantId}/readers/{readerId}/status
  Payload: { "status": "online", "uptimeSeconds": 3600, "lastReadAt": "ISO8601" }

# Reader configuration updates (backend → reader)
rfid/tenant/{tenantId}/readers/{readerId}/config
  Payload: { "transmitPower": 27, "readInterval": 100 }

# System alerts (backend → subscribers)
alerts/tenant/{tenantId}/triggered
  Payload: { "alertId": "...", "type": "EXIT", "itemId": "...", "severity": "HIGH" }

# Phase 2: Access card events (reserved)
access/tenant/{tenantId}/events
  Payload: { "cardId": "...", "zoneId": "...", "timestamp": "ISO8601" }
```

### 4.2 MqttReaderGateway Implementation

```typescript
// saps-rfid-platform/src/infrastructure/rfid/MqttReaderGateway.ts
@injectable()
export class MqttReaderGateway {
  private client: MqttClient;
  private readonly tagProcessor: TagProcessor;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.TagProcessor) tagProcessor: TagProcessor,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    this.tagProcessor = tagProcessor;
    this.logger = logger;
  }

  async connect(brokerUrl: string): Promise<void> {
    this.client = mqtt.connect(brokerUrl, {
      clientId: `rfid-gateway-${process.env.NODE_ENV}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.logger.info('Connected to MQTT broker');
      this.subscribeToReaders();
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });
  }

  private subscribeToReaders(): void {
    // Subscribe to all reader tag topics
    this.client.subscribe('rfid/+/readers/+/tags');
    this.client.subscribe('rfid/+/readers/+/status');
  }

  private handleMessage(topic: string, payload: Buffer): void {
    const parts = topic.split('/');
    const tenantId = parts[1];
    const readerId = parts[3];
    const messageType = parts[4];

    if (messageType === 'tags') {
      const tagRead = JSON.parse(payload.toString());
      this.tagProcessor.process({
        tenantId,
        readerId,
        epc: tagRead.epc,
        rssi: tagRead.rssi,
        antenna: tagRead.antenna,
        timestamp: new Date(), // Server timestamp, NOT reader
      });
    }
  }
}
```

---

## 5. Email Notification Service

### 5.1 Architecture

```typescript
// saps-rfid-platform/src/infrastructure/notifications/EmailNotificationService.ts
@injectable()
export class EmailNotificationService implements INotificationService {
  private transporter: nodemailer.Transporter;

  constructor(@inject(TYPES.Logger) private logger: ILogger) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendAlert(alert: Alert, recipients: string[]): Promise<void> {
    const subject = this.formatSubject(alert);
    const html = this.formatBody(alert);

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipients.join(','),
      subject,
      html,
    });

    this.logger.info('Alert email sent', { alertId: alert.id, recipients });
  }
}
```

### 5.2 Alert Rules Configuration

```json
// Example alert rule
{
  "id": "exit-alert-rule",
  "tenant_id": "...",
  "name": "Exit Alert",
  "alert_type": "EXIT",
  "conditions": {
    "event_type": "exit_building"
  },
  "actions": {
    "email": {
      "recipients": ["supervisor@fsl.gov.za"],
      "template": "exit-alert"
    },
    "dashboard": true
  },
  "is_active": true
}
```

---

## 6. Phase 2 Design Considerations

These items are deferred to Phase 2, but v1 architecture must not block them:

| Item                     | V1 Preparation                                       | Phase 2 Integration Point                                                      |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| HID/iClass Access Cards  | Reserve `access-events` MQTT topic in schema         | Add subscriber for access events; correlate with zone entry within ±30s window |
| Push Notifications       | User preferences JSONB has `push_subscription` field | Register service worker; call Web Push API from backend                        |
| PWA Offline Mode         | API responses use consistent shapes                  | Add service worker with IndexedDB cache; sync queue for offline operations     |
| WAL Archiving (RPO 1h)   | PostgreSQL already WAL-capable                       | Configure `archive_command` to MinIO/S3; add continuous archiver               |
| Hot Standby (RTO 1h)     | Single-node is default                               | Add replica node to docker-compose; configure streaming replication            |
| Analytics Engine         | Keep `analytics-engine/` in repo                     | Add `/api/v2/analytics` proxy route to Python service                          |
| Turn-by-Turn Pathfinding | `PathfindingService` implements A\*                  | Add real-time position tracking; WebSocket push of navigation updates          |

---

## 7. Testing Strategy

### 7.1 Coverage Targets

| Layer          | Current | V1 Target | Implementation                             |
| -------------- | ------- | --------- | ------------------------------------------ |
| Domain         | 0%      | 80%       | Entity, value object, domain service tests |
| Application    | 0%      | 80%       | Use case tests with mocked repositories    |
| Presentation   | 0%      | 60%       | Controller tests with supertest            |
| Infrastructure | 25%     | 50%       | Integration tests with testcontainers      |
| Frontend       | 10%     | 50%       | React Testing Library component tests      |

### 7.2 Test Types

```
tests/
├── unit/
│   ├── domain/           # Entity, value object tests
│   │   ├── Item.test.ts
│   │   ├── Zone.test.ts
│   │   ├── RfidEpc.test.ts
│   │   └── ...
│   ├── application/      # Use case tests (mocked)
│   │   ├── RegisterItemUseCase.test.ts
│   │   ├── SearchItemsUseCase.test.ts
│   │   └── ...
│   └── presentation/     # Controller tests
│       ├── ItemController.test.ts
│       └── ...
├── integration/
│   ├── database/         # Repository tests (real DB)
│   │   └── PostgresItemRepository.test.ts
│   ├── mqtt/             # MQTT gateway tests (mock broker)
│   │   └── MqttReaderGateway.test.ts
│   └── api/              # Full API tests
│       └── items.api.test.ts
└── e2e/
    └── tag-to-dashboard.test.ts  # Full flow test
```

---

## 8. Deployment Runbook

### 8.1 Installation (Fresh Site)

```bash
# 1. Clone repository
git clone https://github.com/GABRIELS562/Docket-Tracking-.git
cd Docket-Tracking-

# 2. Copy environment template
cp .env.example .env
# Edit .env with site-specific values

# 3. Place licence file
sudo cp licence.json /etc/saps-rfid/licence.json

# 4. Start services
docker-compose up -d

# 5. Run migrations
docker-compose exec backend npm run db:migrate

# 6. Verify health
curl http://localhost:8080/health/detailed
```

### 8.2 Backup (Nightly Cron)

```bash
#!/bin/bash
# /etc/cron.daily/saps-rfid-backup

BACKUP_DIR="/var/backups/saps-rfid"
DATE=$(date +%Y%m%d)

# PostgreSQL dump
docker-compose exec -T postgres pg_dump -U postgres saps_rfid \
  | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Retain 7 days
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
```

### 8.3 Restore Procedure

```bash
# 1. Stop services
docker-compose down

# 2. Restore database
gunzip -c /var/backups/saps-rfid/db-YYYYMMDD.sql.gz \
  | docker-compose exec -T postgres psql -U postgres saps_rfid

# 3. Restart services
docker-compose up -d

# 4. Verify
curl http://localhost:8080/health/detailed
```

---

## 9. Success Metrics

| Criterion            | Measurement              | Target                  |
| -------------------- | ------------------------ | ----------------------- |
| Locate docket time   | Stopwatch test           | <60 seconds             |
| Exit alert detection | Test all 5 exits         | 100%                    |
| Zone audit accuracy  | Physical vs system count | Within debounce window  |
| Lab-wide searches    | Incident log             | Zero for tagged dockets |
| API latency          | p95 response time        | <300ms                  |
| Uptime               | Monitoring               | >99.5%                  |

---

## Document History

| Version | Date       | Author | Changes                     |
| ------- | ---------- | ------ | --------------------------- |
| 1.0     | 2026-04-19 | Claude | Initial implementation plan |
