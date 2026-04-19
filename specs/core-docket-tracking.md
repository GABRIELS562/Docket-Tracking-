# Core Docket Tracking Feature Specification

**Version**: 1.1
**Status**: Draft
**Last Updated**: 2026-04-19

---

## 1. Overview

### 1.1 Business Problem

The Forensic Science Laboratory (FSL) in Plattekloof, Western Cape loses significant operational hours every week when the entire lab stops to search for misplaced case dockets. This happens multiple times per week. No one has solved this problem for them before.

### 1.2 Solution

An RFID-based tracking system that enables staff to locate any tagged docket within 60 seconds from opening the application. The system provides:

- Real-time zone-level location for all tagged dockets
- Searchable inventory by lab number, case number, or station charge
- Floor-plan visualization showing docket locations
- Handheld proximity guidance for final-meter location within a zone
- Automated exit alerts when dockets leave the building
- Zone audit views for custodians
- Movement history for supervisors

### 1.3 Commercial Model

- Turnkey: customer buys hardware, licences software per location
- Annual maintenance fee
- Site-bound licence file prevents unauthorised installations
- On-premises deployment (no cloud dependency)

---

## 2. Users and Roles

### 2.1 User Types

| Role                | Capabilities                                                         | Authentication |
| ------------------- | -------------------------------------------------------------------- | -------------- |
| Lab Staff           | Search dockets, view location, use handheld for proximity finding    | LDAP/SSO       |
| File-Room Custodian | All above + zone audit views                                         | LDAP/SSO       |
| Supervisor          | All above + movement history, alert management, reports              | LDAP/SSO       |
| System Admin        | All above + reader configuration, zone management, user provisioning | LDAP/SSO       |

### 2.2 Authentication

**Target State**: Integrate with customer's existing LDAP/Active Directory for SSO.

**[RETROFIT REQUIRED]** Current implementation uses JWT-based email/password authentication with local user database. LDAP/SSO integration must be added.

Implementation approach:

- Use `passport-ldapauth` or equivalent well-maintained library
- Support fallback to local admin account for break-glass scenarios
- Map LDAP groups to application roles (operator, manager, supervisor)
- Session management via JWT after LDAP authentication

---

## 3. Docket Identity Model

### 3.1 Existing Identifiers

Dockets already have three identifiers printed on existing barcode stickers:

| Identifier     | Description                          | Format                                           |
| -------------- | ------------------------------------ | ------------------------------------------------ |
| Lab Number     | Primary tracking number              | [NEEDS CLARIFICATION: What is the exact format?] |
| Case Number    | Police case reference                | [NEEDS CLARIFICATION: What is the exact format?] |
| Station Charge | Originating police station reference | [NEEDS CLARIFICATION: What is the exact format?] |

**Requirement**: All three identifiers must be stored and searchable. No parallel numbering system.

### 3.2 Device Categories

The system supports three distinct device contexts with different UI requirements:

| Device                      | Hardware                                     | Context                    | UI Requirements                                                      |
| --------------------------- | -------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| **Tag-Binding Workstation** | Desktop PC + DS2208 scanner + ZD621R printer | Fixed intake station       | Full desktop UI, keyboard/mouse, barcode input field, print controls |
| **Dashboard**               | Any desktop/laptop browser                   | Monitoring, audit, admin   | Full desktop UI, 2D floor-plan mandatory, 3D optional                |
| **Handheld**                | Zebra MC3330xR (Android + Chrome)            | Ambulatory search-and-find | Responsive mobile UI, large touch targets, proximity-find mode       |

**[RETROFIT CHECK REQUIRED]** Current codebase may assume single device category. Verify:

1. Does the React app have responsive breakpoints for handheld screens?
2. Is there a dedicated tag-binding workflow UI with barcode scanner integration?
3. Is there a proximity-find mode that uses the handheld's built-in RFID?

If any are missing, flag as significant retrofit items.

---

## 3A. Workflow A: Tag-Binding (Intake)

### 3A.1 Overview

Tag-binding occurs **once per docket** at a fixed intake workstation. This is the process that introduces a new docket into the tracking system.

**Frequency**: ~1,370 new dockets/day average (500,000/year)

### 3A.2 Hardware Setup

```
┌─────────────────────────────────────────────────────────────┐
│  TAG-BINDING WORKSTATION                                    │
│                                                             │
│  ┌──────────┐  USB   ┌─────────────┐                       │
│  │ DS2208   │───────▶│             │                       │
│  │ Scanner  │        │  Desktop PC │                       │
│  └──────────┘        │  (Chrome)   │                       │
│                      │             │◀──── React Web App    │
│  ┌──────────┐  USB   │             │                       │
│  │ ZD621R   │◀───────│             │                       │
│  │ Printer/ │        └─────────────┘                       │
│  │ Encoder  │                                               │
│  └──────────┘                                               │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                               │
│  │  RFID    │ ◀── Blank label in, encoded+printed out      │
│  │  Label   │                                               │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3A.3 Tag-Binding Workflow Steps

```
1. SCAN BARCODE
   ├─ Operator places docket at workstation
   ├─ Operator scans existing barcode with DS2208
   ├─ App receives barcode data via keyboard wedge
   └─ App parses and populates fields:
      • Lab Number
      • Case Number
      • Station Charge

2. VALIDATE IDENTIFIERS
   ├─ Check lab number format valid
   ├─ Check lab number not already in system (duplicate check)
   ├─ If duplicate: SHOW ERROR, abort workflow
   └─ If valid: enable "Print & Encode" button

3. PRINT + ENCODE TAG
   ├─ Operator clicks "Print & Encode"
   ├─ App sends print job to ZD621R via USB/network
   ├─ ZD621R prints label AND encodes blank RFID tag with unique EPC
   ├─ ZD621R reports encoded EPC back to app
   └─ App displays: "Tag encoded: EPC-XXXX-XXXX-XXXX"

4. ADHERE LABEL
   ├─ Operator peels printed RFID label from printer
   ├─ Operator adheres label to docket (avoiding metal contact)
   └─ Operator clicks "Confirm Bind"

5. CONFIRM BIND
   ├─ App creates item record: EPC → (lab_number, case_number, station_charge)
   ├─ App displays: "Docket LAB-XXXX now tracked"
   ├─ Status = REGISTERED
   └─ Ready for next docket
```

### 3A.4 Error Cases

| Error                | Detection                 | Recovery                                |
| -------------------- | ------------------------- | --------------------------------------- |
| Barcode unreadable   | Scanner timeout / no data | Re-scan or manual entry fallback        |
| Duplicate lab number | Database lookup           | Show existing record, offer to view     |
| Tag encoding fails   | ZD621R error response     | Retry with new label                    |
| Printer offline      | Connection check          | Show error, wait for reconnection       |
| Operator aborts      | User clicks Cancel        | Discard partial data, no record created |

### 3A.5 Implementation Status

**[RETROFIT REQUIRED]** Tag-binding workflow is not implemented in current codebase. Required:

1. Barcode scanner integration (keyboard wedge input handling)
2. ZD621R printer/encoder integration (Zebra Browser Print or native driver)
3. Tag-binding UI with multi-step workflow
4. Duplicate detection logic
5. Rollback handling for failed encodes

---

### 3B. RFID Tag Details

**Tag Type**: UHF RFID labels, printed and encoded on-demand by ZD621R.

**No pre-encoded stock**: Tags are blank until the moment of binding.

**EPC Format**: 96-bit EPC (24 hex characters), generated by ZD621R or application.

**Label Adhesive**: Suitable for paper/card docket folders. Avoid direct metal contact per constitution Article II.

**Unknown Tag Handling**: If a reader detects an EPC not in the database:

- Log as "unbound tag detected" with EPC, reader, timestamp
- Do not create a docket record
- Dashboard shows "X unbound tags detected today" metric
- Tags can be bound retroactively (for backlog tagging scenarios)

---

## 4. Physical Environment

### 4.1 Facility Overview

- Location: FSL Plattekloof, Western Cape
- Size: ~2 square kilometres, multi-building, multi-floor
- Wi-Fi coverage: Complete across all relevant areas

### 4.2 Hardware Stack

#### Fixed Readers (Zone Tracking)

| Component    | Model             | Specs                  | Deployment                                                   |
| ------------ | ----------------- | ---------------------- | ------------------------------------------------------------ |
| Fixed Reader | Zebra FX9600      | 4-port or 8-port, PoE+ | Corridors, doorways, stairwells, exits, high-occupancy rooms |
| Antennas     | Zebra AN440/AN480 | Circular polarized     | Mounted per zone coverage plan                               |

**Deployment**: ~20 readers total (5 exits + 15 internal zones)

#### Tag-Binding Workstation (Intake)

| Component            | Model                  | Purpose                                     |
| -------------------- | ---------------------- | ------------------------------------------- |
| Desktop PC           | Standard Windows 10/11 | Runs React web app in Chrome                |
| Barcode Scanner      | Zebra DS2208 (USB)     | Scans existing docket barcodes              |
| RFID Printer/Encoder | Zebra ZD621R           | Prints label + encodes RFID tag in one step |
| RFID Labels          | UHF RFID on-demand     | Adhesive suitable for paper/card dockets    |

**Deployment**: One workstation per intake point (typically 1-2 for pilot)

#### Handheld for Find (Ambulatory)

| Component           | Model          | Specs                                                                                           |
| ------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| Integrated Handheld | Zebra MC3330xR | Android-based, integrated UHF RFID (~6m read range), 1D/2D barcode scanner, pistol grip, rugged |

**Key Specs**:

- Read range: ~6m (deliberately short to avoid false positives in adjacent rooms)
- Read rate: 1,300+ tags/sec
- Form factor: Pistol grip, rugged industrial
- OS: Android (runs React web app in Chrome)

**Deployment**: 3-5 units + 1 spare for pilot (shared among staff)

#### Broker

| Component   | Model             | Deployment                      |
| ----------- | ----------------- | ------------------------------- |
| MQTT Broker | Eclipse Mosquitto | Docker container on site server |

### 4.3 Zone Model

Each zone represents a logical area where a docket can be located:

```
Zone {
  id: UUID
  name: string              // "Evidence Room A", "Biology Lab"
  code: string              // Short code for display: "EVD-A"
  zone_type: enum           // STORAGE, EXAMINATION, TRANSIT, ARCHIVE, OFFICE, CORRIDOR, ENTRANCE, EXIT
  is_restricted: boolean    // If true, entry triggers alert
  is_exit: boolean          // If true, exit detection logic applies
  floor: number
  building: string
  capacity: number          // Maximum dockets (advisory)
  reader_ids: UUID[]        // Readers assigned to this zone
  coordinates: {x, y, z}    // For floor-plan rendering
}
```

**Current Implementation Status**: Zone entity exists with zone_type enum. Verify `is_restricted` and `is_exit` flags exist.

---

## 5. RFID Infrastructure

### 5.1 Reader Communication Protocol

**Brief Preference**: MQTT-based communication via Eclipse Mosquitto broker.

**Current Implementation**: LLRP (Low-Level Reader Protocol) via `llrp` npm package.

**Analysis**:

- LLRP is an **EPCglobal open standard**, not a vendor-proprietary SDK
- LLRP is already implemented and working in `saps-rfid-platform/src/infrastructure/rfid/`
- The constitution (Article I) documents LLRP as Tier 3 Reader Gateway
- No Zebra-proprietary SDK calls exist in the codebase

**Decision Required**: Keep LLRP or migrate to MQTT?

| Factor         | LLRP (Current)          | MQTT (Brief Preference)        |
| -------------- | ----------------------- | ------------------------------ |
| Standards      | EPCglobal open standard | OASIS open standard            |
| Vendor Lock-in | None                    | None                           |
| Implementation | Complete, tested        | Requires new work              |
| Buffering      | Reader-side (limited)   | Broker-side (robust)           |
| Deployment     | Direct TCP              | Requires Mosquitto broker      |
| Zebra FX9600   | Native support          | Requires IoT Connector license |

[NEEDS CLARIFICATION: Does customer have Zebra IoT Connector licenses for MQTT? If not, LLRP is the practical choice and meets the "vendor-neutral" requirement.]

**If MQTT Migration Approved**:

1. Configure Zebra FX9600 readers for MQTT publishing (requires IoT Connector)
2. Deploy Eclipse Mosquitto broker (add to docker-compose)
3. Create MQTT subscriber service in reader gateway
4. Deprecate `LLRPGateway`, `LLRPReaderConnection`
5. Preserve existing debouncing and event pipeline logic

### 5.2 Tag Read Processing Pipeline

```
Raw Tag Read (from reader/MQTT)
    ↓
Ingestion (server timestamp, NOT reader clock)
    ↓
Deduplication (suppress identical reads within window)
    ↓
Confidence Scoring (RSSI strength → confidence 0.0-1.0)
    ↓
Location Resolution (reader → zone mapping)
    ↓
Debouncing (suppress spurious reads from overlapping coverage)
    ↓
Zone Change Detection
    ↓
If zone changed: emit LocationEvent + AuditEvent
    ↓
Update current_zone on docket
```

**Configuration Parameters**:

- `TAG_DEDUP_WINDOW_MS`: 3000 (suppress identical reads within 3s)
- `ZONE_DEBOUNCE_WINDOW_MS`: 5000 (suppress zone flapping within 5s)
- `CONFIDENCE_THRESHOLD`: 0.6 (minimum confidence for zone assignment)
- `STALE_THRESHOLD_HOURS`: 24 (docket marked stale after this)

**Current Implementation Status**: TagProcessor, TagDeduplicator, and OptimizedEventPipeline exist. Verify debounce parameters are configurable.

### 5.3 Raw Reads vs Processed Events

**Requirement**: Treat raw tag reads and processed location events as separate concepts.

| Data Type        | Storage                                   | Retention  | Purpose                       |
| ---------------- | ----------------------------------------- | ---------- | ----------------------------- |
| Raw Tag Reads    | TimescaleDB hypertable `tag_reads`        | 90 days    | Forensic analysis, debugging  |
| Location Events  | TimescaleDB hypertable `location_history` | Indefinite | Audit trail, movement history |
| Current Location | Relational `items.current_zone_id`        | N/A        | Real-time queries             |

**Current Implementation Status**: `location_history` hypertable exists. Verify separate `tag_reads` table exists for raw reads.

[NEEDS CLARIFICATION: What is the required retention period for raw tag reads?]

---

## 6. Core User Journeys

### 6.1 Workflow B: Search-and-Find (Hero Journey)

**Scenario**: Staff member needs to locate docket LAB-2024-001234.

**Frequency**: Many times daily, ambulatory workflow.

**Device**: Zebra MC3330xR handheld running React web app in Chrome.

#### 6.1.1 Workflow Steps

```
1. OPEN APP
   ├─ Staff member picks up shared MC3330xR handheld
   ├─ Opens Chrome, navigates to app (bookmarked)
   └─ App loads responsive mobile UI

2. SEARCH
   ├─ Tap search bar
   ├─ Enter query: "2024-001234" (partial match on any identifier)
   ├─ Results appear as staff types (debounced search)
   └─ Tap target docket in results

3. VIEW LOCATION
   ├─ App shows 2D floor-plan (PRIMARY view)
   ├─ Current zone highlighted on map
   ├─ Last seen timestamp displayed
   ├─ If multi-floor: floor indicator and navigation hint
   └─ Staff visually identifies destination zone

4. NAVIGATE TO ZONE
   ├─ Staff walks to physical zone
   └─ (No in-app navigation—staff knows the building)

5. SWITCH TO PROXIMITY-FIND MODE
   ├─ Staff taps "Find" button on docket detail
   ├─ App switches to proximity-find mode
   ├─ Target EPC locked from search context
   └─ Handheld RFID activates in focused-read mode

6. PROXIMITY FIND
   ├─ Screen shows signal-strength indicator (Geiger-counter style)
   ├─ Audio/haptic feedback as signal strengthens
   ├─ Staff sweeps handheld across shelves/stacks
   ├─ Signal peaks when pointing at target docket
   └─ Staff retrieves docket

7. CONFIRM (Optional)
   ├─ Staff taps "Found" to log successful retrieval
   └─ App returns to search screen
```

#### 6.1.2 Target Time

**<60 seconds** from opening app to physical retrieval in pilot zone.

Breakdown:

- Open app + search: ~10 seconds
- View location + walk to zone: ~30 seconds (zone-dependent)
- Proximity find: ~15 seconds
- Buffer: ~5 seconds

#### 6.1.3 UI Requirements for Handheld

| Requirement                    | Rationale                                         |
| ------------------------------ | ------------------------------------------------- |
| **2D floor-plan mandatory**    | Primary navigation aid; must work on small screen |
| **Large touch targets**        | Minimum 44px; staff may wear gloves               |
| **High contrast**              | Visibility in bright lab lighting                 |
| **Minimal scrolling**          | Critical info above fold                          |
| **Proximity mode full-screen** | No distractions during find                       |
| **Audio feedback**             | Geiger-counter beeps as signal strengthens        |
| **Haptic feedback**            | Vibration pulses (if device supports)             |

#### 6.1.4 Implementation Status

**Current State**:

- Search exists (DocketSearchPanel) — verify mobile responsiveness
- Floor-plan visualization exists (FloorPlan2D, Scene3D) — **2D must be primary**
- Proximity-find mode: **NOT IMPLEMENTED**

**[RETROFIT REQUIRED]** Proximity-find mode for MC3330xR:

1. Create proximity-find UI (full-screen, signal strength display)
2. Integrate with MC3330xR built-in RFID reader (DataWedge API or Zebra EMDK)
3. Implement RSSI → visual/audio/haptic feedback
4. Single-tag focus mode (filter to target EPC only)
5. Test on actual MC3330xR hardware

### 6.2 Zone Audit View

**Scenario**: Custodian audits Evidence Room A.

**Steps**:

1. Select "Zone Audit" mode
2. Choose zone from list/map
3. View list of all dockets currently in zone:
   - Lab number, case number
   - Last seen timestamp (within this zone)
   - Time in zone (calculated)
4. Optionally filter by stale threshold
5. Optionally export to CSV

**Current Implementation Status**: GetZoneItemsUseCase exists. UI for zone audit view needs verification.

### 6.3 Movement History

**Scenario**: Supervisor reviews docket movement for chain-of-custody documentation.

**Steps**:

1. Search for docket
2. Select "Movement History" tab
3. View chronological list:
   - Timestamp
   - Zone entered
   - Exit crossed (if applicable)
   - Duration in each zone
4. Filter by date range
5. Export to PDF/CSV

**Current Implementation Status**: GetItemHistoryUseCase exists. location_history table provides data. Verify exit crossing is tracked distinctly.

---

## 7. Alert System

### 7.1 Alert Types

| Alert           | Trigger                                                   | Severity | Action                                     |
| --------------- | --------------------------------------------------------- | -------- | ------------------------------------------ |
| Exit Alert      | Docket crosses any of 5 perimeter exits                   | HIGH     | Immediate notification to supervisor       |
| Restricted Zone | Docket enters restricted zone without authorized presence | HIGH     | Immediate notification                     |
| Stale Docket    | Docket not seen for configured threshold                  | MEDIUM   | Dashboard indicator, optional notification |
| Reader Offline  | Reader stops responding                                   | HIGH     | Immediate notification to admin            |
| Unbound Tag     | Unknown tag detected                                      | LOW      | Dashboard counter                          |

### 7.2 Exit Detection Logic

```
When docket last seen at EXIT zone:
  Start exit timer (EXIT_CONFIRMATION_WINDOW = 30 seconds)

If no internal read within window:
  Mark docket status = "CHECKED_OUT_EXTERNAL"
  Generate EXIT_ALERT event
  Pause internal tracking

When docket next seen by ANY internal reader:
  Mark docket status = "ACTIVE"
  Log gap period
  Resume tracking
```

### 7.3 Restricted Zone Logic

```
When docket enters RESTRICTED zone:
  Check if authorized_user_present (via access card integration, if available)
  If not authorized OR no integration:
    Generate RESTRICTED_ZONE_ALERT
    Notify supervisor for human triage
```

[NEEDS CLARIFICATION: Is access-card integration available? What system?]

### 7.4 Implementation Status

**[RETROFIT REQUIRED]** Current implementation has basic event-driven notifications but lacks:

- Dedicated AlertService with configurable rules
- Exit detection logic with confirmation window
- Restricted zone alert logic
- Notification channels (email, SMS)

**Retrofit Tasks**:

1. Create `AlertService` in application layer
2. Implement exit detection state machine
3. Implement restricted zone alert logic
4. Add notification channels (email via SMTP, SMS via TWILIO if required)
5. Create alert configuration UI

---

## 8. Handheld Integration

### 8.1 Handheld Device

**Model**: Zebra MC3330xR Integrated Handheld UHF RFID Reader

| Spec        | Value                          |
| ----------- | ------------------------------ |
| Platform    | Android (Chrome browser)       |
| RFID        | Integrated UHF, ~6m read range |
| Read Rate   | 1,300+ tags/sec                |
| Barcode     | Integrated 1D/2D scanner       |
| Form Factor | Pistol grip, rugged            |
| Display     | Touch screen                   |

**Why MC3330xR over RFD40 sled**:

- Integrated unit (no pairing/connection issues)
- ~6m read range is deliberate (long range causes false positives)
- Pistol grip ergonomics for repeated use
- Rugged for lab environment

### 8.2 Integration Approach

**No native Android app for v1.** The React web app runs as a responsive web app in Chrome on the MC3330xR.

**RFID Integration Options** (in order of preference):

1. **Zebra DataWedge** (Recommended)
   - DataWedge is pre-installed on MC3330xR
   - Configure DataWedge to output RFID reads as keyboard input
   - Web app receives RFID data via standard input events
   - No native code required
   - Limitation: May not provide real-time RSSI for proximity mode

2. **Zebra EMDK for JavaScript**
   - Zebra provides JavaScript API for RFID access
   - Can be used from web app via Zebra Enterprise Browser
   - Provides RSSI values for proximity feedback
   - Requires Zebra Enterprise Browser (not standard Chrome)

3. **Progressive Web App + Native Bridge** (Future)
   - PWA with native Android module for RFID
   - Most capable but highest development effort
   - Consider for v2 if DataWedge insufficient

### 8.3 Proximity-Find Mode

When user taps "Find" on a docket:

```
┌─────────────────────────────────────────┐
│  FINDING: LAB-2024-001234               │
│                                         │
│         ┌─────────────────┐             │
│         │                 │             │
│         │   ████████░░░   │  ← Signal   │
│         │   ████████░░░   │    Strength │
│         │   ████████░░░   │    Bars     │
│         │                 │             │
│         └─────────────────┘             │
│                                         │
│  🔊 BEEP RATE: ████████░░  (faster =    │
│                             closer)     │
│                                         │
│  Last RSSI: -45 dBm (STRONG)           │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │           [ FOUND ]                 ││
│  │           [ CANCEL ]                ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Feedback Modes**:

- **Visual**: Signal strength bars (0-100%)
- **Audio**: Beep rate increases as signal strengthens (Geiger-counter)
- **Haptic**: Vibration pulses increase (if supported)

### 8.4 Implementation Status

**[RETROFIT REQUIRED]** Proximity-find mode is NOT implemented.

**Retrofit Tasks**:
| Task | Effort | Notes |
|------|--------|-------|
| Research DataWedge RFID capabilities | S | Check if RSSI available |
| Create proximity-find UI component | M | Full-screen, signal display |
| Implement DataWedge input handling | M | Keyboard wedge for tag reads |
| Add audio feedback (Web Audio API) | S | Beep rate tied to RSSI |
| Add haptic feedback (Vibration API) | S | If supported |
| Test on MC3330xR hardware | M | Requires device |
| Fallback if DataWedge insufficient | L | EMDK or native bridge |

**Hardware Requirement**: At least one MC3330xR device needed for development/testing.

---

## 9. Licensing System

### 9.1 Requirements

- Software bound to specific installation site
- Licence file verified at startup
- System refuses to run if licence absent, tampered, or wrong site
- No cloud dependency for licence validation

### 9.2 Licence File Structure

```json
{
  "licence_id": "UUID",
  "customer": "Forensic Science Laboratory",
  "site": "FSL Plattekloof",
  "site_signature": "hash(hardware_fingerprint + site_coords)",
  "issued_at": "ISO8601",
  "expires_at": "ISO8601",
  "features": ["core_tracking", "alerts", "analytics"],
  "max_readers": 20,
  "max_dockets": 100000,
  "signature": "RSA_signature_of_above"
}
```

### 9.3 Validation Process

```
At startup:
  Load licence file from /etc/saps-rfid/licence.json
  Verify RSA signature against embedded public key
  Calculate current site_signature
  Compare to licence site_signature
  If mismatch: REFUSE TO START
  If expired: WARN but allow grace period
  Log licence status
```

### 9.4 Implementation Status

**[RETROFIT REQUIRED]** No licence validation exists in current codebase. Package.json declares "PROPRIETARY" licence but no enforcement code.

**Retrofit Tasks**:

1. Create `LicenceService` in infrastructure layer
2. Implement site fingerprinting (hardware identifiers + optional GPS)
3. Implement RSA signature verification
4. Add startup validation hook
5. Create licence generation tool (separate utility)

---

## 10. Scale Requirements

### 10.1 Expected Load

| Metric                 | Value                 | Notes                 |
| ---------------------- | --------------------- | --------------------- |
| Internal movements/day | 5,000 (peak)          | Zone transitions      |
| Total movements/day    | 10,000                | Including archive     |
| New dockets/year       | 500,000               | ~1,370/day average    |
| Active dockets         | [NEEDS CLARIFICATION] | Estimate needed       |
| Readers                | ~20                   | 5 exits + 15 internal |
| Concurrent users       | ~50                   | Estimate              |

### 10.2 Performance Targets

| Operation         | Target          | Current Status        |
| ----------------- | --------------- | --------------------- |
| API response      | <300ms          | Verified in CLAUDE.md |
| Search query      | <100ms          | Needs verification    |
| Tag processing    | <50ms per batch | Claimed in CLAUDE.md  |
| WebSocket latency | <200ms          | Needs verification    |
| Dashboard load    | <2s initial     | Needs verification    |

### 10.3 Ingestion Pipeline

Must handle 5,000+ movements/day without visible queuing delay. At peak:

- ~350 movements/hour
- ~6 movements/minute
- Burst capacity for 100+ simultaneous tag reads (portal scenarios)

**Current Implementation Status**: OptimizedEventPipeline exists with batch processing. Verify it meets throughput requirements under load.

---

## 11. Failure Modes and Resilience

### 11.1 Reader Offline

**Behavior**:

- System continues functioning with remaining readers
- Offline reader triggers READER_OFFLINE alert
- Dashboard shows reader status (green/red indicators)
- When reader reconnects:
  - Buffered reads ingested with correct timestamps
  - Reader status returns to green

**Important**: Reader clocks are NOT trusted. Server timestamps all reads at ingestion.

**Current Implementation Status**: ReaderHealthMonitor exists. Verify buffered read recovery works.

### 11.2 Database Unavailable

**Behavior**:

- Tag reads buffered in memory (bounded queue)
- API returns 503 Service Unavailable
- WebSocket connections maintained with stale data warning
- On recovery: buffered reads persisted in order

### 11.3 Network Partition

**Behavior**:

- Readers continue buffering locally (if supported)
- Backend processes reads when connectivity restored
- Timestamps from server, not reader

---

## 12. Site Survey Requirements

Before deployment, a site survey must identify:

1. **RF Interference**: Metal shelving, cabinets, elevators that degrade reads
2. **Reader Placement**: Optimal positions for coverage without overlap
3. **Power/Network**: Ethernet and power availability at reader positions
4. **Zone Boundaries**: Physical boundaries vs. RF coverage boundaries
5. **Mitigation Plan**: Non-metallic shelving in pilot zone, cabinet antennas if needed

[NEEDS CLARIFICATION: Who performs the site survey? What deliverable format?]

---

## 13. Database Schema

### 13.1 Core Tables

```sql
-- Multi-tenant foundation
tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_tier TEXT,
  settings JSONB,
  created_at TIMESTAMP
)

-- User accounts (local, pending LDAP integration)
tenant_users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  email TEXT NOT NULL,
  password_hash TEXT,  -- NULL when using LDAP
  ldap_dn TEXT,        -- [RETROFIT] LDAP distinguished name
  role TEXT NOT NULL,
  permissions JSONB,
  UNIQUE(tenant_id, email)
)

-- Physical zones
zones (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  zone_type TEXT NOT NULL,
  is_restricted BOOLEAN DEFAULT false,  -- [VERIFY]
  is_exit BOOLEAN DEFAULT false,        -- [VERIFY]
  floor INTEGER,
  building TEXT,
  capacity INTEGER,
  coordinates JSONB,
  UNIQUE(tenant_id, code)
)

-- RFID readers
readers (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  name TEXT NOT NULL,
  ip_address INET NOT NULL,
  port INTEGER DEFAULT 5084,
  zone_id UUID REFERENCES zones,
  status TEXT DEFAULT 'offline',
  configuration JSONB,
  last_seen_at TIMESTAMP
)

-- Tracked dockets
items (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  item_number TEXT NOT NULL,        -- Lab number (primary)
  reference_id TEXT,                -- Case number
  station_charge TEXT,              -- [RETROFIT] Add this field
  rfid_tag_epc TEXT UNIQUE,
  status TEXT NOT NULL,
  current_zone_id UUID REFERENCES zones,
  last_seen_at TIMESTAMP,
  location_confidence DECIMAL(3,2),
  metadata JSONB,
  created_at TIMESTAMP,
  UNIQUE(tenant_id, item_number)
)

-- Raw tag reads (time-series)
tag_reads (                          -- [VERIFY] Does this exist?
  time TIMESTAMPTZ NOT NULL,
  tenant_id UUID,
  reader_id UUID,
  epc TEXT,
  rssi INTEGER,
  antenna INTEGER
) -- TimescaleDB hypertable

-- Processed location events (time-series)
location_history (
  time TIMESTAMPTZ NOT NULL,
  tenant_id UUID,
  item_id UUID,
  zone_id UUID,
  event_type TEXT,  -- 'entered', 'exited', 'exit_building', 'return'
  confidence DECIMAL(3,2),
  reader_id UUID
) -- TimescaleDB hypertable

-- Alert configuration
alert_rules (                        -- [RETROFIT] Create this
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  conditions JSONB,
  actions JSONB,
  is_active BOOLEAN DEFAULT true
)

-- Alert instances
alerts (                             -- [RETROFIT] Create this
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  rule_id UUID REFERENCES alert_rules,
  item_id UUID REFERENCES items,
  zone_id UUID REFERENCES zones,
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  severity TEXT,
  message TEXT
)
```

### 13.2 Retrofit Schema Tasks

1. Add `station_charge` column to `items` table
2. Verify `tag_reads` hypertable exists for raw reads
3. Add `is_restricted`, `is_exit` columns to `zones` table (or verify existing)
4. Create `alert_rules` and `alerts` tables
5. Add `ldap_dn` column to `tenant_users` table

---

## 14. API Endpoints

### 14.1 Search & Location

```
GET  /api/v1/items/search?q={query}
     - Search by lab number, case number, or station charge
     - Returns: item details + current zone + last seen

GET  /api/v1/items/{id}
     - Full item details including metadata

GET  /api/v1/items/{id}/history
     - Movement history with zone transitions

GET  /api/v1/items/{id}/location
     - Current location optimized for real-time polling
```

### 14.2 Zone Operations

```
GET  /api/v1/zones
     - List all zones with current occupancy

GET  /api/v1/zones/{id}
     - Zone details with reader list

GET  /api/v1/zones/{id}/items
     - All items currently in zone (audit view)
```

### 14.3 Reader Management

```
GET  /api/v1/readers
     - List all readers with status

GET  /api/v1/readers/{id}/status
     - Real-time reader health

POST /api/v1/readers/{id}/restart
     - Restart reader connection (admin only)
```

### 14.4 Alerts

```
GET  /api/v1/alerts
     - List alerts (filterable by type, severity, acknowledged)

POST /api/v1/alerts/{id}/acknowledge
     - Acknowledge an alert

GET  /api/v1/alert-rules
     - List configured alert rules

POST /api/v1/alert-rules
     - Create alert rule (admin only)
```

### 14.5 Tag Binding

```
POST /api/v1/items
     - Create new item with tag binding
     - Body: { lab_number, case_number, station_charge, rfid_epc }

POST /api/v1/items/{id}/bind-tag
     - Bind tag to existing untagged item
     - Body: { rfid_epc }
```

---

## 15. WebSocket Events

### 15.1 Client → Server

```
subscribe:zones [zoneIds]      - Subscribe to zone updates
subscribe:item [itemId]        - Subscribe to specific item
subscribe:alerts               - Subscribe to alert stream
unsubscribe:zones [zoneIds]
unsubscribe:item [itemId]
```

### 15.2 Server → Client

```
item:location-changed {
  itemId,
  previousZone,
  currentZone,
  timestamp,
  confidence
}

zone:occupancy-changed {
  zoneId,
  occupancy,
  delta  // +1 or -1
}

alert:triggered {
  alertId,
  type,
  severity,
  itemId,
  zoneId,
  message,
  timestamp
}

reader:status-changed {
  readerId,
  status,  // online, offline, error
  message
}
```

---

## 16. Technology Stack Summary

### 16.1 Target State

| Component     | Technology                     | Notes                          |
| ------------- | ------------------------------ | ------------------------------ |
| Backend       | Node.js 20 + TypeScript        | Existing                       |
| Framework     | Express                        | Existing                       |
| Database      | PostgreSQL 15 + TimescaleDB    | Existing                       |
| Cache         | Redis 7                        | Existing                       |
| RFID Protocol | MQTT via Mosquitto             | [RETROFIT] Currently LLRP      |
| Auth          | LDAP/SSO via passport-ldapauth | [RETROFIT] Currently JWT local |
| Real-time     | Socket.IO                      | Existing                       |
| Frontend      | React 18 + TypeScript          | Existing                       |
| 3D Render     | React Three Fiber              | Existing                       |
| State         | Zustand                        | Existing                       |
| Container     | Docker + docker-compose        | Existing                       |
| Monitoring    | Prometheus + Grafana           | Existing                       |

### 16.2 Retrofit Summary

| Task                    | Priority | Effort | Notes                                                                       |
| ----------------------- | -------- | ------ | --------------------------------------------------------------------------- |
| MQTT reader integration | DECISION | Large  | Only if customer has IoT Connector licenses; LLRP is already vendor-neutral |
| LDAP/SSO authentication | HIGH     | Medium | Required for customer integration                                           |
| Licence validation      | HIGH     | Medium | Required for commercial deployment                                          |
| Alert system completion | HIGH     | Medium | Core feature requirement                                                    |
| Exit detection logic    | HIGH     | Small  | Core feature requirement                                                    |
| Restricted zone alerts  | MEDIUM   | Small  | Core feature requirement                                                    |
| Handheld integration    | MEDIUM   | Large  | Scope TBD based on mobile platform                                          |
| `station_charge` field  | LOW      | Small  | Schema addition                                                             |
| Raw `tag_reads` table   | LOW      | Small  | May already exist, verify                                                   |

---

## 17. Non-Functional Requirements

### 17.1 Visualization Hierarchy

**2D Floor-Plan is MANDATORY.** It must be the primary interface for:

- All zone views on dashboard
- All zone views on handheld
- Search results location display
- Zone audit views

**3D Visualization is AUXILIARY.** It is:

- Nice-to-have for desktop dashboard
- NOT required for pilot success
- NOT rendered on handheld (performance, screen size)
- Can be hidden behind a toggle or removed entirely

**Rationale**: The handheld (MC3330xR) runs a responsive web app in Chrome. 3D rendering (WebGL/Three.js) is:

- Heavy on mobile GPU
- Unnecessary for the find workflow (zone-level is sufficient)
- Poor UX on small screen with touch

### 17.2 Responsive Design Requirements

| Breakpoint | Device              | Requirements                                 |
| ---------- | ------------------- | -------------------------------------------- |
| <768px     | Handheld (MC3330xR) | 2D only, large touch targets, proximity mode |
| 768-1024px | Tablet              | 2D primary, optional 3D toggle               |
| >1024px    | Desktop             | 2D primary, optional 3D view                 |

### 17.3 Performance on Handheld

| Metric                 | Target          |
| ---------------------- | --------------- |
| Initial load           | <3 seconds      |
| Search response        | <500ms          |
| Floor-plan render      | <1 second       |
| Proximity mode latency | <100ms per read |

---

## 18. Features Found in Code but Not in Brief

The following features exist in the codebase but were not mentioned in the brief. Decision needed: keep, cut, or properly spec?

### 18.1 3D Visualization (React Three Fiber)

**Current**: Full 3D building visualization with zone blocks, particle effects, camera controls.

**Decision**: **KEEP as auxiliary.** 2D is mandatory and primary. 3D can remain for desktop users who want it, but:

- Must be behind a toggle (not default)
- Must not load on handheld breakpoints
- Must not block pilot if incomplete

### 18.2 Analytics Engine (Python/Open3D)

**Current**: Separate Python service for spatial analytics.

**Decision Needed**: Is this needed for v1, or Phase 2+?

### 18.3 Multi-Tenant Architecture

**Current**: Full multi-tenant support with tenant isolation.

**Decision Needed**: Is multi-tenancy needed for pilot (single customer), or is it future-proofing?

### 18.4 Pathfinding Service

**Current**: `PathfindingController`, `SpatialAnalyticsController` exist.

**Decision Needed**: Is pathfinding (route to docket) required for v1?

### 18.5 Subscription Tiers

**Current**: trial, starter, professional, enterprise tiers with feature flags.

**Decision Needed**: Required for pilot, or commercial infrastructure for later?

### 18.6 i18n (Internationalization)

**Current**: English + Afrikaans translations.

**Decision Needed**: Required for pilot?

### 18.7 Dark/Light Theme

**Current**: Theme toggle with system preference detection.

**Decision Needed**: Required or nice-to-have?

---

## 19. Open Questions

[NEEDS CLARIFICATION: These items require answers before implementation planning]

### Answered (removed from list)

- ~~Handheld Integration~~: **ANSWERED** — MC3330xR, responsive web app in Chrome, DataWedge integration

### Still Open

1. **Identifier Formats**: What are the exact formats for lab number, case number, and station charge? Are they encoded in a single barcode or separate?

2. **Active Docket Count**: How many dockets are typically "active" at any time? This affects query performance planning.

3. **Access Card Integration**: Is there an existing access card system that could provide "authorized user present" data for restricted zones? What protocol?

4. **Site Survey**: Who performs the RF site survey? What is the deliverable format?

5. **Raw Read Retention**: How long should raw tag reads be retained? 90 days? 1 year?

6. **Stale Threshold**: What is the default stale threshold? 24 hours? Configurable per zone?

7. **Notification Channels**: Beyond dashboard alerts, are email/SMS notifications required for v1?

8. **Offline Operation**: If network is down, should the frontend cache data and work offline?

9. **Backup/Recovery**: What are the backup requirements? RPO/RTO targets?

10. **ZD621R Integration**: What interface does the customer expect for the ZD621R? USB direct? Network print server? Zebra Browser Print?

11. **DataWedge RSSI**: Does Zebra DataWedge on MC3330xR expose RSSI values for proximity mode, or do we need Zebra Enterprise Browser / EMDK?

12. **MQTT vs LLRP**: Does customer have Zebra IoT Connector licenses for MQTT on FX9600 readers? If not, LLRP (already implemented) is the practical choice.

---

## 20. Success Criteria (Pilot)

| Criterion              | Measurement                      | Target                  |
| ---------------------- | -------------------------------- | ----------------------- |
| Locate docket time     | Stopwatch test                   | <60 seconds             |
| Exit alert coverage    | Test all 5 exits                 | 100% detection          |
| Zone audit accuracy    | Compare physical count to system | Within debounce window  |
| Lab-wide search events | Incident log                     | Zero for tagged dockets |
| System latency         | Dashboard response time          | <300ms at peak load     |
| Uptime                 | Monitoring                       | >99.5% during pilot     |

---

## 21. Document History

| Version | Date       | Author | Changes                                                                                                                                                                                                                                       |
| ------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-04-19 | Claude | Initial specification draft                                                                                                                                                                                                                   |
| 1.1     | 2026-04-19 | Claude | Major revision: Added Workflow A (tag-binding) and Workflow B (search-and-find) as distinct workflows; Added hardware stack (ZD621R, DS2208, MC3330xR); Clarified 2D mandatory, 3D auxiliary; Added device categories; Updated retrofit tasks |

---

## Appendix A: Retrofit Task Summary

### A.1 Workflow A: Tag-Binding Workstation

| ID   | Task                                 | Priority | Effort | Notes                                |
| ---- | ------------------------------------ | -------- | ------ | ------------------------------------ |
| R-A1 | Tag-binding UI workflow              | HIGH     | M      | Multi-step intake flow               |
| R-A2 | Barcode scanner integration (DS2208) | HIGH     | S      | Keyboard wedge input handling        |
| R-A3 | ZD621R printer/encoder integration   | HIGH     | L      | Zebra Browser Print or native driver |
| R-A4 | Duplicate lab number detection       | HIGH     | S      | Database check before bind           |
| R-A5 | Bind confirmation + rollback         | HIGH     | S      | Handle partial failures              |

### A.2 Workflow B: Handheld Find

| ID   | Task                                  | Priority | Effort | Notes                                |
| ---- | ------------------------------------- | -------- | ------ | ------------------------------------ |
| R-B1 | Proximity-find UI component           | HIGH     | M      | Full-screen, signal strength display |
| R-B2 | MC3330xR DataWedge integration        | HIGH     | M      | RFID via keyboard wedge              |
| R-B3 | Audio feedback (Web Audio API)        | MEDIUM   | S      | Geiger-counter beeps                 |
| R-B4 | Haptic feedback (Vibration API)       | LOW      | S      | If device supports                   |
| R-B5 | Responsive UI for handheld breakpoint | HIGH     | M      | <768px optimized layout              |
| R-B6 | 2D floor-plan as primary view         | HIGH     | S      | Verify/enforce 2D default            |

### A.3 Device Category Support

| ID   | Task                              | Priority | Effort | Notes                        |
| ---- | --------------------------------- | -------- | ------ | ---------------------------- |
| R-C1 | Verify responsive breakpoints     | HIGH     | S      | Desktop, tablet, handheld    |
| R-C2 | 3D visualization behind toggle    | MEDIUM   | S      | Not default, not on mobile   |
| R-C3 | Device-specific feature detection | MEDIUM   | M      | Detect MC3330xR capabilities |

### A.4 Core Infrastructure

| ID   | Task                         | Priority | Effort | Notes                                               |
| ---- | ---------------------------- | -------- | ------ | --------------------------------------------------- |
| R-D1 | MQTT reader integration      | DECISION | L      | LLRP already vendor-neutral; pending customer input |
| R-D2 | LDAP/SSO authentication      | HIGH     | M      | Required for customer SSO                           |
| R-D3 | Licence validation           | HIGH     | M      | Site-bound licence enforcement                      |
| R-D4 | AlertService completion      | HIGH     | M      | Exit, restricted zone, stale alerts                 |
| R-D5 | Exit detection state machine | HIGH     | S      | CHECKED_OUT_EXTERNAL status                         |

### A.5 Database Schema

| ID   | Task                                | Priority | Effort | Notes                |
| ---- | ----------------------------------- | -------- | ------ | -------------------- |
| R-E1 | Add station_charge field            | LOW      | S      | Items table          |
| R-E2 | Verify/create tag_reads hypertable  | LOW      | S      | Raw reads storage    |
| R-E3 | Add is_exit, is_restricted to zones | LOW      | S      | May already exist    |
| R-E4 | Create alert_rules, alerts tables   | MEDIUM   | S      | For alert system     |
| R-E5 | Add ldap_dn to tenant_users         | LOW      | S      | For LDAP integration |

---

**Effort Key**: S = Small (<1 day), M = Medium (1-3 days), L = Large (3+ days)

**Priority Key**:

- HIGH = Required for pilot success criteria
- MEDIUM = Required for v1 but not blocking pilot
- LOW = Nice to have / cleanup
- DECISION = Pending clarification before prioritization

---

**Critical Path for Pilot**:

1. R-A1 through R-A5 (Tag-binding) — Cannot track dockets without this
2. R-B1 through R-B2, R-B5, R-B6 (Handheld find) — Hero journey
3. R-D2 (LDAP) — Customer authentication
4. R-D4, R-D5 (Alerts) — Exit detection is a pilot success criterion
