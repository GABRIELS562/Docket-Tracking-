# Constitution Check — Retrofit Backlog

**Generated:** 2026-04-17
**Branch:** `chore/sdlc-retrofit`
**Source:** Comparison of existing codebase against `.specify/memory/constitution.md`

---

## Summary

| Article                   | Status    | Violations                |
| ------------------------- | --------- | ------------------------- |
| I — Stack & Architecture  | Compliant | 0                         |
| II — Hardware Integration | Partial   | 1 (missing specs/rfid/)   |
| III — Data Integrity      | Compliant | 0                         |
| IV — Code Quality         | Violation | 8 oversized components    |
| V — Testing               | Violation | Tests failing, no E2E     |
| VI — Security             | Compliant | Dependabot, CodeQL active |
| VII — Containerization    | Compliant | Docker working            |
| VIII — Version Control    | Compliant | Branch protection active  |
| IX — CI/CD                | Partial   | Backend tests disabled    |
| X — Observability         | Violation | 116 console.log calls     |
| XI — Documentation        | Violation | Missing ADRs, specs/rfid  |
| XII — Delivery Standards  | Partial   | Not all checks passing    |

---

## Critical Violations (Block Delivery)

### 1. Backend Tests Failing — Article V

**Status:** 160 of 643 tests failing
**Impact:** Cannot validate business logic changes
**Location:** `saps-rfid-platform/tests/`

**Action Required:**

- [ ] Triage failing tests (categorize: mock issues, database setup, logic errors)
- [ ] Fix or delete flaky/obsolete tests
- [ ] Achieve 80% coverage on domain + application layers
- [ ] Re-enable `backend-test` job in CI

### 2. Console.log Usage — Article X

**Status:** 116 occurrences in backend
**Impact:** Production logs unstructured, no correlation IDs
**Location:** `saps-rfid-platform/src/` (33 files)

**Files with most violations:**
| File | Count |
|------|-------|
| `index.ts` | 23 |
| `PostgresConnection.ts` | 9 |
| `ReaderConnectionPool.ts` | 9 |
| `GetItemDetailsUseCase.ts` | 5 |
| `LLRPGateway.ts` | 5 |
| `LLRPReaderConnection.ts` | 5 |

**Action Required:**

- [ ] Replace all `console.log` with injected `ILogger`
- [ ] Add correlation ID to request context
- [ ] Ensure structured JSON output in production

---

## High-Priority Violations

### 3. Oversized React Components — Article IV.6

**Rule:** React components MUST NOT exceed 200 lines
**Status:** 8 components exceed limit

| Component               | Lines | Over By |
| ----------------------- | ----- | ------- |
| BulkDocketImport.tsx    | 401   | +201    |
| FloorPlan2D.tsx         | 332   | +132    |
| DocketRegistration.tsx  | 329   | +129    |
| TimelinePlayback.tsx    | 295   | +95     |
| DocketDetailModal.tsx   | 266   | +66     |
| ReaderMonitorPanel.tsx  | 228   | +28     |
| ForensicBuilding.tsx    | 221   | +21     |
| NotificationHistory.tsx | 202   | +2      |

**Action Required:**

- [ ] Extract reusable hooks from large components
- [ ] Split into smaller, focused sub-components
- [ ] Move business logic to custom hooks

### 4. Missing Documentation — Article XI

**Status:** Required directories don't exist

| Required             | Status  |
| -------------------- | ------- |
| `docs/adr/`          | Missing |
| `specs/rfid/`        | Missing |
| Hardware setup guide | Missing |

**Action Required:**

- [ ] Create `docs/adr/` with template
- [ ] Create `specs/rfid/llrp-protocol.md`
- [ ] Create `docs/hardware-setup.md`

---

## Medium-Priority Violations

### 5. No E2E Tests — Article V.5

**Rule:** E2E tests MUST cover tag read → ingestion → database → dashboard
**Status:** Only unit and integration tests exist

**Action Required:**

- [ ] Set up Playwright or Cypress
- [ ] Create E2E test: tag detection flow
- [ ] Create E2E test: dashboard real-time update

### 6. Trivy Image Scan Not Configured — Article IX

**Status:** CI builds Docker images but doesn't scan
**Impact:** Security vulnerabilities may ship

**Action Required:**

- [ ] Add Trivy scan step to docker job
- [ ] Configure to fail on CRITICAL/HIGH

---

## Low-Priority / Deferred

### 7. TODO Comments Without Issue Links — Article IV.5

**Rule:** Format `// TODO(#123): description`
**Status:** No violations found (0 malformed TODOs)

**Note:** Constitution-compliant. No action needed.

### 8. Redis Not Active — Article VII

**Status:** Code exists but not wired in production
**Clarified:** Intentionally deferred per user (not a violation)

---

## Compliant Areas (No Action Needed)

- TypeScript strict mode enabled
- ESLint + Prettier enforced via pre-commit hooks
- Conventional Commits enforced via commitlint
- Health endpoints implemented (`/health`, `/health/detailed`)
- Prometheus metrics implemented (`/metrics`)
- Database migrations versioned with up/down
- Branch protection active on main
- Dependabot configured
- CodeQL scanning active
- Docker multi-stage builds working
- Main branch protected (no direct push)

---

## Recommended Prioritization

**Phase 1 — Unblock CI (High urgency)**

1. Fix backend tests OR permanently remove dead tests
2. Re-enable `backend-test` job

**Phase 2 — Production Readiness** 3. Replace console.log with Winston 4. Add Trivy scan to CI

**Phase 3 — Code Quality** 5. Refactor oversized React components 6. Create missing documentation

**Phase 4 — Testing Completeness** 7. Add E2E tests for critical flows

---

_This document is the source of truth for retrofit work. Update as items are completed._
