# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-tier RFID inventory tracking platform** with 3D visualization. It's a monorepo with:
- **Frontend**: React + TypeScript SPA with 3D visualization (root directory)
- **Backend**: Enterprise Node.js with clean/hexagonal architecture (`saps-rfid-platform/`)

## Commands

### Frontend (Root Directory)
```bash
npm run dev          # Start dev server on port 3000
npm run build        # TypeScript compile + Vite build
npm run preview      # Preview production build
```

### Backend (`saps-rfid-platform/`)
```bash
pnpm run dev              # Start with hot reload (tsx watch)
pnpm run build            # Build for production
pnpm test                 # Run all tests with coverage
pnpm run test:watch       # Tests in watch mode
pnpm run test:unit        # Unit tests only
pnpm run test:integration # Integration tests only
pnpm run test:e2e         # End-to-end tests only
pnpm run lint             # ESLint
pnpm run lint:fix         # ESLint with auto-fix
pnpm run format           # Prettier format
pnpm run db:migrate       # Run database migrations
pnpm run db:seed          # Seed database
pnpm run docker:up        # Start PostgreSQL + Redis containers
```

## Architecture

### Clean Architecture Layers (Backend)

Dependencies flow inward: Presentation → Application → Domain ← Infrastructure

```
src/
├── domain/           # Pure business logic (NO external deps)
│   ├── entities/     # Core entities (Docket, Zone, Reader)
│   ├── value-objects/# Validated values (LabNumber, RfidEpc)
│   ├── repositories/ # Interface definitions only
│   ├── services/     # Domain services
│   ├── events/       # Domain events
│   └── errors/       # Domain-specific errors
├── application/      # Use cases / orchestration
│   ├── use-cases/    # Business operations
│   ├── dto/          # Data transfer objects
│   └── mappers/      # Entity ↔ DTO converters
├── infrastructure/   # External integrations
│   ├── database/     # PostgreSQL + TimescaleDB repos
│   ├── rfid/         # LLRP protocol gateway
│   ├── logging/      # Winston logger
│   └── events/       # Event bus implementation
├── presentation/     # API layer
│   ├── http/         # Express controllers & routes
│   └── websocket/    # Socket.io handlers
└── container.ts      # tsyringe DI setup
```

### Frontend Structure
```
src/
├── components/
│   ├── 3d/           # React Three Fiber (Scene3D, ForensicBuilding, RfidParticles)
│   └── charts/       # Recharts visualizations
├── hooks/            # Custom React hooks
├── store/            # Zustand state management
├── lib/
│   ├── api.ts        # Axios client
│   ├── socket.ts     # Socket.io client
│   └── mockData.ts   # Demo mode data
└── pages/            # Route components
```

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

## API & Real-time

**REST endpoints**: `/api/v1/dockets`, `/api/v1/zones`, `/api/v1/readers`

**WebSocket events**:
- `tag:detected` - RFID tag read
- `docket:moved` - Item changed zones
- `zone:occupancy` - Zone count updated

**Vite proxy**: Dev server proxies `/api` and `/socket.io` to backend (port 8080)

## Reference Documents

- `StartHere.md` - Master vision and architecture (141KB)
- `AI_AGENT_CONTROL_GUIDE.md` - Detailed AI development rules
- `AI_AGENT_QUICK_REFERENCE.md` - Quick checklist
- `IMPLEMENTATION_ROADMAP.md` - Phase-by-phase plan
