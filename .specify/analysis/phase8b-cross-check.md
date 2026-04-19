# Cross-Check Analysis — Phase 8b Core Docket Tracking

**Analysis Date**: 2026-04-19
**Spec Version**: 1.4 (Scope Corrected)
**Task List Version**: 1.0 (55 tasks)
**Status**: QUALITY GATE **PASS** (with observations)

---

## 1. Executive Summary

| Check                      | Status  | Notes                                        |
| -------------------------- | ------- | -------------------------------------------- |
| Spec ↔ Plan consistency    | ✅ PASS | All spec sections have plan coverage         |
| Plan ↔ Tasks consistency   | ✅ PASS | All violations mapped to tasks               |
| Critical path completeness | ✅ PASS | 12-task path covers pilot requirements       |
| Dependency ordering        | ✅ PASS | No circular dependencies; blockers respected |
| Phase 2 scope isolation    | ✅ PASS | No Phase 2 implementation in task list       |
| Constitution alignment     | ✅ PASS | All 12 articles addressed                    |
| Gap resolution             | ✅ PASS | GAP-01 deferred to Phase 2 (R-G8)            |
| Test coverage strategy     | ✅ PASS | 4-milestone progression defined              |

**Quality Gate Recommendation**: PROCEED TO IMPLEMENTATION

---

## 2. Spec ↔ Plan Coverage Matrix

### 2.1 Core Workflows

| Spec Section                       | Plan Section | Tasks          | Status |
| ---------------------------------- | ------------ | -------------- | ------ |
| 3A: Tag-Binding Workflow           | 4.2 MQTT     | H-04, FE-01-02 | ✅     |
| 4: Search & Discovery              | 2 Data Model | FE-09          | ✅     |
| 5: Reader Communication            | 4.1 Topics   | H-01-03        | ✅     |
| 7: Alert System                    | 5 Email      | FE-03-07       | ✅     |
| 8: Handheld Proximity-Find         | 3 Native     | H-05, FE-08    | ✅     |
| 12: Authentication                 | (implied)    | F-09           | ✅     |
| 14: Backup & Recovery              | 8 Runbook    | PP-03          | ✅     |
| 16: Site Survey                    | —            | PP-01          | ✅     |
| 18.5: Licensing (Commercial Model) | 1.2 Arch     | F-01           | ✅     |

### 2.2 Data Model Coverage

| Spec Entity     | Data Model Section | Migration Task | Status |
| --------------- | ------------------ | -------------- | ------ |
| Item            | 2.1 ERD            | existing       | ✅     |
| Zone            | 2.1 ERD            | F-11           | ✅     |
| Reader          | 2.1 ERD            | existing       | ✅     |
| tag_reads       | 2.1 ERD            | F-03           | ✅     |
| station_charge  | 2.1 ERD            | F-04           | ✅     |
| alert_rules     | 2.1 ERD            | F-10           | ✅     |
| alerts          | 2.1 ERD            | F-10           | ✅     |
| items partition | 2.2 Partitioning   | F-02           | ✅     |

### 2.3 Contract Completeness

| Contract    | Location                          | Referenced By     | Status |
| ----------- | --------------------------------- | ----------------- | ------ |
| REST API    | .specify/contracts/rest-api.md    | FE-\*, H-04, F-07 | ✅     |
| WebSocket   | .specify/contracts/websocket.md   | FE-\*, alerting   | ✅     |
| MQTT Topics | .specify/contracts/mqtt-topics.md | H-01, H-02, H-08  | ✅     |

---

## 3. Constitution ↔ Tasks Mapping

All 12 constitution articles have corresponding task coverage:

| Article                   | Violations | Tasks Addressing         | Remaining After |
| ------------------------- | ---------- | ------------------------ | --------------- |
| I (Stack & Architecture)  | 3          | P-01, H-01, H-06         | 0               |
| II (Hardware Integration) | 6          | H-01-06, P-06            | 0               |
| III (Data Integrity)      | 2          | F-03, F-04               | 0               |
| IV (Code Quality)         | 12         | Q-01-07, F-08            | 0               |
| V (Testing)               | 1          | Q-08-11                  | 0               |
| VI (Security)             | 1          | PP-05                    | 0               |
| VII (Containerization)    | 1          | F-06                     | 0               |
| VIII (Version Control)    | 1          | (documented deviation)   | 0               |
| IX (CI/CD)                | 2          | Q-11, PP-05              | 0               |
| X (Observability)         | 3          | F-08, F-12, H-01         | 0               |
| XI (Documentation)        | 4          | P-03-06, H-03            | 0               |
| XII (Delivery Standards)  | 5          | FE-01-02, FE-03-07, Q-\* | 0               |

---

## 4. Critical Path Validation

### 4.1 Path Trace Verification

```
F-01 → H-01 → H-02 → H-05 → H-04 → FE-01 → FE-03 → FE-04 → FE-08 → Q-11 → PP-02 → PP-06
```

| Step | Task                   | Pilot Requirement     | Dependency Valid?  |
| ---- | ---------------------- | --------------------- | ------------------ |
| 1    | F-01 (Licence)         | Commercial model      | ✅ (entry point)   |
| 2    | H-01 (MQTT Gateway)    | Reader communication  | ✅ needs licence   |
| 3    | H-02 (Mosquitto)       | Broker deployment     | ✅ needs gateway   |
| 4    | H-05 (Native Android)  | Proximity-find        | ✅ needs broker    |
| 5    | H-04 (ZD621R)          | Tag-binding           | ✅ needs broker    |
| 6    | FE-01 (Tag-binding)    | Registration workflow | ✅ needs printer   |
| 7    | FE-03 (Alert engine)   | Rule evaluation       | ✅ needs MQTT      |
| 8    | FE-04 (Exit alerts)    | Exit detection        | ✅ needs engine    |
| 9    | FE-08 (Proximity-find) | Locate within zone    | ✅ needs native    |
| 10   | Q-11 (80% coverage)    | Test gate             | ✅ needs proximity |
| 11   | PP-02 (Quickstart)     | Fresh clone works     | ✅ all built       |
| 12   | PP-06 (Dry-run)        | Rehearsal sign-off    | ✅ final gate      |

**Verdict**: Critical path is complete and correctly ordered.

### 4.2 Parallel Work Opportunities

Tasks marked `[P]` can proceed concurrently:

| Phase      | Parallel Tasks                     | Why Parallel?                     |
| ---------- | ---------------------------------- | --------------------------------- |
| Foundation | F-02, F-03, F-04, F-05, F-06, F-07 | No inter-dependencies             |
| Foundation | F-08, F-09, F-10, F-11, F-12       | Independent infrastructure        |
| Features   | FE-05, FE-06, FE-07                | All require FE-03, not each other |
| Features   | FE-09, FE-10, FE-11                | Independent UI components         |
| Quality    | Q-01-07                            | Component refactors parallel      |
| Polish     | P-01-06                            | Documentation parallel            |

**Efficiency**: Team can parallelize ~60% of work with proper coordination.

---

## 5. Dependency Graph Integrity

### 5.1 Circular Dependency Check

**Result**: NONE FOUND

All dependencies flow one direction:

- Foundation → Hardware → Features → Quality → Polish → Pre-Pilot

### 5.2 Blocker Integrity Check

| Task  | Blocked By (Declared)             | Actual Dependencies Verified?  |
| ----- | --------------------------------- | ------------------------------ |
| H-01  | F-01, F-03                        | ✅ Licence + tag_reads table   |
| H-02  | H-01                              | ✅ Need gateway to test broker |
| H-04  | H-02                              | ✅ Need MQTT for tag verify    |
| H-05  | H-02 + ADR-002                    | ✅ ADR added in corrections    |
| H-06  | H-01 verified                     | ✅ Cleanup after MQTT works    |
| FE-01 | H-04                              | ✅ Needs printer integration   |
| FE-02 | FE-01                             | ✅ Needs tag-binding UI        |
| FE-03 | H-01, F-10                        | ✅ Needs MQTT + alert tables   |
| FE-04 | FE-03, F-11                       | ✅ Needs engine + zone flags   |
| FE-08 | H-05                              | ✅ Needs native wrapper        |
| Q-11  | H-05, FE-08                       | ✅ Needs proximity tests       |
| PP-06 | PP-02, PP-05, FE-02, FE-04, FE-08 | ✅ Full system verified        |

---

## 6. Phase 2 Scope Isolation

### 6.1 Items Explicitly Deferred

| Item                     | Spec Location | Task Reference | Notes                  |
| ------------------------ | ------------- | -------------- | ---------------------- |
| HID/iClass integration   | A.7 R-G1      | H-08 (reserve) | MQTT topic reserved    |
| Push notifications       | A.7 R-G2      | —              | No v1 tasks            |
| PWA offline mode         | A.7 R-G3      | —              | No v1 tasks            |
| WAL archiving            | A.7 R-G4      | —              | pg_dump only for v1    |
| Hot standby              | A.7 R-G5      | —              | Single node for v1     |
| Analytics engine         | A.7 R-G6      | P-01 (comment) | Comment out in compose |
| Turn-by-turn pathfinding | A.7 R-G7      | —              | No v1 tasks            |
| Docket decommissioning   | A.7 R-G8      | —              | GAP-01 resolved        |

### 6.2 Verification: No Phase 2 Implementation Tasks

Scanned all 55 tasks — **NONE** implement Phase 2 features. All Phase 2 items are either:

- Reserved only (H-08)
- Commented out (P-01)
- Explicitly deferred (spec A.7)

---

## 7. Gap Analysis

### 7.1 Resolved Gaps

| Gap ID | Description            | Resolution       | Commit  |
| ------ | ---------------------- | ---------------- | ------- |
| GAP-01 | Docket decommissioning | Deferred to R-G8 | 784d7ac |

### 7.2 Open Gaps

**NONE** — All identified gaps have been resolved.

### 7.3 Potential Future Gaps (Not Blocking)

These are observations, not blockers:

| Observation        | Risk   | Mitigation                                                  |
| ------------------ | ------ | ----------------------------------------------------------- |
| Tag reuse policy   | Low    | Documented in R-G8 for Phase 2                              |
| Multi-site support | Low    | Single-site for v1; architecture allows expansion           |
| Bulk import        | Medium | Manual tag-binding scales to 1370/day; bulk is nice-to-have |

---

## 8. Test Coverage Strategy Validation

### 8.1 Milestone Sequence

| Milestone | Target | Blocked By  | Tasks | Realistic? |
| --------- | ------ | ----------- | ----- | ---------- |
| M1        | 25%    | —           | Q-08  | ✅ Yes     |
| M2        | 60%    | —           | Q-09  | ✅ Yes     |
| M3        | 75%    | H-01        | Q-10  | ✅ Yes     |
| M4        | 80%    | H-05, FE-08 | Q-11  | ✅ Yes     |

### 8.2 Coverage Scope Mapping

| Layer          | Current | M1  | M2  | M3  | M4  |
| -------------- | ------- | --- | --- | --- | --- |
| Domain         | 0%      | 80% | 80% | 80% | 80% |
| Application    | 0%      | 0%  | 70% | 80% | 80% |
| Presentation   | 0%      | 0%  | 0%  | 60% | 60% |
| Infrastructure | 25%     | 25% | 25% | 50% | 50% |
| Frontend       | 10%     | 10% | 10% | 30% | 50% |
| **Overall**    | ~10%    | 25% | 60% | 75% | 80% |

**Verdict**: Coverage strategy is achievable with milestone dependencies.

---

## 9. Effort Estimate Validation

### 9.1 Phase Totals

| Phase                  | Tasks | S   | M   | L   | Est. Days  | Realistic?          |
| ---------------------- | ----- | --- | --- | --- | ---------- | ------------------- |
| Foundation             | 12    | 8   | 4   | 0   | ~10        | ✅                  |
| Hardware & Integration | 8     | 3   | 2   | 3   | ~20 (+50%) | ✅ with contingency |
| Features               | 12    | 7   | 5   | 0   | ~15        | ✅                  |
| Code Quality           | 11    | 8   | 3   | 0   | ~12        | ✅                  |
| Polish                 | 6     | 6   | 0   | 0   | ~6         | ✅                  |
| Pre-Pilot              | 6     | 4   | 2   | 0   | ~7         | ✅                  |
| **Total**              | 55    | 36  | 16  | 3   | ~70 days   | ✅                  |

### 9.2 Risk Factors

| Risk                    | Impact | Probability | Mitigation in Task List   |
| ----------------------- | ------ | ----------- | ------------------------- |
| Zebra SDK unfamiliarity | +50%   | Medium      | ✅ H-05 contingency note  |
| ZD621R printer quirks   | +25%   | Low         | ✅ H-04 docs task         |
| MQTT broker config      | +10%   | Low         | ✅ H-02 ACL in acceptance |
| Test coverage delta     | +20%   | Medium      | ✅ 4-milestone approach   |

---

## 10. Recommendations

### 10.1 Ready to Implement

The following can begin immediately:

**Foundation (no blockers)**:

- F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-11, F-12

**Hardware (F-01 is only blocker)**:

- H-05 can begin ADR-002 draft
- H-08 can be done anytime

**Quality (no blockers)**:

- Q-01 through Q-07 (component refactors)
- Q-08 (domain tests)

### 10.2 First Week Priorities

| Task | Rationale                     |
| ---- | ----------------------------- |
| F-01 | Unblocks entire critical path |
| F-03 | Unblocks H-01 (tag_reads)     |
| Q-08 | Coverage M1, no dependencies  |
| P-04 | ADR-002 needed before H-05    |

### 10.3 Team Allocation Suggestion

| Role         | Week 1 Focus                   |
| ------------ | ------------------------------ |
| Backend Lead | F-01, F-03, H-01               |
| Backend Dev  | F-02, F-04, F-05, F-06, F-07   |
| Frontend Dev | Q-01 through Q-05 (refactors)  |
| QA / Test    | Q-08, Q-09 (domain, app tests) |
| DevOps       | F-06, H-02, P-04               |
| Android Dev  | P-04 (ADR-002), then H-05      |

---

## 11. Quality Gate Decision

### 11.1 Gate Criteria

| Criterion                   | Status | Notes                         |
| --------------------------- | ------ | ----------------------------- |
| All spec sections covered   | ✅     | 9/9 workflows mapped          |
| All violations have tasks   | ✅     | 41/41 mapped                  |
| Critical path complete      | ✅     | 12 tasks, no gaps             |
| No circular dependencies    | ✅     | Graph validated               |
| Phase 2 isolated            | ✅     | No implementation leakage     |
| Gaps resolved               | ✅     | GAP-01 → R-G8                 |
| Test strategy viable        | ✅     | 4 milestones, dependencies OK |
| Effort estimates reasonable | ✅     | 70 days with contingency      |

### 11.2 Verdict

**QUALITY GATE: PASS**

Proceed to `/speckit.implement`. Begin with F-01 (Licence validation) to unblock critical path.

---

## Document History

| Version | Date       | Author | Changes             |
| ------- | ---------- | ------ | ------------------- |
| 1.0     | 2026-04-19 | Claude | Initial cross-check |
