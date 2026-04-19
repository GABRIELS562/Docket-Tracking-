# Constitution Check — Core Docket Tracking

**Spec Version**: 1.4 (Scope Corrected)
**Check Date**: 2026-04-19
**Status**: VIOLATIONS FOUND

---

## Executive Summary

| Article                           | Violations   | Severity         |
| --------------------------------- | ------------ | ---------------- |
| Article I — Stack & Architecture  | 3            | MEDIUM           |
| Article II — Hardware Integration | 6            | HIGH             |
| Article III — Data Integrity      | 2            | LOW              |
| Article IV — Code Quality         | 12           | HIGH             |
| Article V — Testing               | 1 (CRITICAL) | CRITICAL         |
| Article VI — Security             | 1            | LOW              |
| Article VII — Containerization    | 1            | LOW              |
| Article VIII — Version Control    | 1            | LOW (documented) |
| Article IX — CI/CD                | 2            | MEDIUM           |
| Article X — Observability         | 3            | MEDIUM           |
| Article XI — Documentation        | 4            | MEDIUM           |
| Article XII — Delivery Standards  | 5            | HIGH             |
| **TOTAL**                         | **41**       |                  |

---

## Article I — Stack & Architecture

### I-1: Python Analytics Engine in Codebase (MEDIUM, M)

**Code**: `saps-rfid-platform/analytics-engine/` Python FastAPI service exists
**Requirement**: Constitution does not include Python in stack; spec v1.4 defers analytics to Phase 2
**Fix**: Remove analytics-engine from docker-compose.yml for v1; keep code for Phase 2

### I-2: LLRP Protocol Instead of MQTT (MEDIUM, L)

**Code**: `LLRPGateway.ts`, `LLRPReaderConnection.ts` implement LLRP protocol
**Requirement**: Spec v1.4 section 5.1 specifies MQTT via Mosquitto
**Fix**: Create `MqttReaderGateway.ts`, add Mosquitto to docker-compose, migrate reader config

### I-3: Subscription Tier Logic Present (LOW, S)

**Code**: `Tenant.ts` lines 15-20 define TRIAL, STARTER, PROFESSIONAL, ENTERPRISE tiers
**Requirement**: Spec v1.4 section 18.5 says "Remove tier logic entirely for v1"
**Fix**: Simplify to single tier; keep code paths but hide from UI

---

## Article II — Hardware Integration (RFID-Specific)

### II-1: No MQTT Topic Schema Documentation (MEDIUM, S)

**Code**: MQTT not implemented; LLRP has no external documentation
**Requirement**: Article II.6 "Reader protocols and message formats MUST be documented in `specs/rfid/`"
**Fix**: Create `specs/rfid/mqtt-topics.md` with topic structure and message schemas

### II-2: Missing Tag Deduplication Configuration (LOW, S)

**Code**: `TagDeduplicator.ts` uses hardcoded 3000ms window
**Requirement**: Article II.4 "Duplicate reads MUST be debounced within configurable window"
**Fix**: Move to environment variable `TAG_DEDUP_WINDOW_MS`

### II-3: No Native Android RFID Wrapper (HIGH, L)

**Code**: No native Android code exists in repository
**Requirement**: Spec v1.4 section 8.2 requires native wrapper for MC3330xR RSSI access
**Fix**: Create Android wrapper project with Zebra RFID SDK integration (R-B0)

### II-4: No ZD621R Printer Integration (HIGH, L)

**Code**: No ZPL generation or TCP print endpoint exists
**Requirement**: Spec v1.4 section 3A requires `/api/v1/print/tag-label` endpoint
**Fix**: Create `PrintController.ts`, `ZplGenerator.ts`, TCP socket integration (R-A3)

### II-5: No Proximity-Find UI Component (HIGH, M)

**Code**: No proximity-find mode in frontend
**Requirement**: Spec v1.4 section 8.3 requires full-screen proximity-find with RSSI display
**Fix**: Create `ProximityFind.tsx` component with signal strength visualization (R-B1)

### II-6: LLRPGateway Removal Required (MEDIUM, S) — CLEANUP

**Code**: `LLRPGateway.ts` (962 lines), `LLRPReaderConnection.ts` will become dead code after MqttReaderGateway
**Requirement**: No dual protocol codepaths; MQTT is the v1 protocol
**Dependency**: Blocked by I-2 (MqttReaderGateway build)
**Fix**: After MqttReaderGateway is operational and tested, delete LLRPGateway.ts, LLRPReaderConnection.ts, and all LLRP-related dependencies. Do NOT leave in "legacy" folder.

---

## Article III — Data Integrity

### III-1: Missing `station_charge` Field (LOW, S)

**Code**: `items` table has `item_number` and `reference_id` but no `station_charge`
**Requirement**: Spec v1.4 section 3.1 requires all three identifiers stored
**Fix**: Add migration `003_add_station_charge.sql`

### III-2: Missing `tag_reads` Hypertable (LOW, S)

**Code**: Only `location_history` hypertable exists; raw reads not stored separately
**Requirement**: Spec v1.4 section 5.3 requires separate raw tag reads storage (1 year retention)
**Fix**: Add migration `004_create_tag_reads_hypertable.sql` with compression policy

---

## Article IV — Code Quality

### Component Size Violations

| ID   | Component               | Lines | Over By | Assessment     | Effort |
| ---- | ----------------------- | ----- | ------- | -------------- | ------ |
| IV-1 | ControlPanel.tsx        | 330   | +65%    | **GENUINE**    | M      |
| IV-2 | MobileNav.tsx           | 267   | +33%    | **GENUINE**    | S      |
| IV-3 | DocketDetailModal.tsx   | 266   | +33%    | **GENUINE**    | S      |
| IV-4 | ZoneFloorPlan.tsx       | 280   | +40%    | **GENUINE**    | S      |
| IV-5 | ItemList.tsx            | 250   | +25%    | **GENUINE**    | S      |
| IV-6 | ReaderMonitorPanel.tsx  | 235   | +17%    | **BORDERLINE** | S      |
| IV-7 | ForensicBuilding.tsx    | 221   | +10%    | **BORDERLINE** | S      |
| IV-8 | NotificationHistory.tsx | 202   | +1%     | **COSMETIC**   | S      |
| IV-9 | DocketEntryForm.tsx     | 212   | +6%     | **COSMETIC**   | S      |

**Assessment Key**:

- **GENUINE**: Structural refactoring needed; component doing too much
- **BORDERLINE**: Review before deciding; may be acceptable complexity
- **COSMETIC**: Quick extraction; barely over threshold

### IV-1: ControlPanel.tsx (GENUINE, M)

**Code**: `src/components/ControlPanel.tsx` — 330 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Split into ControlPanelWrapper, ModeSelector, PanelControls, VisualizationToggles

### IV-2: MobileNav.tsx (GENUINE, S)

**Code**: `src/components/MobileNav.tsx` — 267 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract NavigationItem, MobileDrawer subcomponents

### IV-3: DocketDetailModal.tsx (GENUINE, S)

**Code**: `src/components/DocketDetailModal.tsx` — 266 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract LocationHistory, DocketMetadata subcomponents

### IV-4: ZoneFloorPlan.tsx (GENUINE, S)

**Code**: `src/components/detail/ZoneFloorPlan.tsx` — 280 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract ReaderOverlay, ZoneLabel subcomponents

### IV-5: ItemList.tsx (GENUINE, S)

**Code**: `src/components/detail/ItemList.tsx` — 250 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract ItemRow, Pagination subcomponents

### IV-6: ReaderMonitorPanel.tsx (BORDERLINE, S)

**Code**: `src/components/ReaderMonitorPanel.tsx` — 235 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract ReaderCard, ReaderMetrics subcomponents (review structure first)

### IV-7: ForensicBuilding.tsx (BORDERLINE, S)

**Code**: `src/components/3d/ForensicBuilding.tsx` — 221 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract FloorMesh, ZoneBlock3D subcomponents (3D complexity may justify size)

### IV-8: NotificationHistory.tsx (COSMETIC, S)

**Code**: `src/components/NotificationHistory.tsx` — 202 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract NotificationItem subcomponent (quick win)

### IV-9: DocketEntryForm.tsx (COSMETIC, S)

**Code**: `src/components/import/DocketEntryForm.tsx` — 212 lines
**Requirement**: Article IV.6 "React components MUST NOT exceed 200 lines"
**Fix**: Extract FormFields, QRScannerSection subcomponents (quick win)

### IV-10: Console.log Calls in Backend (MEDIUM, M)

**Code**: 93 console.log calls across 34 files in `saps-rfid-platform/src/`
**Requirement**: Article X.1 specifies Winston for structured logging
**Fix**: Replace console.log with ILogger injection (T5 from retrofit backlog)

### IV-11: Console.log Calls in Frontend (LOW, S)

**Code**: 8 console calls in frontend (mostly error handlers — acceptable)
**Requirement**: Consistent logging approach
**Fix**: Low priority; error/warn usage is acceptable

### IV-12: LLRPGateway.ts Exceeds Size Guidelines (MEDIUM, M)

**Code**: `LLRPGateway.ts` — 962 lines (complex protocol implementation)
**Requirement**: Article IV.7 "Backend functions MUST NOT exceed 50 lines"
**Fix**: Document as intentional complexity; will be replaced by MqttReaderGateway

---

## Article V — Testing (CRITICAL)

### V-1: Test Coverage Below 80% Minimum (CRITICAL, L)

**Code**: Backend 5.7% coverage (10/174 files), Frontend ~10% estimated
**Requirement**: Article V.1 "80% minimum line coverage on business logic"
**Status**:

- Domain layer: 0% (no tests)
- Application layer: 0% (no tests)
- Presentation layer: 0% (no tests)
- Infrastructure layer: 25% (RFID tests exist)
- Frontend: ~10% (8 component tests)

**Fix**: Comprehensive test suite required:

- Domain entity tests (Item, Reader, Zone, Tenant, TenantUser)
- Value object tests (RfidEpc, ItemNumber, ReferenceId, IpAddress)
- Use case tests (all 21 use cases)
- Controller tests
- Frontend component tests

**Effort**: L (multiple sprints)

---

## Article VI — Security

### VI-1: No Trivy Container Scan in CI (LOW, M)

**Code**: `.github/workflows/ci.yml` lacks Trivy scan job
**Requirement**: Article VI.4 "Trivy image scan before deploy"
**Fix**: Add Trivy job to CI workflow (T6 from retrofit backlog)

---

## Article VII — Containerization & Deployment

### VII-1: Analytics Engine in Docker Compose (LOW, S)

**Code**: `docker-compose.yml` may include analytics-engine service
**Requirement**: Spec v1.4 defers analytics to Phase 2
**Fix**: Comment out or remove analytics-engine service from v1 compose file

---

## Article VIII — Version Control & Review

### VIII-1: Spec Work Committed to Main (LOW, documented)

**Code**: Commits 15cf109 through db1716f landed on main, not feature branch
**Requirement**: Article VIII.1 "Main branch protected. No direct pushes."
**Status**: DOCUMENTED as deviation in SDLC_RETROFIT_STATUS.md; going forward, feature branches restored
**Fix**: No action needed; discipline restored with `feature/002-core-tracking-plan`

---

## Article IX — CI/CD

### IX-1: Backend Tests Disabled in CI (MEDIUM, S)

**Code**: Backend test job may be commented out due to coverage failures
**Requirement**: Article IX PR Checks table requires unit tests passing
**Fix**: Re-enable with current 9% threshold; increase incrementally

### IX-2: Missing Trivy Scan Job (MEDIUM, M)

**Code**: CI workflow lacks container security scanning
**Requirement**: Article IX PR Checks table includes Trivy scan
**Fix**: Add Trivy scan step after docker build

---

## Article X — Observability

### X-1: Console.log Instead of Winston (MEDIUM, M)

**Code**: 93 backend console.log calls, some in production code paths
**Requirement**: Article X.1 "Structured JSON logging via Winston"
**Fix**: Replace with `this.logger.info()` / `this.logger.error()` via ILogger

### X-2: Missing Tag Read Correlation ID (LOW, S)

**Code**: Tag reads logged but correlation ID not consistently included
**Requirement**: Article X.2 lists correlation_id as required field
**Fix**: Add correlationId to tag processing pipeline

### X-3: Incomplete Prometheus Metrics (LOW, M)

**Code**: Some required metrics may be missing
**Requirement**: Article X metrics list (rfid.tags.processed, etc.)
**Fix**: Audit and add missing metrics to PrometheusMetrics class

---

## Article XI — Documentation

### XI-1: Missing `specs/rfid/` Directory (MEDIUM, S)

**Code**: Directory does not exist
**Requirement**: Article II.6 and XI.2 require RFID protocol documentation
**Fix**: Create directory with MQTT topic schema, message formats, reader config guide

### XI-2: Missing `docs/adr/` Directory (MEDIUM, S)

**Code**: Directory does not exist
**Requirement**: Article XI.4 "ADRs for major decisions"
**Fix**: Create directory; start with ADR-001 (MQTT vs LLRP decision)

### XI-3: Missing Hardware Setup Guide (MEDIUM, M)

**Code**: No hardware setup documentation
**Requirement**: Article XI.2 requires guide for reader models, network config, placement
**Fix**: Create `docs/hardware-setup.md` with FX9600, ZD621R, MC3330xR configuration

### XI-4: Architecture Diagram Outdated (LOW, S)

**Code**: StartHere.md has diagram but may not reflect current state
**Requirement**: Article XI.3 "Architecture diagram showing data flow"
**Fix**: Update diagram to show MQTT path, native wrapper, all v1 components

---

## Article XII — Delivery Standards

### XII-1: Tests Not Passing (HIGH, L)

**Code**: Backend tests at 5.7% coverage; many skipped
**Requirement**: Checklist item "Tests written and passing (80%+ coverage)"
**Fix**: Write comprehensive test suite

### XII-2: Missing Specs Directory Structure (MEDIUM, S)

**Code**: `specs/rfid/` does not exist
**Requirement**: Checklist item "Complete specs in `specs/` directory"
**Fix**: Create and populate `specs/rfid/`

### XII-3: Missing API Documentation (MEDIUM, M)

**Code**: Swagger exists but may not cover all v1 endpoints
**Requirement**: Checklist item "API documentation"
**Fix**: Ensure Swagger covers tag-binding, alerts, all new endpoints

### XII-4: Missing Tag-Binding Workflow (HIGH, L)

**Code**: No tag-binding UI or endpoint exists
**Requirement**: Spec v1.4 Workflow A is critical for pilot
**Fix**: Implement full tag-binding workflow (R-A1 through R-A5)

### XII-5: Missing Alert System (HIGH, M)

**Code**: Basic notification exists but no AlertService, no exit detection
**Requirement**: Spec v1.4 section 7 requires full alert system
**Fix**: Implement AlertService, exit detection, restricted zone alerts (R-D4, R-D5)

---

## Violations by Effort

### Small (S) — <1 day each

- I-3, II-1, II-2, II-6, III-1, III-2, IV-2, IV-3, IV-4, IV-5, IV-6, IV-7, IV-8, IV-9, IV-11
- VII-1, VIII-1, IX-1, X-2, XI-1, XI-2, XI-4, XII-2
  **Count: 23**

### Medium (M) — 1-3 days each

- I-1, II-5, IV-1, IV-10, IV-12, VI-1, IX-2, X-1, X-3, XI-3, XII-3, XII-5
  **Count: 12**

### Large (L) — 3+ days each

- I-2, II-3, II-4, V-1, XII-1, XII-4
  **Count: 6**

---

## Critical Path Violations

These violations block pilot success, listed in **dependency order**:

1. **I-2** (MqttReaderGateway) — Foundational; blocks MQTT-based reader communication
2. **II-3** (Native Android wrapper) — Blocks proximity-find implementation AND tests
3. **II-4** (ZD621R integration) — Blocks tag-binding workflow
4. **XII-4** (Tag-binding workflow) — Blocks docket registration (depends on II-4)
5. **XII-5** (Alert system) — Blocks exit detection (can parallel with XII-4)
6. **II-6** (LLRPGateway removal) — Cleanup after I-2 complete; removes dead code
7. **V-1** (Test coverage 80%) — Final gate; includes proximity-find tests (depends on II-3)

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CRITICAL PATH DEPENDENCIES                      │
└─────────────────────────────────────────────────────────────────────┘

  I-2 MqttReaderGateway ─────┬────────────────────────────────────────┐
         │                   │                                        │
         ▼                   ▼                                        │
  II-6 LLRPGateway     II-3 Native Android                           │
       Removal              Wrapper                                   │
         │                   │                                        │
         │                   ├──────────────────┐                     │
         │                   │                  │                     │
         │                   ▼                  ▼                     │
         │            II-5 Proximity-    V-1 Test Coverage            │
         │                 Find UI       (proximity-find              │
         │                   │            tests blocked)              │
         │                   │                  │                     │
         │                   │                  │                     │
         │                   ▼                  │                     │
         │            V-1 Proximity-           │                     │
         │              Find Tests ────────────┘                     │
         │                                                            │
         │                                                            │
  II-4 ZD621R ───────────────────────────────────────────────────────┘
       Printer
         │
         ▼
  XII-4 Tag-Binding ─────────┐
       Workflow              │
         │                   │
         │                   │ (parallel)
         │                   │
         ▼                   ▼
  XII-5 Alert          Everything
       System              │
         │                 │
         └────────┬────────┘
                  │
                  ▼
           DEPLOYMENT
```

### Dependency Rules

| Item                    | Blocked By                      | Blocks                                     |
| ----------------------- | ------------------------------- | ------------------------------------------ |
| I-2 (MqttReaderGateway) | —                               | II-6, reader communication                 |
| II-3 (Native wrapper)   | —                               | II-5 (proximity UI), V-1 (proximity tests) |
| II-4 (ZD621R)           | I-2 (for MQTT tag verification) | XII-4 (tag-binding)                        |
| II-5 (Proximity UI)     | II-3                            | V-1 (proximity tests)                      |
| II-6 (LLRP removal)     | I-2                             | — (cleanup only)                           |
| XII-4 (Tag-binding)     | II-4                            | Deployment                                 |
| XII-5 (Alert system)    | I-2 (for tag events)            | Deployment                                 |
| V-1 (80% coverage)      | II-3 (for proximity tests)      | Deployment                                 |

### Coverage Milestone Sequence

General coverage can proceed in parallel with hardware work:

| Milestone | Coverage | Scope                                    | Blocked By |
| --------- | -------- | ---------------------------------------- | ---------- |
| M1        | 25%      | Domain entities + value objects          | —          |
| M2        | 60%      | + Application use cases + controllers    | —          |
| M3        | 75%      | + MQTT gateway + frontend critical paths | I-2        |
| M4        | 80%      | + Proximity-find tests                   | II-3       |

---

## Phase 2 Design Considerations

Per spec v1.4, these items are deferred to Phase 2. V1 architecture must not preclude them:

| Item                     | Architectural Note                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| HID/iClass Access Cards  | Reserve `access-events` MQTT topic; add `access_card_id` nullable column to `tenant_users`                        |
| Push Notifications       | Service worker registration can be added without schema change; add `push_subscription` JSONB to user preferences |
| PWA Offline Mode         | IndexedDB schema mirrors API response shapes; no backend changes needed                                           |
| WAL Archiving (RPO 1h)   | PostgreSQL already supports WAL; just need MinIO bucket and archive_command config                                |
| Hot Standby (RTO 1h)     | Primary/replica setup is infrastructure; no code changes required                                                 |
| Analytics Engine         | Keep `analytics-engine/` directory; add API versioning so future `/api/v2/analytics` can proxy to Python          |
| Turn-by-Turn Pathfinding | `PathfindingService.ts` already implements A\*; just needs real-time position tracking                            |

---

## Next Steps

1. Review this Constitution Check
2. Proceed to `/speckit.tasks` to generate ordered task list
3. Prioritize violations by critical path impact
4. Schedule test coverage improvement across multiple sprints
