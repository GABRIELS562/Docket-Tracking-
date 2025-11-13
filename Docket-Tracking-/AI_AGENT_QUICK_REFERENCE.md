# 🤖 AI AGENT QUICK REFERENCE CARD

**Show this to EVERY AI agent before starting work**

---

## ✅ MANDATORY CHECKLIST (Before Coding)

```
□ Read AI_AGENT_CONTROL_GUIDE.md
□ Read current task from IMPLEMENTATION_ROADMAP.md
□ Understand architecture from StartHere.md
□ Identify which phase/week/day I'm working on
□ Confirm no forensic-specific terms will be used
□ Plan test coverage strategy (80%+ target)
□ Check license compatibility of any new libraries
```

---

## 🚫 FORBIDDEN TERMS - REPLACE IMMEDIATELY

| ❌ NEVER USE | ✅ USE INSTEAD |
|--------------|----------------|
| Docket | Item |
| DocketRepository | ItemRepository |
| lab_number | item_number |
| case_reference | reference_id |
| forensic | inventory |
| evidence | asset |
| FSL-PAROW | facility |
| SAPS | tenant name |

**Validation:** `grep -r "Docket\|docket\|forensic" src/` should return 0 results

---

## 🏗️ ARCHITECTURE LAYERS (Strict Boundaries)

### 1️⃣ DOMAIN LAYER (Pure Business Logic)
```
✅ CAN:
- Entities (Item, Zone, Reader)
- Value Objects (ItemId, RfidEpc)
- Domain Events (ItemMoved, ItemRegistered)
- Domain Services (LocationConfidenceCalculator)
- Repository Interfaces (IItemRepository)

❌ CANNOT:
- Import axios, express, socket.io
- Database queries
- HTTP calls
- File I/O
- console.log (use ILogger interface)
```

### 2️⃣ APPLICATION LAYER (Use Cases)
```
✅ CAN:
- Use case orchestration
- DTO mapping
- Interface dependencies (IItemRepository, ILogger)
- Result types (neverthrow)

❌ CANNOT:
- Direct database access
- HTTP request handling
- WebSocket implementation
```

### 3️⃣ INFRASTRUCTURE LAYER (External)
```
✅ CAN:
- Database implementations
- RFID gateway
- Logger implementations
- Event bus

❌ CANNOT:
- Business logic (belongs in domain/application)
```

### 4️⃣ PRESENTATION LAYER (API)
```
✅ CAN:
- Controllers
- Routes
- DTOs
- Validation (Zod)
- WebSocket handlers

❌ CANNOT:
- Business logic (call use cases instead)
- Direct database queries
```

---

## 🏢 MULTI-TENANT REQUIREMENTS

**EVERY query, cache key, and API must be tenant-aware:**

### Database
```typescript
❌ SELECT * FROM items WHERE id = $1
✅ SELECT * FROM tenant_acme.items WHERE id = $1 AND tenant_id = $2
```

### Cache
```typescript
❌ redis.get(`item:${itemId}`)
✅ redis.get(`tenant:${tenantId}:item:${itemId}`)
```

### API
```typescript
❌ router.get('/items/:id', getItem)
✅ router.get('/items/:id', authenticateJWT, extractTenant, getItem)
```

---

## 📏 NAMING CONVENTIONS

### Files
```
✅ Item.entity.ts
✅ ItemRepository.ts
✅ RegisterItemUseCase.ts
✅ item.routes.ts

❌ Docket.entity.ts
❌ DocketRepository.ts
❌ forensic.routes.ts
```

### Database
```sql
✅ tenant_acme.items
✅ item_number
✅ reference_id

❌ dockets
❌ lab_number
❌ case_reference
```

### API
```
✅ /api/v1/items
✅ /api/v1/items/:id
✅ /api/v1/zones

❌ /api/v1/dockets
❌ /api/v1/forensic/...
```

---

## ⚡ PERFORMANCE TARGETS (Non-Negotiable)

```
Search:         <300ms response
DB Query:       <100ms complex, <10ms simple
3D Rendering:   60 FPS sustained
Memory:         <1GB frontend, <2GB backend
Concurrent:     100+ users
RFID Pipeline:  <1s end-to-end
```

**Measure after implementation. If failed, optimize before proceeding.**

---

## 🧪 TESTING REQUIREMENTS

```
Minimum Coverage: 80%

Domain Entities:  100% (pure logic, easy)
Value Objects:    100% (validation)
Use Cases:        90%+ (critical logic)
Repositories:     80%+ (integration)
Controllers:      70%+ (e2e)
```

**Write tests BEFORE or ALONGSIDE code. Not after.**

---

## 📦 VIRTUALIZATION (Never Load All Data)

```typescript
❌ const items = await itemRepo.findAll() // 300K items!
✅ const items = await itemRepo.findPaginated(page, 50)

❌ const [allItems, setAllItems] = useState<Item[]>([])
✅ const [visibleItems, setVisibleItems] = useState<Item[]>([]) // Max 500

❌ return items // All 300K
✅ return { data: items.slice(0, 50), pagination: {...} }
```

---

## ⚖️ LICENSE COMPLIANCE

### ✅ SAFE
- MIT
- Apache 2.0
- BSD-3-Clause
- PostgreSQL License

### ❌ FORBIDDEN
- GPL (any version)
- AGPL
- SSPL
- Proprietary source-available

**Check before installing: `npm info <package> license`**

---

## 🚨 ANTI-PATTERNS TO AVOID

### Tight Coupling
```typescript
❌ this.db = new PostgresClient()
✅ constructor(private itemRepo: IItemRepository)
```

### Business Logic in Controllers
```typescript
❌ async function registerItem(req, res) {
     // validation, calculation, etc.
     await db.query(...)
   }
✅ async function registerItem(req, res) {
     const result = await registerItemUseCase.execute(req.body)
   }
```

### God Objects
```typescript
❌ class ItemManager { // 20+ methods }
✅ class RegisterItemUseCase { execute() }
   class UpdateItemUseCase { execute() }
   // One class = one responsibility
```

### Hardcoded Values
```typescript
❌ const MAX_ITEMS = 670
✅ const MAX_VISIBLE_ITEMS = config.get('display.maxVisibleItems', 500)
```

---

## ✅ VALIDATION CHECKLIST (After Coding)

```
□ Generic naming (no "docket", "forensic")
□ Multi-tenant support (tenant_id everywhere)
□ Clean architecture (layers respected)
□ Tests written (80%+ coverage)
□ Performance targets met
□ License compliance verified
□ No console.log (use ILogger)
□ Error handling with Result types
□ Documentation updated
□ Grep validation passed
```

---

## 🎯 QUICK VALIDATION COMMANDS

```bash
# Check for forbidden terms
grep -r "Docket\|docket\|forensic\|evidence" src/

# Run tests
npm test

# Check coverage
npm run test:coverage

# Performance benchmarks
npm run test:performance

# Build check
npm run build

# Lint
npm run lint
```

**Expected:** All commands succeed, grep returns 0 results.

---

## 🆘 WHEN TO ESCALATE TO HUMAN

Stop and ask if:
- ❌ Architecture rule seems wrong for use case
- ❌ Performance target cannot be met
- ❌ Breaking change required
- ❌ Security concern identified
- ❌ License compliance issue
- ❌ Conflict between guides
- ❌ Multi-tenant strategy unclear
- ❌ Test coverage impossible to reach 80%

**Do NOT improvise. Escalate and wait.**

---

## 📚 REFERENCE DOCUMENTS

1. **AI_AGENT_CONTROL_GUIDE.md** - Detailed rules and enforcement
2. **IMPLEMENTATION_ROADMAP.md** - Phase-by-phase plan
3. **StartHere.md** - Master vision and architecture
4. **README.md** - Project setup

---

## 🎓 COMMON MISTAKES

| Mistake | Solution |
|---------|----------|
| Using "Docket" | Replace with "Item" |
| Missing tenant_id | Add to ALL queries |
| Importing database directly | Use repository interface |
| Loading all 300K items | Paginate (max 50-500) |
| No tests | Write tests first/alongside |
| GPL license | Find MIT/Apache alternative |

---

## 💡 TL;DR FOR AI AGENTS

1. ✅ Generic Only (no forensic terms)
2. ✅ Multi-Tenant Always (tenant_id everywhere)
3. ✅ Clean Architecture (respect layers)
4. ✅ Test Everything (80%+ coverage)
5. ✅ Perform Well (<300ms, 60 FPS)
6. ✅ License Safe (MIT/Apache only)
7. ✅ Virtualize (max 500 visible)
8. ✅ Document (code + tests + API)
9. ✅ Validate (run checklist)
10. ✅ Escalate (ask if uncertain)

---

## 🚀 READY TO START?

```
1. Read AI_AGENT_CONTROL_GUIDE.md (full rules)
2. Find your task in IMPLEMENTATION_ROADMAP.md
3. Run "Before Coding" checklist above
4. Implement with tests
5. Run "After Coding" validation
6. Commit if all checks pass
7. Move to next task
```

---

**Print this card. Show it to every AI agent. Follow it strictly. Success guaranteed.** ✨

---

**Version:** 1.0
**Last Updated:** 2025-01-12
**Purpose:** Quick reference for AI agents
**Enforcement:** Show before EVERY task
