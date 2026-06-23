# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-tier RFID inventory tracking platform** with 3D visualization. It's a monorepo with:

- **Frontend Demo** (root `src/`): React + TypeScript SPA with 3D visualization
- **Backend API** (`saps-rfid-platform/src/`): Enterprise Node.js with clean/hexagonal architecture
- **Platform Frontend** (`saps-rfid-platform/frontend/`): React 19 + TypeScript production frontend

## Commands

### Frontend Demo (Root Directory - npm)

```bash
npm run dev                 # Start dev server on port 3000
npm run build               # TypeScript compile + Vite build
npm run lint                # ESLint
npm run typecheck           # TypeScript type checking only
npm run test                # Vitest (unit tests)
npm run test:unit           # Single run with coverage
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Playwright with UI mode
```

### Backend (`saps-rfid-platform/` - pnpm)

```bash
pnpm run dev              # Start with hot reload (tsx watch)
pnpm run build            # Build for production
pnpm test                 # Run all tests with coverage
pnpm run test:watch       # Tests in watch mode
pnpm run test:unit        # Unit tests only
pnpm run test:integration # Integration tests only
pnpm run lint             # ESLint (use ESLINT_USE_FLAT_CONFIG=false)
pnpm run lint:fix         # ESLint with auto-fix
pnpm run format           # Prettier format
pnpm run db:migrate       # Run database migrations
pnpm run db:seed          # Seed database
pnpm run docker:up        # Start PostgreSQL + Redis containers
```

### Platform Frontend (`saps-rfid-platform/frontend/` - pnpm)

```bash
pnpm run dev              # Start dev server on port 5173
pnpm run build            # TypeScript compile + Vite build
pnpm run lint             # ESLint
```

## Architecture

### Clean Architecture Layers (Backend - `saps-rfid-platform/src/`)

Dependencies flow inward: Presentation → Application → Domain ← Infrastructure

```
src/
├── domain/           # Pure business logic (NO external deps)
│   ├── entities/     # Core entities (Item, Zone, Reader, Tenant)
│   ├── value-objects/# Validated values (ItemNumber, RfidEpc, IpAddress)
│   ├── repositories/ # Interface definitions only
│   ├── services/     # Domain services (PathfindingService, ZoneAssignmentService)
│   ├── events/       # Domain events
│   └── errors/       # Domain-specific errors
├── application/      # Use cases / orchestration
│   ├── use-cases/    # Business operations (items/, zones/, readers/, analytics/)
│   ├── dto/          # Data transfer objects
│   ├── mappers/      # Entity ↔ DTO converters
│   └── services/     # Application services
├── infrastructure/   # External integrations
│   ├── database/     # PostgreSQL + TimescaleDB repos
│   ├── rfid/         # LLRP protocol gateway
│   ├── analytics/    # AI analytics engine
│   ├── cache/        # Redis caching
│   └── events/       # Event bus implementation
├── presentation/     # API layer
│   ├── http/         # Express controllers, routes, middleware
│   └── websocket/    # Socket.io handlers
└── container.ts      # tsyringe DI setup
```

### Frontend Demo Structure (Root `src/`)

```
src/
├── components/
│   ├── 3d/           # React Three Fiber (Scene3D, ForensicBuilding, RfidParticles)
│   └── charts/       # Recharts visualizations
├── hooks/            # Custom React hooks
├── store/            # Zustand state management
├── lib/
│   ├── api.ts        # Axios client
│   └── mockData.ts   # Demo mode data
└── pages/            # Route components
```

### Path Alias

Both frontends use `@/` path alias pointing to `src/`. Example: `import { Button } from '@/components/ui/Button'`

## Tech Stack

**Frontend**: React 18, TypeScript (strict), Vite, React Three Fiber, TanStack Query, Zustand, Tailwind CSS, Socket.io client, Recharts

**Backend**: Node.js 20, Express, PostgreSQL + TimescaleDB, TypeScript (strict), tsyringe (DI), Zod (validation), neverthrow (Result types), Jest, Socket.io, PM2

## Key Conventions

### Layer Boundaries (Strict)

- **Domain layer**: Zero external imports (no axios, express, fs, pg)
- **Application layer**: Only interfaces from domain, never direct DB/HTTP
- **Infrastructure**: Implements domain interfaces
- **Presentation**: Calls use cases, never business logic inline

### Error Handling

- Use `Result<T, E>` from `neverthrow` in domain/application layers
- Throw exceptions only at presentation boundary
- Domain errors are typed classes, not strings

### Multi-Tenant Requirements

Every database query must include `tenant_id`. Cache keys must be namespaced: `tenant:{id}:item:{id}`

### Testing

- 80% minimum coverage required
- Structure: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- Domain entities require 100% coverage
- Write tests alongside implementation (TDD encouraged)

### Naming (Genericization in Progress)

The codebase is transitioning from forensic-specific to generic inventory terms:

- Prefer `Item` over `Docket` for new code
- Prefer `item_number` over `lab_number`
- Prefer `reference_id` over `case_reference`

### Performance Targets

- API response: <300ms
- Database queries: <100ms complex, <10ms simple
- 3D rendering: 60 FPS with max 500 visible objects
- Never load all items; use pagination (max 50-500 per request)

### License Compliance

Only use MIT, Apache 2.0, BSD-3-Clause licenses. GPL/AGPL/SSPL are forbidden.

### Commit Message Format

Uses conventional commits (enforced by commitlint/husky):

```
type(scope): subject in lower-case

# Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
# Subject must be lower-case, no period at end
```

## API & Real-time

**REST endpoints**: `/api/v1/items`, `/api/v1/zones`, `/api/v1/readers`, `/api/v1/tenants`

**Swagger docs**: Available at `http://localhost:8080/api-docs` when backend is running

**WebSocket events**:

- `tag:detected` - RFID tag read
- `item:moved` - Item changed zones
- `zone:occupancy` - Zone count updated

**Vite proxy**: Dev server proxies `/api` and `/socket.io` to backend (port 8080)

## Running a Single Test

**Backend (Jest)**:

```bash
cd saps-rfid-platform
pnpm test -- --testPathPattern="Item.test"     # Run tests matching pattern
pnpm test -- tests/unit/domain/entities/Item.test.ts  # Run specific file
```

**Frontend (Vitest)**:

```bash
npm test -- src/components/__tests__/Button.test.tsx  # Run specific file
npm test -- --reporter=verbose                         # Verbose output
```

**E2E (Playwright)**:

```bash
npm run test:e2e -- e2e/navigation.spec.ts            # Run specific spec
npm run test:e2e -- --project=chromium                # Specific browser
```

## Reference Documents

- `docs/StartHere.md` - Master vision and architecture
- `saps-rfid-platform/README.md` - Backend platform overview and API docs
