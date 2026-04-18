# Project Constitution — RFID Item Tracking System

> This document establishes non-negotiable principles for the RFID Item Tracking System. All code and contributions must align with these articles. Amendments require explicit team review.

---

## Article I — Stack & Architecture

### Locked Technology Versions

**Frontend (React Dashboard):**
| Package | Version | Notes |
|---------|---------|-------|
| React | 18.2.x | Core framework |
| TypeScript | 5.3.x | Strict mode enabled |
| Vite | 5.1.x | Build tool |
| React Three Fiber | 8.15.x | 3D visualization |
| TanStack Query | 5.17.x | Server state |
| Zustand | 4.5.x | Client state |
| Tailwind CSS | 3.4.x | Styling |
| Socket.io Client | 4.6.x | Real-time |

**Backend (saps-rfid-platform/):**
| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x LTS | Runtime |
| TypeScript | 5.4.x | Strict mode enabled |
| Express | 4.18.x | HTTP framework |
| PostgreSQL | 15 | With TimescaleDB 2.13.x |
| Redis | 7.x | Caching and pub/sub |
| tsyringe | 4.8.x | Dependency injection |
| neverthrow | 6.1.x | Result-based errors |
| Zod | 3.22.x | Runtime validation |
| Winston | 3.13.x | Structured logging |
| Socket.io | 4.6.x | WebSocket |

### Tier Separation

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Frontend         │  React SPA (src/, package.json) │
├─────────────────────────────────────────────────────────────┤
│  TIER 2: Backend API      │  Express (saps-rfid-platform/)  │
├─────────────────────────────────────────────────────────────┤
│  TIER 3: Reader Gateway   │  LLRP Module (infrastructure/   │
│                           │  rfid/)                         │
├─────────────────────────────────────────────────────────────┤
│  TIER 4: Data Store       │  TimescaleDB + Redis            │
└─────────────────────────────────────────────────────────────┘
```

### Rules

1. **Reader communication logic MUST be isolated** in `saps-rfid-platform/src/infrastructure/rfid/`. Business logic layers MUST NOT call RFID modules directly — only through application use cases.

2. **Raw tag reads and processed tracking events are separate domain concepts.** Raw reads are infrastructure concerns; tracking events are domain events.

3. **No new major dependencies** without updating this constitution. All dependencies must be MIT, Apache 2.0, or BSD-3-Clause licensed. GPL/AGPL/SSPL are forbidden.

---

## Article II — Hardware Integration (RFID-Specific)

### Reader Connections

1. **Resilient connections with automatic reconnect.** Implemented via `CircuitBreaker.ts` with exponential backoff (5s → 10s → 20s → 40s → 80s max).

2. **Every tag read MUST be timestamped at ingestion using server UTC time**, not reader time. Reader clocks are not trusted.

3. **Reader health MUST be monitored continuously** via `ReaderHealthMonitor.ts`. Silent reader beyond configurable threshold (default: 30 seconds) MUST trigger alert.

4. **Duplicate reads MUST be debounced** within configurable window (default: 3000ms) via `TagDeduplicator.ts`.

5. **System MUST degrade gracefully** if a reader goes offline. Other readers continue operating; failed reader attempts reconnection.

6. **Reader protocols and message formats MUST be documented** in `specs/rfid/`. *(Directory to be created)*

---

## Article III — Data Integrity

1. **Tag reads are append-only.** Once written, tag read records MUST NOT be mutated. Updates create new records.

2. **Every tracked item MUST have an audit trail.** Location history preserved for compliance and chain-of-custody requirements.

3. **Database migrations MUST be versioned and reversible.** Located in `saps-rfid-platform/src/infrastructure/database/migrations/`. Every migration has up() and down().

4. **UTC at storage, localized at presentation only.** All timestamps stored as UTC. Timezone conversion happens in frontend/presentation layer only.

---

## Article IV — Code Quality

1. **ESLint + Prettier MUST pass before commit.** Enforced via pre-commit hooks (Husky + lint-staged).

2. **TypeScript strict mode is enabled** in both frontend (`tsconfig.json`) and backend (`saps-rfid-platform/tsconfig.json`). No `any` without explicit justification.

3. **No commented-out code** in main branch.

4. **No dead code** (unreachable or unused functions/variables).

5. **No TODO without linked issue.** Format: `// TODO(#123): description`

6. **React components MUST NOT exceed 200 lines.**

7. **Backend functions MUST NOT exceed 50 lines.**

---

## Article V — Testing

1. **80% minimum line coverage** on business logic (domain + application layers).

2. **React Testing Library for components.** No snapshot-only tests — test behavior, not markup.

3. **Backend requires unit + integration tests.**
   - Unit: `tests/unit/` — isolated, mocked dependencies
   - Integration: `tests/integration/` — real database, real services

4. **Reader integration tested with mock reader** via `RFIDSimulator.ts`. No tests require physical hardware.

5. **End-to-end tests MUST cover:** tag read → ingestion → database → dashboard update.

6. **Every bug fix gets a regression test.** No exceptions.

7. **No flaky tests tolerated.** Flaky test = quarantine immediately + fix within 24 hours or delete.

---

## Article VI — Security

1. **No secrets in code or Docker images.** Secrets via environment variables only. `.env` in `.gitignore`.

2. **Dependabot enabled** for npm, Docker, and GitHub Actions ecosystems.

3. **CodeQL SAST scan on every PR.** No merge with security findings.

4. **Trivy image scan before deploy.** Fail on CRITICAL and HIGH vulnerabilities.

5. **Authentication required on every API endpoint** except explicit public ones (health check, metrics).

6. **Reader-to-backend communication MUST be authenticated.** Readers identified by IP whitelist and/or API key.

7. **Input validation on all external boundaries** including reader input. Use Zod schemas for API validation.

---

## Article VII — Containerization & Deployment

1. **Multi-stage Dockerfiles.** Build stage separate from production stage. Production image minimal.

2. **Images pinned to specific versions.** Never `:latest` in production. Currently: `node:20-alpine`, `timescale/timescaledb:2.13.0-pg15`, `redis:7-alpine`.

3. **`docker-compose up` brings up full stack** with one command. No manual steps required.

4. **Health check endpoints wired into container HEALTHCHECK.** `/health` endpoint on backend (port 8080).

5. **Structured JSON logging to stdout/stderr.** Winston configured for JSON in production, pretty-print in development.

6. **Config via environment variables.** Reference: `saps-rfid-platform/.env.example`.

7. **Images published to `ghcr.io`** (GitHub Container Registry). Tagged with git SHA.

---

## Article VIII — Version Control & Review

1. **Main branch protected.** No direct pushes. Force push forbidden.

2. **All changes via PR** with at least one human reviewer.

3. **AI-generated code explicitly reviewed** before merge. Marked with `Co-Authored-By: Claude` in commit.

4. **Conventional Commits format required.**
   ```
   type(scope): description

   Types: feat, fix, docs, style, refactor, test, chore, ci
   ```

5. **Branch naming convention:**
   - Features: `feature/NNN-short-description`
   - Fixes: `fix/NNN-short-description`
   - Chores: `chore/short-description`

---

## Article IX — CI/CD

### PR Checks (All Must Pass)

| Check | Command | Failure Action |
|-------|---------|----------------|
| Lint | `npm run lint` | Block merge |
| Format | `npx prettier --check .` | Block merge |
| Type Check | `npm run typecheck` | Block merge |
| Unit Tests | `npm test -- --coverage` | Block merge |
| Integration Tests | `npm run test:integration` | Block merge |
| Security Audit | `npm audit --audit-level=high` | Block merge |
| CodeQL | GitHub CodeQL Action | Block merge |
| Docker Build | `docker build` | Block merge |
| Trivy Scan | Trivy (CRITICAL/HIGH) | Block merge |

### Deployment

1. **No merge without all checks green.**

2. **Deployment automated via GitHub Actions.** Push to main triggers deploy.

3. **Rollback capability within 5 minutes.** Previous image always available.

---

## Article X — Observability

### Logging

1. **Structured JSON logging via Winston.** *(Note: Prompt specified Pino, but Winston already implemented and working. Decision: Keep Winston.)*

2. **Every tag read logged with:**
   - Tag EPC
   - Reader ID
   - Timestamp (UTC)
   - Correlation ID
   - RSSI value
   - Antenna port

3. **Errors MUST include debug context:** stack trace, request ID, user context (if applicable).

### Metrics (via prom-client)

Required metrics:
- `rfid.tags.processed` — Reads per second per reader
- `rfid.readers.connected` — Reader uptime/connectivity
- `rfid.processing.duration_ms` — Ingestion latency (p50, p95, p99)
- `db.query.duration_ms` — Database write latency
- `http.request.duration_ms` — API response times

### Health Endpoints

- `/health` — Basic liveness check
- `/health/detailed` — Full dependency check (DB, Redis, readers)
- `/metrics` — Prometheus scrape endpoint

---

## Article XI — Documentation

1. **README.md with one-command local setup** via `docker-compose up`. Must work on fresh clone.

2. **Hardware setup guide** documenting:
   - Supported reader models
   - Network configuration (ports, firewall rules)
   - Physical placement recommendations
   - LLRP protocol settings

3. **Architecture diagram** showing data flow: tag → reader → gateway → API → database → dashboard.

4. **ADRs for major decisions** in `docs/adr/`. Format: context, decision, consequences.

5. **`specs/` is source of truth** for feature intent. Features require spec before implementation.

---

## Article XII — Delivery Standards

### Client Handoff Checklist

A complete delivery includes:

- [ ] All CI checks passing on `main`
- [ ] Complete specs in `specs/` directory
- [ ] This constitution reviewed and current
- [ ] README with quickstart (< 10 minutes via `docker-compose up`)
- [ ] Architecture diagram
- [ ] Hardware setup guide
- [ ] API documentation

### Definition of "Done"

A feature is not done until:
- [ ] Code reviewed and merged
- [ ] Tests written and passing (80%+ coverage)
- [ ] Documentation updated
- [ ] Works in Docker environment
- [ ] No lint/type errors

### No "Works On My Machine"

If it doesn't run from `docker-compose up` on a fresh clone, it's not done.

---

## Amendment History

| Date | Version | Change |
|------|---------|--------|
| 2026-04-17 | 1.0.0 | Initial constitution |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-17 | Keep Winston instead of Pino | Winston already implemented with proper JSON formatting. Migration cost not justified. |
