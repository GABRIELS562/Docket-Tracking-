# 🗺️ IMPLEMENTATION ROADMAP - Generic Inventory Platform

**Goal:** Transform forensic-specific code → Generic multi-tenant inventory SaaS
**Strategy:** Sequential foundation → Parallel features → Integration
**Timeline:** 12-14 weeks

---

## 📅 PHASE 0: GENERICIZATION (Weeks 1-3) - CRITICAL FOUNDATION

**Status:** 🔴 NOT STARTED (Must complete before new features)
**Goal:** Remove ALL forensic-specific code, establish generic inventory base
**Approach:** ⏩ SEQUENTIAL (one agent, step-by-step)

### Week 1: Backend Domain Layer Cleanup

**AI Agent:** `typescript-pro`
**Priority:** 🔴 CRITICAL

#### Day 1-2: Rename Domain Entities
```bash
TASK: "Rename all domain entities from forensic to generic terms"

CHANGES REQUIRED:
1. Docket.entity.ts → Item.entity.ts
2. DocketRepository → ItemRepository
3. DocketService → ItemService
4. All references to "docket" → "item"
5. lab_number → item_number
6. case_reference → reference_id

VALIDATION:
- Grep "Docket" should return 0 results
- Grep "docket" should return 0 results
- All tests still pass
```

#### Day 3-4: Update Value Objects
```bash
TASK: "Genericize value objects"

CHANGES:
1. LabNumber → ItemNumber (format: ANY-YYYY-NNNNNN, configurable)
2. CaseNumber → ReferenceId (format: configurable per tenant)
3. Remove forensic-specific validation rules
4. Add tenant-configurable formats

VALIDATION:
- No hardcoded "FSL" or forensic patterns
- Value objects accept generic formats
- Tests updated and passing
```

#### Day 5: Domain Events & Errors
```bash
TASK: "Rename domain events and errors"

CHANGES:
1. DocketRegisteredEvent → ItemRegisteredEvent
2. DocketMovedEvent → ItemMovedEvent
3. DocketNotFoundError → ItemNotFoundError
4. Update all event handlers

VALIDATION:
- Grep "Docket" returns 0 results in domain/
- All event handlers updated
- Event bus tests passing
```

---

### Week 2: Database & Infrastructure

**AI Agent:** `database-optimizer`
**Priority:** 🔴 CRITICAL

#### Day 1-2: Database Schema Migration
```sql
TASK: "Create migration to rename tables and columns"

-- Migration: 008_genericize_schema.sql
ALTER TABLE dockets RENAME TO items;
ALTER TABLE items RENAME COLUMN lab_number TO item_number;
ALTER TABLE items RENAME COLUMN case_reference TO reference_id;

-- Update constraints
ALTER TABLE items DROP CONSTRAINT check_lab_number_format;
ALTER TABLE items ADD CONSTRAINT check_item_number_format
  CHECK (item_number ~ '^[A-Z0-9]+-\d{4}-\d{6}$');

-- Update indexes
DROP INDEX IF EXISTS idx_dockets_lab_number;
CREATE INDEX idx_items_item_number ON items(item_number);

VALIDATION:
- Migration runs without errors
- All data preserved
- Tests with new schema pass
```

#### Day 3-4: Repository Layer
```bash
TASK: "Update repository implementations"

CHANGES:
1. DocketRepository.ts → ItemRepository.ts
2. Update all SQL queries (dockets → items)
3. Update column references
4. Add tenant_id filtering to ALL queries

VALIDATION:
- All repository tests pass
- Queries use tenant_id filtering
- No "docket" references in infrastructure/
```

#### Day 5: RFID Gateway
```bash
TASK: "Update RFID gateway for generic items"

CHANGES:
1. TagProcessor: Handle generic items
2. Update event payloads (docket → item)
3. RFIDSimulator: Generate generic items

VALIDATION:
- Simulator creates generic items
- Tag detection events use "item" terminology
- RFID tests pass
```

---

### Week 3: Frontend & API

**AI Agent:** `frontend-developer`
**Priority:** 🔴 CRITICAL

#### Day 1-2: React Components
```bash
TASK: "Genericize frontend components"

CHANGES:
1. DocketSearchPanel → ItemSearchPanel
2. DocketDetailModal → ItemDetailModal
3. mockDockets → mockItems
4. Update all props/state types

FILES TO UPDATE:
- src/components/ItemSearchPanel.tsx
- src/components/ItemDetailModal.tsx
- src/lib/mockData.ts
- src/store/useStore.ts

VALIDATION:
- Frontend compiles without errors
- No "docket" in src/
- Demo mode works with generic items
```

#### Day 3-4: API Endpoints
```bash
TASK: "Update REST API endpoints"

CHANGES:
1. /api/v1/dockets → /api/v1/items
2. Update controller names
3. Update route files
4. Update OpenAPI/Swagger docs

VALIDATION:
- All endpoints respond correctly
- API documentation updated
- Postman collection updated
```

#### Day 5: Integration Testing
```bash
TASK: "End-to-end validation of genericization"

TESTS:
1. Register generic item via API
2. Search items (no forensic terms)
3. View item in 3D visualization
4. Update item location via RFID simulator
5. View item history

VALIDATION:
- All E2E tests pass
- No forensic terms anywhere
- Demo works perfectly
```

---

## 📅 PHASE 1: MULTI-TENANT FOUNDATION (Weeks 4-6)

**Status:** 🟡 PENDING (After Phase 0)
**Goal:** Implement schema-per-tenant architecture
**Approach:** ⏩ SEQUENTIAL (complex, affects everything)

### Week 4: Multi-Tenant Database Schema

**AI Agent:** `database-optimizer`

#### Tasks:
1. Create `tenants` master table
2. Create `tenant_users` table
3. Implement dynamic schema creation per tenant
4. Create tenant provisioning script
5. Update all repositories for tenant awareness
6. Add tenant_id to ALL queries

**Validation:**
- Create 3 test tenants
- Verify complete data isolation
- Cross-tenant query test (should fail)
- Performance test (no degradation)

---

### Week 5: Multi-Tenant API & Middleware

**AI Agent:** `backend-developer`

#### Tasks:
1. JWT middleware (extract tenant_id)
2. Tenant context middleware
3. Rate limiting per tenant
4. Cache namespacing (tenant:acme:item:123)
5. WebSocket rooms per tenant
6. Update all controllers

**Validation:**
- JWT with tenant_id works
- Queries scoped to tenant
- Cache isolated per tenant
- WebSocket rooms work
- Rate limits per tenant
```

---

### Week 6: Multi-Tenant Frontend

**AI Agent:** `frontend-developer`

#### Tasks:
1. Tenant branding (logo, colors)
2. Tenant feature toggles
3. Tenant-specific configuration
4. Custom field rendering
5. Tenant selection (for admins)

**Validation:**
- Different branding per tenant
- Features toggle correctly
- Custom fields render
- Tenant switching works
```

---

## 📅 PHASE 2: FEATURE DEVELOPMENT (Weeks 7-10) - PARALLEL

**Status:** 🟢 READY (After Phase 0-1 complete)
**Goal:** Build new features in parallel
**Approach:** 🔀 PARALLEL (4 agents working simultaneously)

### Agent 1: Spatial Intelligence (A* Pathfinding)

**AI Agent:** `backend-developer`
**Duration:** 4 weeks

#### Week 7: Graph Database Setup
- Model facility as graph (zones = nodes)
- Store connections and distances
- Create zone layout editor API

#### Week 8: A* Algorithm Implementation
- Implement A* pathfinding (~200 lines)
- Calculate optimal routes
- Return 3D coordinates for visualization

#### Week 9: Route Optimization
- Multi-item pickup optimization
- Dynamic obstacle handling
- Real-time route updates

#### Week 10: 3D Path Visualization
- Animated glowing path in Three.js
- Distance markers
- Time estimates
- Mobile turn-by-turn guidance

**Deliverable:** GET /api/v1/route?from=zone1&to=zone5&items=item1,item2

---

### Agent 2: Analytics & Reporting

**AI Agent:** `data-analyst`
**Duration:** 4 weeks

#### Week 7: Analytics Data Collection
- TimescaleDB continuous aggregates
- Zone occupancy over time
- Item movement patterns
- Reader performance metrics

#### Week 8: Analytics API
- GET /api/v1/analytics/zones/occupancy
- GET /api/v1/analytics/items/movements
- GET /api/v1/analytics/readers/performance
- GET /api/v1/analytics/trends

#### Week 9: Charts & Dashboards
- Recharts integration
- Real-time dashboards
- Historical trends
- Heatmap visualizations

#### Week 10: Export & Reports
- PDF report generation
- CSV exports
- Scheduled reports
- Email notifications

**Deliverable:** Complete analytics system (API + UI)

---

### Agent 3: Advanced 3D Features

**AI Agent:** `react-specialist`
**Duration:** 4 weeks

#### Week 7: GSAP Camera Animations
- Fly-to search results
- Zone tour sequences
- Item tracking (follow mode)
- Smooth transitions

#### Week 8: Level-of-Detail (LOD)
- Distance-based geometry simplification
- Label visibility management
- Performance optimization
- 60 FPS target validation

#### Week 9: Heat Maps & Overlays
- Real-time heat maps
- Capacity warnings
- Custom overlays
- Interactive tooltips

#### Week 10: Mobile Optimization
- Touch controls
- Lower poly models
- Adaptive quality
- Battery optimization

**Deliverable:** Production-ready 3D visualization

---

### Agent 4: Testing & Documentation

**AI Agent:** `test-automator`
**Duration:** 4 weeks (ongoing)

#### Week 7-10: Continuous Testing
- Unit tests for new features
- Integration tests
- E2E test scenarios
- Performance tests
- Security tests
- Documentation updates

**Deliverable:** 80%+ test coverage across entire codebase

---

## 📅 PHASE 3: INTEGRATION & POLISH (Weeks 11-12)

**Status:** 🔵 FUTURE (After Phase 2)
**Goal:** Integrate all features, fix bugs, polish UX
**Approach:** 🔀 Integration Agent + Polish Agents

### Week 11: Integration

**AI Agent:** `platform-engineer`

#### Tasks:
1. Merge all feature branches
2. Resolve conflicts
3. Integration testing
4. Performance optimization
5. Bug fixes
6. Cross-feature validation

**Validation:**
- All features work together
- No performance degradation
- No breaking changes
- E2E tests pass

---

### Week 12: Production Readiness

**AI Agent:** `devops-engineer`

#### Tasks:
1. Security audit
2. Load testing (100+ concurrent users)
3. Stress testing (300K items)
4. Database backup automation
5. Monitoring dashboards (Grafana)
6. Deployment documentation
7. Runbooks for operations

**Validation:**
- Security audit passed
- Load tests passed
- Backups automated
- Monitoring operational
- Documentation complete

---

## 🎯 AGENT COORDINATION STRATEGY

### Option 1: Conservative (RECOMMENDED for you)

```
PHASE 0 (Weeks 1-3):   1 Agent (Sequential)
PHASE 1 (Weeks 4-6):   1 Agent (Sequential)
PHASE 2 (Weeks 7-10):  4 Agents (Parallel)
PHASE 3 (Weeks 11-12): 2 Agents (Integration + Polish)

Total: 12 weeks
Risk: LOW (foundation solid before parallelization)
```

### Option 2: Aggressive (If experienced with AI agents)

```
PHASE 0 (Weeks 1-2):   2 Agents (Backend + Frontend parallel)
PHASE 1 (Weeks 3-4):   2 Agents (Database + API parallel)
PHASE 2 (Weeks 5-8):   4 Agents (All features parallel)
PHASE 3 (Weeks 9-10):  2 Agents (Integration + Polish)

Total: 10 weeks
Risk: MEDIUM (more merge conflicts, coordination overhead)
```

---

## 📋 WEEKLY COORDINATION MEETINGS

### Friday Standup (End of Week)

**Participants:** All active AI agents + Human developer

**Agenda:**
1. **Progress Review** (15 min)
   - What was completed?
   - What tests were written?
   - Any blockers?

2. **Validation** (15 min)
   - Run AI_AGENT_CONTROL_GUIDE.md checklist
   - Architecture review
   - Performance metrics
   - Test coverage report

3. **Next Week Planning** (10 min)
   - Assign new tasks
   - Identify dependencies
   - Set priorities

4. **Risk Assessment** (10 min)
   - Technical debt identified?
   - Performance concerns?
   - Scope creep?

---

## 🚀 HOW TO START RIGHT NOW

### Step 1: Prepare Control Documents (DONE ✅)
- ✅ AI_AGENT_CONTROL_GUIDE.md created
- ✅ IMPLEMENTATION_ROADMAP.md created (this file)
- ✅ StartHere.md exists (master vision)

### Step 2: Backup Current Code
```bash
cd /Users/user/Docket-Tracking-
git checkout -b backup-forensic-version
git add .
git commit -m "Backup: Forensic-specific version before genericization"
git push origin backup-forensic-version
```

### Step 3: Create Feature Branch
```bash
git checkout main
git checkout -b feature/phase-0-genericization
```

### Step 4: Launch First AI Agent (Phase 0, Week 1, Day 1)
```bash
AI Agent: typescript-pro
Prompt:
"""
I need you to genericize the backend domain layer for a multi-tenant inventory SaaS platform.

CRITICAL DOCUMENTS (READ FIRST):
1. /Users/user/Docket-Tracking-/AI_AGENT_CONTROL_GUIDE.md
2. /Users/user/Docket-Tracking-/IMPLEMENTATION_ROADMAP.md
3. /Users/user/Docket-Tracking-/StartHere.md

CURRENT TASK: Phase 0, Week 1, Day 1-2
Rename all domain entities from forensic-specific to generic inventory terms.

SPECIFIC CHANGES:
1. Rename Docket.entity.ts → Item.entity.ts
2. Rename DocketRepository interface → ItemRepository
3. Update all references in domain layer
4. Rename lab_number → item_number
5. Rename case_reference → reference_id

CONSTRAINTS:
- ✅ Generic naming only (no forensic terms)
- ✅ Update all related files
- ✅ Maintain all business logic
- ✅ Update tests to match new names
- ✅ Ensure all tests pass after changes
- ❌ Do NOT change infrastructure layer yet (next week)
- ❌ Do NOT modify database schema yet (next week)

VALIDATION BEFORE COMPLETION:
- Run: grep -r "Docket" src/domain/ (should return 0 results)
- Run: npm test (all tests pass)
- Run: npm run build (builds successfully)

EXPECTED OUTPUT:
- All domain entities renamed
- All domain tests updated and passing
- No forensic terminology in domain layer
- Documentation updated
"""
```

### Step 5: Validate Agent Output
```bash
# After agent completes
grep -r "Docket" src/domain/              # Should be 0 results
grep -r "docket" src/domain/              # Should be 0 results
npm test                                   # Should pass
npm run build                             # Should succeed

# If validation passes:
git add .
git commit -m "Phase 0 Week 1 Day 1-2: Genericize domain entities"
git push origin feature/phase-0-genericization
```

### Step 6: Repeat for Each Task
- Launch agent with specific task
- Agent implements + writes tests
- Validate using checklist
- Commit if passing
- Move to next task

### Step 7: Weekly Integration
- Merge feature branch to main
- Run full test suite
- Deploy to dev environment
- Validate with demo

---

## 📊 SUCCESS METRICS TRACKING

### Phase 0 Completion Criteria
```
□ 0 forensic terms in codebase (grep check)
□ All tests passing (80%+ coverage)
□ Demo mode works with generic items
□ Database schema updated
□ API endpoints renamed
□ Frontend components updated
□ Performance maintained (<300ms search)
□ Documentation updated
```

### Phase 1 Completion Criteria
```
□ Tenant management working
□ Schema-per-tenant implemented
□ JWT auth with tenant_id
□ Complete data isolation verified
□ Tenant provisioning script working
□ Multi-tenant tests passing
□ Performance maintained (100+ users)
```

### Phase 2 Completion Criteria
```
□ All 4 feature streams complete
□ 80%+ test coverage achieved
□ Performance targets met
□ Features integrated
□ Documentation complete
□ Demo updated with new features
```

### Phase 3 Completion Criteria
```
□ Integration complete
□ Production deployment tested
□ Security audit passed
□ Load tests passed (300K items, 100+ users)
□ Monitoring operational
□ Backup automation working
□ Runbooks complete
```

---

## 🎓 TIPS FOR AI AGENT SUCCESS

### 1. Start Small
- Don't try to do everything at once
- Complete one task fully before moving on
- Validate at each step

### 2. Use Control Document
- Every agent should read AI_AGENT_CONTROL_GUIDE.md first
- Reference it in every prompt
- Validate against checklist before finishing

### 3. Test Continuously
- Write tests alongside code (not after)
- Run tests after every change
- Don't proceed if tests fail

### 4. Commit Often
- Small, focused commits
- Clear commit messages
- Easy to revert if needed

### 5. Review Before Merge
- Run architecture validation
- Check performance metrics
- Verify no forensic terms
- Confirm multi-tenant support

---

## 🆘 TROUBLESHOOTING

### Agent Keeps Using Forensic Terms
**Solution:** Add this to prompt:
```
CRITICAL: Replace these terms IMMEDIATELY if used:
- Docket → Item
- lab_number → item_number
- case_reference → reference_id
- forensic → inventory
- evidence → asset

VALIDATION: Grep check before responding.
```

### Agent Ignoring Architecture Rules
**Solution:**
1. Reference AI_AGENT_CONTROL_GUIDE.md explicitly
2. Use architecture-reviewer agent to check
3. Reject output if violations found
4. Re-prompt with specific violations

### Tests Failing After Changes
**Solution:**
1. Don't proceed to next task
2. Fix failing tests first
3. Use test-automator agent if needed
4. Verify coverage still 80%+

### Performance Regression
**Solution:**
1. Run performance benchmarks
2. Profile slow queries/rendering
3. Optimize before proceeding
4. Document optimization approach

---

## 📞 NEED HELP?

### Contact Points
- **Architecture Questions:** Reference StartHere.md sections
- **Agent Control Issues:** Check AI_AGENT_CONTROL_GUIDE.md
- **Implementation Strategy:** This roadmap
- **Stuck on Task:** Break down into smaller subtasks

### Emergency Escalation
If fundamentally blocked:
1. Document the blocker clearly
2. Explain what was attempted
3. Ask specific question
4. Wait for human guidance
5. Do NOT proceed with workaround

---

## 🎯 YOU ARE HERE

```
✅ Control documents created
✅ Codebase explored and understood
🔴 Phase 0 Week 1 Day 1 ← START HERE
□ Phase 0 Week 1 Day 2
□ Phase 0 Week 1 Day 3
...
□ Phase 3 Week 12 Day 5 (FINISH)
```

**Next Action:** Launch typescript-pro agent with Phase 0 Week 1 Day 1 task.

---

**Good luck! You've got a solid plan. Stick to it, validate at each step, and you'll have a production-ready generic inventory SaaS platform in 12 weeks.** 🚀
