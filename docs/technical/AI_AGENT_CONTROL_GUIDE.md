# 🤖 AI AGENT IMPLEMENTATION CONTROL GUIDE

**Project:** Generic RFID Inventory Tracking Platform (Multi-Tenant SaaS)
**Purpose:** Ensure AI agents follow architecture, avoid scope creep, and maintain consistency
**Reference:** StartHere.md (Master Vision Document)

---

## 🚨 CRITICAL RULES - AI AGENTS MUST FOLLOW

### 1. GENERIC INVENTORY ONLY - NO DOMAIN-SPECIFIC CODE

❌ **FORBIDDEN TERMS** (Remove/Replace):
- `Docket`, `DocketRepository`, `DocketService`, `forensic`, `evidence`, `case_reference`, `lab_number`, `FSL-PAROW`

✅ **REQUIRED TERMS** (Use Instead):
- `Item`, `ItemRepository`, `ItemService`, `inventory`, `asset`, `reference_id`, `item_number`, `facility`

**RULE:** Code must work for ANY industry: warehouses, manufacturing, healthcare, retail, forensics.

---

### 2. ARCHITECTURE ENFORCEMENT

#### Domain Layer (Pure Business Logic)
```
✅ ALLOWED:
- Entity classes (Item, Zone, Reader, Location)
- Value objects (ItemId, RfidEpc, LocationCoordinates)
- Domain events (ItemMoved, ItemRegistered, ZoneOccupancyChanged)
- Domain services (LocationConfidenceCalculator, ZoneAssignmentService)
- Repository interfaces (IItemRepository, IZoneRepository)

❌ FORBIDDEN:
- External library imports (axios, express, socket.io, etc.)
- Database queries (direct SQL, ORM calls)
- HTTP calls, API clients
- File I/O operations
- Console.log (use ILogger interface)
```

#### Application Layer (Use Cases)
```
✅ ALLOWED:
- Use case orchestration
- DTO mapping
- Interface dependencies (IItemRepository, ILogger, IEventBus)
- Business validation
- Error handling with Result types

❌ FORBIDDEN:
- Direct database access
- HTTP request handling
- WebSocket implementation
- External API calls
```

#### Infrastructure Layer (External Integrations)
```
✅ ALLOWED:
- Database repository implementations
- RFID gateway (LLRP protocol)
- Event bus implementations
- Logger implementations
- Metrics implementations

❌ FORBIDDEN:
- Business logic (belongs in domain/application)
- Direct entity manipulation without repository
```

#### Presentation Layer (API)
```
✅ ALLOWED:
- HTTP controllers
- Route definitions
- Request/response DTOs
- Validation schemas (Zod)
- WebSocket event handlers

❌ FORBIDDEN:
- Business logic (call use cases instead)
- Direct database queries
- Direct RFID reader access
```

---

### 3. MULTI-TENANT REQUIREMENTS

**EVERY database query, cache key, and API endpoint MUST be tenant-aware.**

#### Database Queries
```typescript
❌ WRONG:
SELECT * FROM items WHERE id = $1

✅ CORRECT:
SELECT * FROM tenant_acme.items WHERE id = $1 AND tenant_id = $2
```

#### Cache Keys
```typescript
❌ WRONG:
redis.get(`item:${itemId}`)

✅ CORRECT:
redis.get(`tenant:${tenantId}:item:${itemId}`)
```

#### API Routes
```typescript
❌ WRONG:
router.get('/items/:id', getItem)

✅ CORRECT:
router.get('/items/:id', authenticateJWT, extractTenant, getItem)
// Controller receives tenantId from request context
```

---

### 4. NAMING CONVENTIONS

#### Files & Directories
```
✅ CORRECT:
- Item.entity.ts (not Docket.entity.ts)
- ItemRepository.ts (not DocketRepository.ts)
- RegisterItemUseCase.ts (not RegisterDocketUseCase.ts)
- item.routes.ts (not docket.routes.ts)

❌ WRONG:
- Any file with "docket", "forensic", "evidence", "case" in name
```

#### Database Tables
```sql
✅ CORRECT:
CREATE TABLE tenant_acme.items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    item_number VARCHAR(50) NOT NULL,
    rfid_epc VARCHAR(50) UNIQUE NOT NULL,
    reference_id VARCHAR(100),
    ...
)

❌ WRONG:
CREATE TABLE dockets (lab_number, case_reference, ...)
```

#### API Endpoints
```
✅ CORRECT:
POST   /api/v1/items
GET    /api/v1/items?search=xxx
GET    /api/v1/items/:id
GET    /api/v1/items/:id/history
GET    /api/v1/zones
GET    /api/v1/zones/:id/items

❌ WRONG:
/api/v1/dockets, /api/v1/forensic/...
```

---

### 5. PERFORMANCE TARGETS (NON-NEGOTIABLE)

```
Search:        <300ms response time across 300K items
3D Rendering:  60 FPS sustained with 500 visible objects
DB Queries:    <100ms complex, <10ms simple
Memory:        <1GB frontend, <2GB backend
Concurrent:    100+ users without degradation
RFID Pipeline: <1s end-to-end latency (reader → frontend)
```

**AI Agent Validation:** After each implementation, run performance tests.

---

### 6. TESTING REQUIREMENTS

**Minimum 80% test coverage for ALL code.**

#### Test Structure
```
tests/
├── unit/              # Test domain entities, value objects, services
├── integration/       # Test use cases with real dependencies
├── e2e/              # Test complete user flows
└── performance/      # Load tests, stress tests
```

#### Required Tests Per Component
```
Domain Entity:     ✅ 100% coverage (pure logic, easy to test)
Value Object:      ✅ 100% coverage (validation rules)
Use Case:          ✅ 90%+ coverage (critical business logic)
Repository:        ✅ 80%+ coverage (integration tests)
Controller:        ✅ 70%+ coverage (e2e tests)
```

**AI Agent Rule:** Write tests BEFORE or ALONGSIDE implementation (TDD encouraged).

---

### 7. LICENSE COMPLIANCE

**ONLY use SaaS-safe open source licenses.**

#### ✅ APPROVED Licenses
- MIT
- Apache 2.0
- BSD-3-Clause
- PostgreSQL License

#### ❌ FORBIDDEN Licenses
- GPL (any version)
- AGPL
- SSPL (e.g., Elasticsearch ≥7.11, Redis ≥7.4)
- Proprietary source-available

**AI Agent Rule:** Check license BEFORE adding any npm package.

---

### 8. VIRTUALIZATION & ON-DEMAND ARCHITECTURE

**NEVER load all 300K items into memory.**

#### Frontend State Management
```typescript
❌ WRONG:
const [allItems, setAllItems] = useState<Item[]>([]) // 300K items!

✅ CORRECT:
const [visibleItems, setVisibleItems] = useState<Item[]>([]) // Max 500
const [searchResults, setSearchResults] = useState<Item[]>([]) // Max 100
```

#### Backend API Responses
```typescript
❌ WRONG:
return items // Returning all 300K items

✅ CORRECT:
return {
  data: items.slice(0, 50),
  pagination: { page: 1, pageSize: 50, total: 300000 }
}
```

#### 3D Rendering
```typescript
✅ CORRECT:
- Instanced rendering (GPU-efficient)
- Frustum culling (only render visible)
- Level-of-detail (LOD) system
- Octree spatial indexing
- Max 500 objects visible at once
```

---

## 📋 IMPLEMENTATION CHECKPOINTS

### Before Starting ANY Phase

**AI Agent Checklist:**
```
□ Read this AI_AGENT_CONTROL_GUIDE.md
□ Read StartHere.md (architecture reference)
□ Understand current phase goals
□ Confirm no forensic-specific terms in output
□ Verify multi-tenant requirements
□ Check licensing for new dependencies
□ Plan test coverage strategy
```

---

### After Completing ANY Feature

**AI Agent Validation:**
```
□ Generic naming (no "docket", "forensic", etc.)
□ Multi-tenant support (tenant_id in all queries)
□ Clean architecture layers respected
□ Tests written (80%+ coverage)
□ Performance targets met
□ License compliance verified
□ No console.log (use ILogger)
□ Error handling with Result types (neverthrow)
□ Documentation updated
```

---

### Phase Completion Checklist

**Before Moving to Next Phase:**
```
□ All features tested (unit + integration)
□ Performance benchmarks passed
□ Code review completed
□ Database migrations tested
□ API endpoints documented
□ WebSocket events documented
□ No breaking changes to existing code
□ Backward compatibility maintained
```

---

## 🎯 GENERICIZATION STRATEGY

### Phase 0: Foundation Cleanup (MUST DO FIRST)

**Goal:** Remove ALL forensic-specific code and make it generic inventory.

#### Step 1: Rename Domain Entities (1-2 days)
```bash
# Backend
Docket → Item
DocketRepository → ItemRepository
DocketService → ItemService
lab_number → item_number
case_reference → reference_id

# Database
dockets table → items table
lab_number column → item_number column
case_reference column → reference_id column

# Frontend
DocketSearchPanel → ItemSearchPanel
DocketDetailModal → ItemDetailModal
mockDockets → mockItems
```

#### Step 2: Update Database Schema (1 day)
```sql
-- OLD (Forensic-Specific)
CREATE TABLE dockets (
    lab_number VARCHAR(50),
    case_reference VARCHAR(100),
    ...
)

-- NEW (Generic)
CREATE TABLE tenant_{slug}.items (
    item_number VARCHAR(50),
    reference_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',  -- Industry-specific fields go here
    ...
)
```

#### Step 3: Genericize UI Components (2-3 days)
```typescript
// OLD
<DocketSearchPanel placeholder="Search dockets..." />

// NEW
<ItemSearchPanel
  placeholder="Search items..."
  customFields={tenant.customFields}  // Tenant-specific UI
/>
```

#### Step 4: Multi-Tenant Foundation (3-4 days)
```typescript
// Add tenant awareness to ALL layers
1. Middleware: Extract tenant_id from JWT
2. Repositories: Filter by tenant_id
3. Cache: Namespace by tenant (tenant:acme:item:123)
4. WebSocket: Room-based (tenant:{id}:zone:{id})
5. Database: Schema-per-tenant (tenant_acme.items)
```

**AI Agent Task:** Complete Phase 0 before ANY new features.

---

## 🔄 PARALLEL vs SEQUENTIAL STRATEGY

### Recommended Approach: HYBRID

#### Phase 0 (Foundation): SEQUENTIAL ⏩
```
Week 1: Domain Entity Rename (1 agent)
Week 2: Database Schema Update (1 agent)
Week 3: UI Genericization (1 agent)
Week 4: Multi-Tenant Foundation (1 agent)
```
**Reason:** These changes affect everything. Must be done sequentially.

#### Phase 1-3 (Features): PARALLEL 🔀
```
Agent 1: Frontend 3D Visualization
Agent 2: Backend API Implementation
Agent 3: RFID Gateway Development
Agent 4: Testing & Documentation

Integration Agent: Merge work weekly
```
**Reason:** Once foundation is generic, features are independent.

---

## 📐 AI AGENT COORDINATION

### Agent Types & Responsibilities

#### 1. Architecture Agent (Always Active)
**Role:** Enforce clean architecture, review all code
**Tools:** Read, Grep, Glob (no write permissions)
**Triggers:** Review after each feature merge
**Output:** Approval or required changes

#### 2. Feature Agents (Parallel)
**Role:** Implement specific features (frontend, backend, RFID, etc.)
**Tools:** Full access (Read, Write, Edit, Bash)
**Constraints:** Must follow this guide
**Output:** Working feature + tests

#### 3. Integration Agent (Weekly)
**Role:** Merge feature branches, resolve conflicts, run E2E tests
**Tools:** Full access + git
**Triggers:** End of each sprint
**Output:** Integrated, tested system

#### 4. Testing Agent (Parallel)
**Role:** Write tests for all features
**Tools:** Read, Write (test files only)
**Triggers:** After feature implementation
**Output:** 80%+ coverage achieved

---

## 🛡️ ANTI-PATTERNS TO AVOID

### 1. Tight Coupling
```typescript
❌ WRONG:
class ItemService {
  constructor() {
    this.db = new PostgresClient() // Direct dependency!
  }
}

✅ CORRECT:
class ItemService {
  constructor(private itemRepo: IItemRepository) {} // Interface!
}
```

### 2. Business Logic in Controllers
```typescript
❌ WRONG:
async function registerItem(req, res) {
  // Business logic here (validation, calculation, etc.)
  await db.query('INSERT INTO items...')
}

✅ CORRECT:
async function registerItem(req, res) {
  const result = await registerItemUseCase.execute(req.body)
  // Use case handles ALL business logic
}
```

### 3. God Objects
```typescript
❌ WRONG:
class ItemManager {
  register() {}
  update() {}
  delete() {}
  search() {}
  export() {}
  import() {}
  // ... 20 more methods
}

✅ CORRECT:
class RegisterItemUseCase { execute() {} }
class UpdateItemUseCase { execute() {} }
class SearchItemsUseCase { execute() {} }
// One class = one responsibility
```

### 4. Hardcoded Values
```typescript
❌ WRONG:
const MAX_ITEMS = 670 // Forensic-specific limit!

✅ CORRECT:
const MAX_VISIBLE_ITEMS = config.get('display.maxVisibleItems', 500)
```

---

## 📝 AI AGENT PROMPT TEMPLATE

**Use this template for EVERY agent task:**

```
I am implementing [FEATURE NAME] for a generic RFID inventory tracking SaaS platform.

CRITICAL CONSTRAINTS:
1. ✅ MUST use generic terms (Item, not Docket)
2. ✅ MUST support multi-tenancy (tenant_id everywhere)
3. ✅ MUST follow clean architecture (see AI_AGENT_CONTROL_GUIDE.md)
4. ✅ MUST achieve 80%+ test coverage
5. ✅ MUST meet performance targets (see guide)
6. ✅ MUST use SaaS-safe licenses only
7. ❌ NEVER use forensic-specific terms
8. ❌ NEVER couple layers (use interfaces)
9. ❌ NEVER load all 300K items (virtualize)

ARCHITECTURE REFERENCE:
- Read: /Users/user/Docket-Tracking-/AI_AGENT_CONTROL_GUIDE.md
- Read: /Users/user/Docket-Tracking-/StartHere.md

PREVIOUS WORK:
[List completed phases]

CURRENT TASK:
[Describe specific task]

EXPECTED OUTPUT:
- Generic code (no forensic terms)
- Multi-tenant aware
- Tests included (80%+ coverage)
- Documentation updated
- Performance validated

VALIDATION:
Before finishing, run checkpoint from AI_AGENT_CONTROL_GUIDE.md section [X].
```

---

## 🎯 SUCCESS METRICS

### Code Quality Metrics
```
✅ Test Coverage:        ≥80%
✅ Cyclomatic Complexity: ≤10 per function
✅ Lines per File:       ≤300 (except generated code)
✅ Function Length:      ≤50 lines
✅ Coupling:             Low (interfaces between layers)
✅ Cohesion:             High (single responsibility)
```

### Performance Metrics
```
✅ API Response:         <300ms (p95)
✅ Database Query:       <100ms (complex), <10ms (simple)
✅ 3D Frame Rate:        60 FPS sustained
✅ Memory Usage:         <1GB frontend, <2GB backend
✅ WebSocket Latency:    <100ms
✅ RFID Pipeline:        <1s end-to-end
```

### Architecture Metrics
```
✅ Dependency Direction: All point inward (to domain)
✅ Layer Isolation:      No cross-layer imports
✅ Interface Usage:      100% (no concrete dependencies)
✅ Domain Purity:        0 external dependencies
```

---

## 🚀 QUICK START FOR NEW AI AGENT

```bash
# 1. Read Control Documents
Read /Users/user/Docket-Tracking-/AI_AGENT_CONTROL_GUIDE.md (this file)
Read /Users/user/Docket-Tracking-/StartHere.md

# 2. Understand Current State
Grep "Docket" -r src/  # Find forensic-specific code
Grep "tenant_id" -r src/  # Check multi-tenant coverage

# 3. Identify Task Scope
# From sprint board or task assignment

# 4. Validate Before Starting
□ Task is generic (not forensic-specific)
□ Multi-tenant requirements clear
□ Architecture layer identified
□ Test strategy planned
□ Performance target known

# 5. Implement with Checkpoints
# Write code → Write tests → Run validation → Document

# 6. Final Validation
# Run all checkpoints from this guide
# Request architecture agent review
```

---

## 📚 REFERENCE DOCUMENTS

1. **StartHere.md** - Master vision and technical architecture
2. **AI_AGENT_CONTROL_GUIDE.md** - This document (enforcement rules)
3. **README.md** - Project setup and getting started
4. **Database Schema** - `saps-rfid-platform/scripts/migrations/*.sql`
5. **API Documentation** - `saps-rfid-platform/README.md` (endpoints)

---

## ⚠️ ESCALATION PROTOCOL

### When to Ask Human Developer

**AI Agent MUST stop and ask human if:**
1. ❌ Architecture rule seems incorrect for use case
2. ❌ Performance target cannot be met with current approach
3. ❌ Breaking change required (affects existing features)
4. ❌ Security concern identified
5. ❌ License compliance issue with required library
6. ❌ Conflict between this guide and StartHere.md
7. ❌ Multi-tenant implementation strategy unclear
8. ❌ Test coverage cannot reach 80% (explain why)

**Do NOT proceed with "good enough" - escalate and wait.**

---

## 🎓 AI AGENT LEARNING

### Common Mistakes & Solutions

#### Mistake 1: Using Forensic Terms
```typescript
❌ class DocketService {}
✅ class ItemService {}
```

#### Mistake 2: Missing Tenant Isolation
```typescript
❌ SELECT * FROM items WHERE id = $1
✅ SELECT * FROM tenant_acme.items WHERE id = $1 AND tenant_id = $2
```

#### Mistake 3: Tight Coupling
```typescript
❌ import { PostgresClient } from './infrastructure/database'
✅ import { IItemRepository } from './domain/repositories'
```

#### Mistake 4: Loading All Data
```typescript
❌ const items = await itemRepo.findAll() // 300K items!
✅ const items = await itemRepo.findPaginated(page, 50)
```

#### Mistake 5: No Tests
```typescript
❌ Implement feature → Move on
✅ Implement feature → Write tests (80%+) → Move on
```

---

## 📊 PROGRESS TRACKING

### Weekly Report Template

```markdown
## Week [X] Progress Report

### Completed
- [x] Feature A (100% complete, 85% test coverage)
- [x] Feature B (100% complete, 90% test coverage)

### In Progress
- [ ] Feature C (70% complete, 60% test coverage)

### Blocked
- [ ] Feature D - Waiting on [dependency/decision]

### Validation
- ✅ No forensic terms used
- ✅ Multi-tenant support verified
- ✅ Clean architecture maintained
- ✅ Performance targets met
- ✅ License compliance checked

### Metrics
- Test Coverage: 82% (target: 80%)
- API Response Time: 245ms p95 (target: <300ms)
- Code Review: Passed ✅

### Next Week Goals
- Complete Feature C
- Unblock Feature D
- Begin Feature E
```

---

## 🏁 FINAL CHECKLIST (Before Phase Complete)

```
□ All forensic terms removed (grep check)
□ Multi-tenant support (100% coverage)
□ Clean architecture (layer dependencies correct)
□ Test coverage ≥80%
□ Performance targets met
□ License compliance verified
□ Documentation updated
□ Database migrations tested
□ API endpoints documented
□ WebSocket events documented
□ Code review passed
□ Integration tests passed
□ E2E tests passed
□ Demo script updated
□ Deployment tested (dev environment)

SIGN-OFF:
- AI Agent: [Name/ID]
- Architecture Review: ✅/❌
- Human Approval: ✅/❌
```

---

## 🎯 TL;DR FOR AI AGENTS

1. **Generic Only** - No "docket", "forensic", "evidence" terms
2. **Multi-Tenant Always** - tenant_id in every query/cache/endpoint
3. **Clean Architecture** - Respect layer boundaries, use interfaces
4. **Test Everything** - 80%+ coverage minimum
5. **Perform Well** - <300ms search, 60 FPS, <100ms queries
6. **License Safe** - MIT/Apache 2.0 only, no GPL/SSPL
7. **Virtualize** - Never load 300K items, max 500 visible
8. **Document** - Code + tests + API docs
9. **Validate** - Run checkpoints before finishing
10. **Escalate** - Ask human if uncertain

**When in doubt, refer to this guide. DO NOT improvise.**

---

**Version:** 1.0
**Last Updated:** 2025-01-12
**Maintained By:** Lead Developer
**Enforcement:** Architecture Agent + Code Reviews
