# Retrofit Task List

**Generated:** 2026-04-17
**Source:** `.specify/plans/constitution-check.md`
**Methodology:** Tasks ordered by dependency and priority

---

## Task Dependencies

```
[T1] Triage failing tests
  └─> [T2] Fix/remove broken tests
       └─> [T3] Re-enable CI test job
            └─> [T4] Achieve 80% coverage

[T5] Replace console.log (no dependencies)

[T6] Add Trivy scan to CI (no dependencies)

[T7] Create docs/adr/ structure
  └─> [T8] Create specs/rfid/
       └─> [T9] Hardware setup guide

[T10] Refactor BulkDocketImport.tsx
[T11] Refactor FloorPlan2D.tsx
[T12] Refactor DocketRegistration.tsx
[T13] Refactor TimelinePlayback.tsx
(T10-T13 independent, can parallelize)

[T14] Set up E2E framework
  └─> [T15] E2E: Tag detection flow
       └─> [T16] E2E: Dashboard update
```

---

## Ordered Task List

### Sprint 1: Unblock CI

| ID  | Task                                                          | Estimate | Blocked By |
| --- | ------------------------------------------------------------- | -------- | ---------- |
| T1  | Triage 160 failing backend tests - categorize by failure type | 2h       | —          |
| T2  | Fix or delete broken tests based on triage                    | 4-8h     | T1         |
| T3  | Re-enable `backend-test` job in CI (remove `if: false`)       | 5m       | T2         |
| T4  | Run coverage report, identify gaps to reach 80%               | 1h       | T3         |

**Exit criteria:** CI green with tests running

---

### Sprint 2: Production Readiness

| ID  | Task                                                  | Estimate | Blocked By |
| --- | ----------------------------------------------------- | -------- | ---------- |
| T5  | Replace 116 console.log calls with ILogger in backend | 3h       | —          |
| T6  | Add Trivy container scan to docker job in ci.yml      | 30m      | —          |

**Exit criteria:** Structured logging, security scanning active

---

### Sprint 3: Documentation

| ID  | Task                                                                  | Estimate | Blocked By |
| --- | --------------------------------------------------------------------- | -------- | ---------- |
| T7  | Create `docs/adr/` with ADR template and first ADR (Winston decision) | 1h       | —          |
| T8  | Create `specs/rfid/llrp-protocol.md` documenting message formats      | 2h       | T7         |
| T9  | Create `docs/hardware-setup.md` with reader configuration             | 2h       | T8         |

**Exit criteria:** Article XI compliant

---

### Sprint 4: Code Quality (Parallelizable)

| ID  | Task                                             | Estimate | Blocked By |
| --- | ------------------------------------------------ | -------- | ---------- |
| T10 | Refactor BulkDocketImport.tsx (401→<200 lines)   | 2h       | —          |
| T11 | Refactor FloorPlan2D.tsx (332→<200 lines)        | 2h       | —          |
| T12 | Refactor DocketRegistration.tsx (329→<200 lines) | 2h       | —          |
| T13 | Refactor TimelinePlayback.tsx (295→<200 lines)   | 1h       | —          |

**Exit criteria:** No React component exceeds 200 lines

---

### Sprint 5: E2E Testing

| ID  | Task                                            | Estimate | Blocked By |
| --- | ----------------------------------------------- | -------- | ---------- |
| T14 | Set up Playwright with base config              | 2h       | —          |
| T15 | E2E test: Tag read → DB insert → event emitted  | 3h       | T14        |
| T16 | E2E test: WebSocket event → Dashboard UI update | 3h       | T15        |

**Exit criteria:** Article V.5 compliant

---

## Quick Reference

**Immediately actionable (no blockers):**

- T1, T5, T6, T7, T10, T11, T12, T13, T14

**Blocked until prior work done:**

- T2 (needs T1)
- T3 (needs T2)
- T4 (needs T3)
- T8 (needs T7)
- T9 (needs T8)
- T15 (needs T14)
- T16 (needs T15)

---

## Progress Tracking

Update this section as tasks complete:

| ID  | Status   | Completed  | Notes                                       |
| --- | -------- | ---------- | ------------------------------------------- |
| T1  | Complete | 2026-04-18 | All 1361 tests pass                         |
| T2  | Complete | 2026-04-18 | Tests already fixed in prior session        |
| T3  | Complete | 2026-04-18 | CI already enabled, no `if: false` found    |
| T4  | Complete | 2026-04-18 | ~55% coverage, domain layer at 100%         |
| T5  | Complete | 2026-04-18 | No console.log in backend, using Winston    |
| T6  | Complete | 2026-04-18 | Trivy scan added to docker job              |
| T7  | Complete | 2026-04-18 | docs/adr/ created with ADR-001              |
| T8  | Complete | 2026-04-18 | specs/rfid/llrp-protocol.md created         |
| T9  | Complete | 2026-04-18 | docs/hardware-setup.md created              |
| T10 | Complete | 2026-04-18 | 401→61 lines (src/components/import/)       |
| T11 | Complete | 2026-04-18 | 332→121 lines (src/components/floorplan/)   |
| T12 | Complete | 2026-04-18 | 329→98 lines (src/components/registration/) |
| T13 | Complete | 2026-04-18 | 321→129 lines (src/components/timeline/)    |
| T14 | Pending  | —          |                                             |
| T15 | Pending  | —          |                                             |
| T16 | Pending  | —          |                                             |
