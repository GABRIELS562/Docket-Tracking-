# Task List — Core Docket Tracking

**Spec Version**: 1.4 (Scope Corrected)
**Generated**: 2026-04-19
**Total Tasks**: 55
**Total Violations Addressed**: 41

---

## Dependency Summary

### Critical Path (must execute in sequence)

```
F-01 (Licence validation)
  │
  ▼
H-01 (MqttReaderGateway) ───┬─── H-06 (LLRPGateway deletion)
  │                         │
  ▼                         │
H-02 (Mosquitto broker)     │
  │                         │
  ├─────────────────────────┼────────────────────┐
  │                         │                    │
  ▼                         │                    ▼
H-05 (Native Android) ──────┤              H-04 (ZD621R)
  │                         │                    │
  │                         │                    ▼
  │                         │              FE-01 (Tag-binding UI)
  │                         │                    │
  │                         │                    ▼
  │                         │              FE-02 (Tag-binding E2E) ★ DEMO
  │                         │                    │
  ▼                         │                    ▼
FE-08 (Proximity-find) ─────┤              FE-03 (Alert rule engine)
  │                         │                    │
  │                         │                    ▼
  │                         │              FE-04 (Exit alerts)
  │                         │                    │
  └─────────────────────────┴────────────────────┤
                                                 │
                                                 ▼
                                    Q-11 (Coverage M4: 80%)
                                                 │
                                                 ▼
                                    PP-02 (Quickstart verify)
                                                 │
                                                 ▼
                                    PP-06 (Pilot dry-run) ★ REHEARSAL
                                                 │
                                                 ▼
                                            DEPLOYMENT
```

**Critical Path Trace (12 tasks from today to pilot-ready)**:

```
F-01 → H-01 → H-02 → H-05 → H-04 → FE-01 → FE-03 → FE-04 → FE-08 → Q-11 → PP-02 → PP-06
```

### Blocking Dependencies

| Task                      | Blocked By                        | Blocks              |
| ------------------------- | --------------------------------- | ------------------- |
| H-01 (MqttReaderGateway)  | F-01                              | H-02, H-06, FE-03   |
| H-02 (Mosquitto broker)   | H-01                              | H-04, H-05          |
| H-04 (ZD621R)             | H-02                              | FE-01               |
| H-05 (Native Android)     | H-02 (+ ADR-002 first)            | FE-08, Q-11         |
| H-06 (LLRP deletion)      | H-01 verified                     | —                   |
| FE-01 (Tag-binding UI)    | H-04                              | FE-02               |
| FE-02 (Tag-binding flow)  | FE-01                             | PP-06               |
| FE-03 (Alert rule engine) | H-01, F-10                        | FE-04, FE-05, FE-06 |
| FE-04 (Exit alerts)       | FE-03, F-11                       | PP-06               |
| FE-08 (Proximity-find)    | H-05                              | Q-11, PP-06         |
| Q-11 (Coverage M4)        | H-05, FE-08                       | PP-05               |
| PP-05 (CI verification)   | Q-11                              | PP-06               |
| PP-06 (Pilot dry-run)     | PP-02, PP-05, FE-02, FE-04, FE-08 | Deployment          |

---

## Phase 1: Foundation

**Goal**: Core infrastructure ready for hardware integration
**Effort Total**: 8S + 4M = ~10 days

### F-01: Licence File Validation at Startup (M)

**Source**: Article VI / Commercial Model / Spec 18.5
**Acceptance**:

- Licence file read from `/etc/saps-rfid/licence.json` or `LICENCE_FILE_PATH` env var
- On missing/invalid: API returns 503 with `{"error": "LICENCE_INVALID"}`, dashboard shows licence error screen
- On valid: normal startup, licence info logged at INFO level
- Licence contains: `tenant_id`, `issued_at`, `expires_at`, `max_readers`, `max_items`
- Unit tests for LicenceValidator covering valid, expired, missing, malformed
  **Blocks**: All hardware integration (readers won't function without valid licence)

### F-02: Database Partitioning Migration (M) [P]

**Source**: III-2, Spec 5.3, Data Model partitioning strategy
**Acceptance**:

- Migration `005_partition_items.sql` creates `items_active` and `items_archived` partitions
- Existing items migrated to correct partition based on status
- Index on `(tenant_id, item_number)` exists on both partitions
- Query `SELECT * FROM items WHERE status = 'REGISTERED'` hits only active partition (EXPLAIN shows partition pruning)
- Migration is reversible
  **Blocks**: None (can run in parallel)

### F-03: TimescaleDB tag_reads Hypertable (S) [P]

**Source**: III-2, Data Model section 2.1
**Acceptance**:

- Migration `004_create_tag_reads.sql` creates `tag_reads` hypertable
- Compression policy set to 7 days
- Retention policy set to 365 days
- Index on `(epc, time DESC)` exists
- Can insert 10,000 rows in <1 second
  **Blocks**: H-01 (MqttReaderGateway needs table to exist)

### F-04: Add station_charge Column (S) [P]

**Source**: III-1, Spec 3.1
**Acceptance**:

- Migration `003_add_station_charge.sql` adds `station_charge TEXT` to items table
- Column is nullable (existing items don't have it)
- ItemRepository.create() accepts station_charge
- Search endpoint searches across item_number, reference_id, AND station_charge
- API contract updated in Swagger
  **Blocks**: None

### F-05: Environment Config Completion (S) [P]

**Source**: IX-1, Constitution IX
**Acceptance**:

- `.env.example` contains ALL required vars (from quickstart.md)
- `validate-env.ts` script fails startup if required vars missing
- Required vars: `POSTGRES_*`, `REDIS_*`, `MQTT_BROKER_URL`, `JWT_SECRET`, `LICENCE_FILE_PATH`
- CI runs validate-env as part of build
  **Blocks**: None

### F-06: Docker Compose Completion (S) [P]

**Source**: X-1, VII-1
**Acceptance**:

- `docker-compose.yml` includes: postgres (TimescaleDB), redis, mosquitto, backend, frontend
- Analytics engine service commented out with `# Phase 2` note
- Health checks defined for all services
- `docker-compose up -d` starts all services and they become healthy within 60s
- Volumes persist data correctly
  **Blocks**: H-02 (Mosquitto broker deployment)

### F-07: Health Endpoints (S) [P]

**Source**: X-3, XII-3
**Acceptance**:

- `GET /api/v1/health` returns `{"status": "healthy"}` (no auth required)
- `GET /api/v1/health/detailed` returns component status (requires admin auth)
- Components checked: database, redis, mqtt broker
- Returns 503 if any component unhealthy
- Prometheus metric `app_health_status` exposed
  **Blocks**: None

### F-08: Structured Logging Migration (M)

**Source**: IV-10, X-1, Constitution X
**Acceptance**:

- All 93 `console.log` calls in `saps-rfid-platform/src/` replaced with `this.logger.*`
- ILogger injected via DI where not already present
- Log levels used correctly: debug for verbose, info for state changes, warn for recoverable, error for failures
- No console.\* calls in production code paths
- CI fails if new console.log introduced (eslint rule)
  **Blocks**: None (can run in parallel with everything)

### F-09: LDAP/SSO Configuration (M) [P]

**Source**: Spec 12.1, Article VIII-1 (documented placeholder)
**Acceptance**:

- `passport-ldapauth` installed and configured
- LDAP settings in env: `LDAP_URL`, `LDAP_BASE_DN`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`
- `POST /api/v1/auth/ldap` endpoint authenticates against configured LDAP
- User created/updated in local DB on successful LDAP auth with `ldap_dn` stored
- Falls back to local auth if LDAP not configured
- Integration test with mock LDAP server
  **Blocks**: None

### F-10: Alert Schema and Tables (S)

**Source**: XII-5, Data Model section 3
**Acceptance**:

- Migration `006_create_alerts.sql` creates `alert_rules` and `alerts` tables
- Alert types enum: EXIT, RESTRICTED, STALE, READER_OFFLINE
- Severity enum: LOW, MEDIUM, HIGH, CRITICAL
- `alerts` table has foreign keys to items, zones, readers (all nullable)
- Indexes on `(tenant_id, acknowledged_at)` for unacked query
  **Blocks**: FE-03 (Alert rule engine)

### F-11: Zone Flags Migration (S) [P]

**Source**: II-5, Data Model Zone entity
**Acceptance**:

- Migration `007_add_zone_flags.sql` adds `is_restricted BOOLEAN DEFAULT false`, `is_exit BOOLEAN DEFAULT false`
- Existing zones get default values
- Zone API returns these flags
- Admin UI can toggle flags (if admin UI exists, otherwise API-only)
  **Blocks**: FE-05 (Restricted zone alert), FE-06 (Exit alert)

### F-12: Prometheus Metrics Audit (S) [P]

**Source**: X-3, Constitution X
**Acceptance**:

- All metrics from Constitution X metrics list implemented:
  - `rfid_tags_processed_total`
  - `rfid_tag_read_latency_seconds`
  - `rfid_reader_status` (gauge per reader)
  - `api_request_duration_seconds`
  - `api_request_total`
- `/metrics` endpoint exposes all metrics
- Grafana dashboard JSON updated to show new metrics
  **Blocks**: None

---

## Phase 2: Hardware & Integration

**Goal**: RFID hardware communication working end-to-end
**Effort Total**: 3L + 2M + 3S = ~20 days
**Critical Path**: H-01 → H-02 → H-05 → H-04

> **Contingency Note**: Estimate assumes familiarity with Zebra RFID SDK and Android WebView bridging. Allow +50% contingency (~30 days total) if this is the team's first native wrapper build.

### H-01: MqttReaderGateway Implementation (L)

**Source**: I-2, Constitution II, Spec 5.1
**Acceptance**:

- `MqttReaderGateway.ts` implements same interface as LLRPGateway
- Subscribes to `rfid/tenant/+/readers/+/tags` with QoS 1
- Subscribes to `rfid/tenant/+/readers/+/status` with QoS 1
- Publishes to `rfid/tenant/{tenantId}/readers/{readerId}/config` with QoS 2
- Tag reads parsed per mqtt-topics.md schema
- Server-side timestamp applied at ingestion (not reader timestamp)
- Reconnection with exponential backoff (1s, 2s, 4s, max 30s)
- Unit tests for message parsing, integration test with test broker
- Logs with correlation ID per message batch
  **Blocked By**: F-01 (licence validation), F-03 (tag_reads table)
  **Blocks**: H-02, H-06

### H-02: Mosquitto Broker Deployment (S)

**Source**: I-2, mqtt-topics.md section 9
**Acceptance**:

- Mosquitto added to docker-compose with correct port mapping (1883 internal, 8883 TLS optional)
- ACL file configured per mqtt-topics.md section 9.2
- Reader user template: `reader-{serialNumber}` with topic restriction
- Gateway user: `rfid-gateway` with broad read, config write
- Health check via `$SYS/broker/clients/connected`
- TLS configuration documented (not required for dev, required for prod)
  **Blocked By**: H-01 (need gateway to test broker)
  **Blocks**: H-03

### H-03: FX9600 Reader Configuration Guide (S) [P]

**Source**: II-1, XI-3, Constitution II.6
**Acceptance**:

- `docs/hardware/fx9600-setup.md` created
- Documents: IP configuration, MQTT client setup, antenna mapping, power settings
- Screenshots or clear text descriptions of Zebra web UI
- Example MQTT message payloads shown
- Troubleshooting section for common issues (no reads, disconnections)
  **Blocked By**: H-02 (need working broker to verify)
  **Blocks**: None (documentation)

### H-04: ZD621R Printer Integration (L)

**Source**: II-4, Spec 3A, Constitution II
**Acceptance**:

- `PrintController.ts` with `POST /api/v1/print/tag-label` endpoint
- `ZplGenerator.ts` generates valid ZPL for label + RFID encode
- TCP socket connection to printer on port 9100
- Prints label with: item_number barcode, item_number text, reference_id text
- Encodes tag EPC derived from item_number (deterministic algorithm)
- Returns encoded EPC in response
- Printer offline: returns 503 with retry guidance
- Integration test with mock TCP server
- `docs/hardware/zd621r-setup.md` with printer configuration
  **Blocked By**: H-02 (need MQTT for tag verification after print)
  **Blocks**: FE-01, FE-02

### H-05: Native Android Wrapper (L)

**Source**: II-3, Spec 8.2, Constitution II
**Acceptance**:

- **ADR-002 written first**: Document choice of Custom WebView Bridge vs Capacitor vs TagMatiks before any code written. Decision rationale must include: SDK compatibility, maintenance burden, licensing
- Android project in `/android-wrapper/` directory
- WebView loads React app from configurable URL
- `@JavascriptInterface` bridge exposes:
  - `startInventory()` / `stopInventory()`
  - `getRssiForEpc(epc: string): number`
  - `getConnectedReaderSerial(): string`
  - Event callback: `onTagRead(epc, rssi, antenna)`
- Zebra RFID SDK 3.x integrated for MC3330xR
- APK builds successfully via Gradle
- Manual test on MC3330xR device (or emulator with mock)
- `docs/hardware/mc3330xr-wrapper.md` with build and deployment instructions
  **Blocked By**: None (can start immediately after ADR written)
  **Blocks**: FE-08, Q-11

### H-06: LLRPGateway Deletion (S)

**Source**: II-6, Constitution IV-12
**Acceptance**:

- All LLRP-related files deleted: `LLRPGateway.ts`, `LLRPReaderConnection.ts`, `LLRPParser.ts`
- LLRP dependencies removed from package.json
- No references to LLRP in codebase (grep returns nothing)
- All tests pass after deletion
- No "legacy" folder — files are gone
  **Blocked By**: H-01 verified and passing integration tests
  **Blocks**: None (cleanup)

### H-07: Reader Provisioning Workflow (M)

**Source**: mqtt-topics.md section 10, Spec 5.2
**Acceptance**:

- Admin UI: "Add Reader" form with name, IP, zone assignment
- On create: generates MQTT credentials (username, password)
- Credentials stored encrypted in database
- API endpoint returns credentials once (not retrievable later)
- Reader config JSON downloadable for field installer
- Docs: reader provisioning step-by-step
  **Blocked By**: H-02
  **Blocks**: None

### H-08: Phase 2 MQTT Topic Reservation (S) [P]

**Source**: Phase 2 Design Considerations
**Acceptance**:

- `access/tenant/{tenantId}/events` topic documented in mqtt-topics.md (already done)
- Mosquitto ACL includes commented placeholder for access events
- MqttReaderGateway does NOT subscribe to `access/` topics (ignore them for now)
- Code comment: `// Phase 2: HID/iClass access card events`
  **Blocked By**: None
  **Blocks**: None (architectural prep)

---

## Phase 3: Features

**Goal**: Core workflows functional
**Effort Total**: 5M + 7S = ~15 days

### FE-01: Tag-Binding UI Component (M)

**Source**: XII-4, Spec 3A Workflow A
**Acceptance**:

- `TagBindingForm.tsx` component with:
  - Input fields: item_number, reference_id, station_charge (optional)
  - Printer selection dropdown (from configured printers)
  - "Print & Bind" button
- Validation: item_number required, format validated
- Loading state while printing
- Success: shows encoded EPC, option to print another
- Error: shows printer error with retry button
- Component <200 lines (split if needed)
  **Blocked By**: H-04 (ZD621R integration)
  **Blocks**: FE-02

### FE-02: Tag-Binding End-to-End Flow (M) ★ DEMO MILESTONE

**Source**: XII-4, Spec 3A steps 1-5
**Acceptance**:

- Full flow works: enter item details → print label → tag encoded → item appears in system
- Item searchable immediately after binding
- Item shows in zone where binding printer is located
- WebSocket pushes `item:created` event
- Audit log entry created
- **Demo-ready**: Can show stakeholder the complete happy path working
- Integration verified: H-04 (printer) + H-01 (MQTT) + FE-01 (UI) all connected
  **Blocked By**: FE-01
  **Blocks**: Deployment

### FE-03: Alert Rule Engine (M)

**Source**: XII-5, Data Model alert_rules
**Acceptance**:

- `AlertRuleEngine.ts` service evaluates tag events against rules
- Rule conditions stored as JSON, evaluated at runtime
- Rule actions: `dashboard` (always), `email` (optional)
- Rules cached in Redis, invalidated on update
- Unit tests for rule evaluation logic
- Default rules seeded: EXIT (all exit zones), RESTRICTED (all restricted zones)
  **Blocked By**: F-10 (alert tables), H-01 (tag events)
  **Blocks**: FE-04, FE-05, FE-06

### FE-04: Exit Alert Evaluator (S)

**Source**: XII-5, Spec 7.1
**Acceptance**:

- Triggers when item detected in zone with `is_exit = true`
- Alert created with type EXIT, severity HIGH
- Item status updated to CHECKED_OUT_EXTERNAL
- WebSocket pushes `alert:triggered` to dashboard subscribers
- Debounce: same item exiting twice in 60s = one alert
  **Blocked By**: FE-03, F-11 (zone flags)
  **Blocks**: None

### FE-05: Restricted Zone Alert Evaluator (S)

**Source**: XII-5, Spec 7.2
**Acceptance**:

- Triggers when item detected in zone with `is_restricted = true`
- Triggers only if item not authorized for that zone (authorization TBD, default: no item authorized)
- Alert created with type RESTRICTED, severity CRITICAL
- WebSocket pushes alert immediately
- Audio/visual cue in dashboard (CSS animation on alert badge)
  **Blocked By**: FE-03, F-11
  **Blocks**: None

### FE-06: Stale Item Evaluator (S)

**Source**: XII-5, Spec 7.3
**Acceptance**:

- Scheduled job runs every hour
- Items not seen in >7 days (configurable via `STALE_THRESHOLD_DAYS`) flagged
- Alert created with type STALE, severity MEDIUM
- Batch notification: one alert per zone with stale items, not per item
- Item status updated to MISSING if >30 days
  **Blocked By**: FE-03
  **Blocks**: None

### FE-07: Reader Offline Alert (S)

**Source**: XII-5, Spec 7.4
**Acceptance**:

- Triggered by reader status topic: `{"status": "OFFLINE"}`
- Also triggered if no heartbeat in 2 minutes (LWT)
- Alert created with type READER_OFFLINE, severity HIGH
- Clears automatically when reader comes back online
- Dashboard shows reader status indicator per zone
  **Blocked By**: H-01 (MQTT status subscription)
  **Blocks**: None

### FE-08: Proximity-Find UI (M)

**Source**: II-5, Spec 8.3
**Acceptance**:

- `ProximityFind.tsx` full-screen component
- Search box: enter item_number or scan barcode
- RSSI display: signal strength bar (0-100%), updates in real-time
- Audio feedback: beep frequency increases as RSSI increases
- "Getting warmer / colder" visual indicator
- Works only in Android wrapper (shows "Use mobile app" on desktop)
- Calls wrapper bridge: `startInventory()`, `getRssiForEpc()`
  **Blocked By**: H-05 (Native Android wrapper)
  **Blocks**: Q-08 (proximity tests)

### FE-09: Search Results Enhancement (S) [P]

**Source**: Spec 4.1, REST API search
**Acceptance**:

- Search endpoint searches: item_number, reference_id, station_charge
- Results include: current zone, last seen time, status badge
- Pagination: max 50 per page, cursor-based
- Sort options: relevance, last_seen_desc, item_number_asc
- Response time <300ms for 200k items
  **Blocked By**: F-04 (station_charge column)
  **Blocks**: None

### FE-10: Zone Audit View (S) [P]

**Source**: Spec 4.2, REST API zones/{id}/items
**Acceptance**:

- Zone detail page shows all items currently in zone
- Stale items highlighted (last seen >7 days)
- Filter: show all / show stale only
- Export: CSV download of zone inventory
- Pagination: max 100 per page
  **Blocked By**: None
  **Blocks**: None

### FE-11: Movement History Timeline (S) [P]

**Source**: Spec 4.3, REST API items/{id}/history
**Acceptance**:

- Item detail page shows location history timeline
- Each entry: timestamp, zone name, event type (entered/exited)
- Time range filter: last 24h, 7d, 30d, custom
- Timeline visualization: vertical list with zone icons
- Confidence indicator per reading
  **Blocked By**: None
  **Blocks**: None

### FE-12: Alert Acknowledgment Flow (S)

**Source**: XII-5, REST API alerts/{id}/acknowledge
**Acceptance**:

- Alert list shows unacknowledged alerts prominently
- "Acknowledge" button per alert
- Acknowledge requires comment (optional)
- Acknowledged alerts move to history section
- WebSocket pushes `alert:acknowledged` to all subscribers
- Only users with role >= OPERATOR can acknowledge
  **Blocked By**: FE-03
  **Blocks**: None

---

## Phase 4: Code Quality

**Goal**: Constitution compliance, 80% test coverage
**Effort Total**: 2M + 8S = ~10 days

### Q-01: Split ControlPanel.tsx (M) — GENUINE

**Source**: IV-1, 330 lines
**Acceptance**:

- Split into:
  - `ControlPanelWrapper.tsx` — layout container (<80 lines)
  - `ModeSelector.tsx` — view mode toggle (<60 lines)
  - `PanelControls.tsx` — control buttons (<60 lines)
  - `VisualizationToggles.tsx` — 3D options (<60 lines)
- All components <200 lines
- Props drilling replaced with context or composition
- Existing tests updated, all pass
  **Blocked By**: None
  **Blocks**: None

### Q-02: Split MobileNav.tsx (S) — GENUINE

**Source**: IV-2, 267 lines
**Acceptance**:

- Extract `NavigationItem.tsx` (<50 lines)
- Extract `MobileDrawer.tsx` (<100 lines)
- Main component <150 lines
- Mobile navigation still works identically
  **Blocked By**: None
  **Blocks**: None

### Q-03: Split DocketDetailModal.tsx (S) — GENUINE

**Source**: IV-3, 266 lines
**Acceptance**:

- Extract `LocationHistory.tsx` (timeline portion)
- Extract `DocketMetadata.tsx` (details portion)
- Main modal <120 lines
  **Blocked By**: None
  **Blocks**: None

### Q-04: Split ZoneFloorPlan.tsx (S) — GENUINE

**Source**: IV-4, 280 lines
**Acceptance**:

- Extract `ReaderOverlay.tsx` (reader icons)
- Extract `ZoneLabel.tsx` (zone name labels)
- Main component <150 lines
  **Blocked By**: None
  **Blocks**: None

### Q-05: Split ItemList.tsx (S) — GENUINE

**Source**: IV-5, 250 lines
**Acceptance**:

- Extract `ItemRow.tsx` (single row)
- Extract `Pagination.tsx` (paging controls)
- Main component <120 lines
  **Blocked By**: None
  **Blocks**: None

### Q-06: Minor Component Line-Count Cleanup (S) — COSMETIC

**Source**: IV-8, IV-9
**Acceptance**:

- `NotificationHistory.tsx` (202 lines): extract `NotificationItem.tsx`
- `DocketEntryForm.tsx` (212 lines): extract `FormFields.tsx`
- Both under 200 lines after extraction
- Quick wins, no structural changes
  **Blocked By**: None
  **Blocks**: None

### Q-07: Assess Borderline Components (S)

**Source**: IV-6, IV-7
**Acceptance**:

- Review `ReaderMonitorPanel.tsx` (235 lines): document decision in code comment
- Review `ForensicBuilding.tsx` (221 lines): document decision in code comment
- Refactor only if splitting improves readability
- If keeping as-is: add comment `// Assessed 2026-04-XX: complexity justified by [reason]`
  **Blocked By**: None
  **Blocks**: None

### Q-08: Coverage M1 — Domain Layer (M)

**Source**: V-1, Coverage milestone M1
**Target**: 25% overall coverage
**Acceptance**:

- Domain entity tests: Item, Zone, Reader, Tenant, TenantUser (100% coverage each)
- Value object tests: RfidEpc, ItemNumber, ReferenceId, IpAddress, StationCharge
- Domain service tests: LocationService, AlertRuleEngine
- All domain tests pass, 0 skipped
- Overall coverage reaches 25%
  **Blocked By**: None
  **Blocks**: Q-09

### Q-09: Coverage M2 — Application Layer (M)

**Source**: V-1, Coverage milestone M2
**Target**: 60% overall coverage
**Acceptance**:

- Use case tests: all 21 use cases with happy path + error cases
- DTO validation tests
- Mapper tests (Entity ↔ DTO)
- Mocked repositories throughout
- Overall coverage reaches 60%
  **Blocked By**: Q-08
  **Blocks**: Q-10

### Q-10: Coverage M3 — Infrastructure + Presentation (S)

**Source**: V-1, Coverage milestone M3
**Target**: 75% overall coverage
**Acceptance**:

- Controller tests: all HTTP endpoints
- MqttReaderGateway integration test with mock broker
- Repository tests with test database
- Middleware tests (auth, error handling)
- Overall coverage reaches 75%
  **Blocked By**: Q-09, H-01 (MQTT gateway must exist)
  **Blocks**: Q-11

### Q-11: Coverage M4 — Frontend + Proximity (S)

**Source**: V-1, Coverage milestone M4
**Target**: 80% overall coverage
**Acceptance**:

- Frontend component tests: TagBindingForm, ProximityFind, AlertList
- Frontend hook tests: useRfidInventory, useAlerts
- Proximity-find tests: mock native bridge
- Overall coverage reaches 80%
- CI coverage gate enforced at 80%
  **Blocked By**: Q-10, H-05 (proximity-find requires native wrapper), FE-08
  **Blocks**: Deployment

---

## Phase 5: Polish

**Goal**: Documentation, i18n, cleanup
**Effort Total**: 6S = ~6 days

### P-01: Remove Subscription Tier Logic (S)

**Source**: I-3, Spec 18.5
**Acceptance**:

- `Tenant.ts` simplified: single tier only
- Tier selection UI removed from admin
- Tier-based feature gates removed
- Migration: existing tenants set to single tier
- Code comment: `// Phase 2: multi-tier support`
  **Blocked By**: None
  **Blocks**: None

### P-02: i18n Afrikaans Completion (S) [P]

**Source**: Spec 13, Constitution XI
**Acceptance**:

- All UI strings in i18n files
- `af.json` (Afrikaans) translation complete
- Language selector in settings
- RTL not required (Afrikaans is LTR)
- Spot-check 10 screens for missing translations
  **Blocked By**: None
  **Blocks**: None

### P-03: README Expansion (S) [P]

**Source**: XI-4, XII-2
**Acceptance**:

- README covers both frontend and backend
- Quick start section (link to quickstart.md)
- Architecture overview with diagram
- Development setup instructions
- Production deployment link to docs/
- Contributing guidelines
  **Blocked By**: None
  **Blocks**: None

### P-04: ADR Directory and Initial Records (S) [P]

**Source**: XI-2, Constitution XI.4
**Acceptance**:

- `docs/adr/` directory created
- `ADR-001-mqtt-over-llrp.md`: why MQTT chosen over LLRP
- `ADR-002-native-wrapper.md`: why custom bridge over Capacitor
- `ADR-003-partitioning-strategy.md`: why list partition by status
- Template for future ADRs
  **Blocked By**: None
  **Blocks**: None

### P-05: Architecture Diagram Update (S) [P]

**Source**: XI-4
**Acceptance**:

- `docs/architecture.md` with Mermaid diagram
- Shows: frontend, backend, MQTT broker, readers, printers, database
- Data flow arrows labeled
- Native wrapper shown
- Phase 2 items shown as dashed boxes
  **Blocked By**: None
  **Blocks**: None

### P-06: specs/rfid/ Directory (S)

**Source**: XI-1, XII-2, II-1
**Acceptance**:

- `specs/rfid/mqtt-topics.md` (copy from .specify/contracts/)
- `specs/rfid/reader-config.md` (reader settings reference)
- `specs/rfid/tag-format.md` (EPC encoding scheme)
- Directory structure matches constitution requirement
  **Blocked By**: None
  **Blocks**: None

---

## Phase 6: Pre-Pilot

**Goal**: Ready for customer site deployment
**Effort Total**: 4S + 2M = ~7 days

### PP-01: Site Survey Deliverable (S)

**Source**: Spec 16, Pre-pilot requirements
**Acceptance**:

- `docs/site-survey-template.md` created
- Checklist: network connectivity, reader placement, power outlets, zone mapping
- Floor plan template (draw.io or similar)
- Reader coverage calculator (based on 10m typical range)
- Example completed survey
  **Blocked By**: None
  **Blocks**: None

### PP-02: Quickstart Verification (S)

**Source**: Spec 16, quickstart.md
**Acceptance**:

- Fresh clone on new machine
- Follow quickstart.md exactly
- All services running in <10 minutes
- Demo mode works (simulated data)
- Login with demo credentials succeeds
- Any issues found → fix quickstart.md
  **Blocked By**: All prior phases
  **Blocks**: None

### PP-03: Backup and Restore Test (M)

**Source**: Spec 14, Constitution VII
**Acceptance**:

- `scripts/backup.sh` creates timestamped backup
- Backup includes: PostgreSQL dump, Redis snapshot, config files
- `scripts/restore.sh` restores from backup
- Test: create data → backup → delete data → restore → verify data
- Documented in `docs/operations/backup-restore.md`
- Note: WAL archiving is Phase 2 (document future path)
  **Blocked By**: None
  **Blocks**: None

### PP-04: Licence Provisioning Process (S)

**Source**: F-01, Commercial model
**Acceptance**:

- `docs/operations/licence-provisioning.md` created
- Steps: generate licence → sign → deliver to customer → install
- Licence generator script (internal tool, not in repo)
- Licence validation troubleshooting
- Renewal process documented
  **Blocked By**: F-01
  **Blocks**: None

### PP-05: CI/CD Final Verification (S)

**Source**: IX-1, IX-2, Constitution IX
**Acceptance**:

- All CI jobs green on main branch
- Coverage threshold at 80%
- Trivy scan enabled (no critical vulnerabilities)
- Docker build succeeds
- PR template enforced
- Branch protection rules verified
  **Blocked By**: Q-11 (coverage must reach 80%)
  **Blocks**: PP-06

### PP-06: Pilot Dry-Run Rehearsal (M) ★ REHEARSAL

**Source**: Pre-pilot success criteria
**Acceptance**:

- Clean server install (not dev machine) — VM or staging environment
- Simulated reader publishes tag reads via scripted MQTT publisher
- Operator uses MC3330xR handheld to find a tagged docket (proximity-find works)
- All alert types fire correctly:
  - EXIT alert when item detected at exit zone
  - RESTRICTED alert when item enters restricted zone
  - READER_OFFLINE alert when reader disconnects
  - Stale item detection after scheduled job runs
- Offline reader recovery: disconnect reader → alert fires → reconnect → alert clears
- Tag-binding workflow demonstrated end-to-end
- All issues found documented and triaged (blockers vs nice-to-have)
- Sign-off from team that pilot can proceed
  **Blocked By**: PP-02, PP-05, Q-11, FE-08, FE-04
  **Blocks**: Deployment to FSL

---

## Open Gaps (Require Spec Clarification)

### GAP-01: Docket/Tag Decommissioning Workflow

**Status**: NOT COVERED IN SPEC v1.4

The spec does not define what happens when a case closes and a docket is permanently archived or destroyed:

1. **Tag unbinding**: Can an RFID tag be unbound from a disposed docket and reused on a new docket?
2. **Tag ID reuse policy**: Are EPC values ever reissued, or is each EPC permanently retired after use?
3. **Physical destruction**: When evidence is destroyed per retention policy, is the RFID tag also physically destroyed?
4. **Audit trail**: Must the system retain a record that "EPC X was bound to item Y from date A to date B"?
5. **Status transition**: What status does a docket transition to when decommissioned? (DISPOSED exists in enum but workflow undefined)

**Impact**: Without this clarification, the system may:

- Run out of tag IDs if reuse is not allowed
- Create security issues if old tags are reused without proper audit
- Fail compliance audits if destruction is not logged

**Recommendation**: Resolve with stakeholder before FE-02 (tag-binding) is complete, so the data model supports whichever decision is made.

**Placeholder Task**: If resolved, add FE-13 (Docket Decommissioning Workflow) in Phase 3 with M effort.

---

## Task Summary by Phase

| Phase                  | Tasks  | S      | M      | L     | Est. Days              |
| ---------------------- | ------ | ------ | ------ | ----- | ---------------------- |
| Foundation             | 12     | 8      | 4      | 0     | ~10                    |
| Hardware & Integration | 8      | 3      | 2      | 3     | ~20 (+50% contingency) |
| Features               | 12     | 7      | 5      | 0     | ~15                    |
| Code Quality           | 11     | 8      | 3      | 0     | ~12                    |
| Polish                 | 6      | 6      | 0      | 0     | ~6                     |
| Pre-Pilot              | 6      | 4      | 2      | 0     | ~7                     |
| **Total**              | **55** | **36** | **16** | **3** | **~70 days**           |

> **Note**: Hardware phase estimate includes +50% contingency warning for teams new to Zebra SDK. Realistic range: 70–90 days depending on team experience.

---

## Violations → Tasks Mapping

| Violation                    | Task(s)                                          |
| ---------------------------- | ------------------------------------------------ |
| I-1 (Python analytics)       | P-01 (remove tier logic includes analytics note) |
| I-2 (LLRP → MQTT)            | H-01, H-06                                       |
| I-3 (Tier logic)             | P-01                                             |
| II-1 (MQTT docs)             | P-06, H-03                                       |
| II-2 (Dedup config)          | H-01 (configurable in gateway)                   |
| II-3 (Native wrapper)        | H-05                                             |
| II-4 (ZD621R)                | H-04                                             |
| II-5 (Proximity UI)          | FE-08                                            |
| II-6 (LLRP deletion)         | H-06                                             |
| III-1 (station_charge)       | F-04                                             |
| III-2 (tag_reads)            | F-03                                             |
| IV-1 (ControlPanel)          | Q-01                                             |
| IV-2 (MobileNav)             | Q-02                                             |
| IV-3 (DocketDetailModal)     | Q-03                                             |
| IV-4 (ZoneFloorPlan)         | Q-04                                             |
| IV-5 (ItemList)              | Q-05                                             |
| IV-6 (ReaderMonitorPanel)    | Q-07                                             |
| IV-7 (ForensicBuilding)      | Q-07                                             |
| IV-8 (NotificationHistory)   | Q-06                                             |
| IV-9 (DocketEntryForm)       | Q-06                                             |
| IV-10 (console.log)          | F-08                                             |
| IV-11 (Frontend console)     | Q-06 (low priority)                              |
| IV-12 (LLRPGateway size)     | H-06 (deletion)                                  |
| V-1 (Coverage)               | Q-08, Q-09, Q-10, Q-11                           |
| VI-1 (Trivy)                 | PP-05                                            |
| VII-1 (Analytics in compose) | F-06                                             |
| VIII-1 (Branch discipline)   | Resolved (documented)                            |
| IX-1 (Tests in CI)           | Q-11, PP-05                                      |
| IX-2 (Trivy job)             | PP-05                                            |
| X-1 (Console → Winston)      | F-08                                             |
| X-2 (Correlation ID)         | H-01                                             |
| X-3 (Prometheus)             | F-12                                             |
| XI-1 (specs/rfid/)           | P-06                                             |
| XI-2 (docs/adr/)             | P-04                                             |
| XI-3 (Hardware guide)        | H-03, H-04, H-05                                 |
| XI-4 (Architecture)          | P-05                                             |
| XII-1 (Tests passing)        | Q-08-11                                          |
| XII-2 (Specs dir)            | P-06                                             |
| XII-3 (API docs)             | F-07 (health), H-04 (print)                      |
| XII-4 (Tag-binding)          | FE-01, FE-02                                     |
| XII-5 (Alert system)         | FE-03, FE-04, FE-05, FE-06, FE-07, FE-12         |

---

## Document History

| Version | Date       | Author | Changes           |
| ------- | ---------- | ------ | ----------------- |
| 1.0     | 2026-04-19 | Claude | Initial task list |
