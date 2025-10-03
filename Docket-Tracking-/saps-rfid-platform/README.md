# SAPS RFID Platform

Enterprise-grade RFID tracking backend system for forensic laboratory evidence management. Built to replace Zebra MotionWorks ($50k commercial product) with a production-ready, scalable solution for tracking 10,000+ evidence dockets.

## Features

- **Real-time RFID Tracking**: LLRP protocol integration with automatic reader discovery
- **Clean Architecture**: Hexagonal architecture with clear separation of concerns
- **Type Safety**: Strict TypeScript with zero `any` types
- **Result Types**: Functional error handling using `neverthrow`
- **Time-Series Database**: TimescaleDB for efficient historical location tracking
- **WebSocket Support**: Real-time updates to connected clients
- **Production Ready**: Comprehensive error handling, logging, and monitoring
- **Highly Testable**: Dependency injection, mocking support, 80%+ test coverage
- **Security Hardened**: Helmet, CORS, rate limiting, input validation
- **Performance Optimized**: Connection pooling, caching, query optimization

## Technology Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5.3+ (strict mode) |
| Framework | Express 4.18 |
| Database | PostgreSQL 15 + TimescaleDB 2.13 |
| Database Driver | pg (native, no ORM) |
| Validation | Zod 3.x |
| DI Container | tsyringe 4.x |
| Testing | Jest 29.x + Supertest |
| Logging | Winston 3.x + morgan |
| WebSocket | Socket.io 4.6 |
| RFID | llrp npm package |
| Process Manager | PM2 |
| Package Manager | pnpm |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Presentation Layer                   │
│  (HTTP Controllers, WebSocket Handlers, Routes)     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Application Layer                    │
│     (Use Cases, DTOs, Mappers, Orchestration)       │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                   Domain Layer                       │
│  (Entities, Value Objects, Business Rules, Events)  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               Infrastructure Layer                   │
│  (Database, RFID Gateway, Logging, Event Bus, etc)  │
└─────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### **Domain Layer** (Pure Business Logic)
- No external dependencies
- Contains entities, value objects, domain services
- Defines repository interfaces (not implementations)
- Domain events and business rules

#### **Application Layer** (Use Cases)
- Orchestrates domain logic
- Defines DTOs for input/output
- Maps between domain entities and DTOs
- Transaction boundaries

#### **Infrastructure Layer** (External Concerns)
- Repository implementations
- RFID hardware integration
- Database connections
- External service integrations

#### **Presentation Layer** (API/WebSocket)
- HTTP request handling
- WebSocket event handling
- Request validation
- Response formatting

## Project Structure

```
saps-rfid-platform/
├── src/
│   ├── domain/                  # Pure business logic (no deps)
│   │   ├── entities/           # Core business entities
│   │   ├── value-objects/      # Validated value objects
│   │   ├── repositories/       # Repository interfaces
│   │   ├── services/           # Domain services
│   │   ├── events/             # Domain events
│   │   └── errors/             # Domain errors
│   │
│   ├── application/            # Use cases / orchestration
│   │   ├── use-cases/         # Application use cases
│   │   ├── dto/               # Data Transfer Objects
│   │   ├── mappers/           # Entity ↔ DTO converters
│   │   └── interfaces/        # Application interfaces
│   │
│   ├── infrastructure/        # External concerns
│   │   ├── rfid/             # RFID hardware integration
│   │   ├── database/         # PostgreSQL + TimescaleDB
│   │   ├── events/           # Event bus implementation
│   │   ├── logging/          # Winston logger
│   │   └── metrics/          # Prometheus metrics
│   │
│   ├── presentation/          # API layer
│   │   ├── http/             # REST API
│   │   └── websocket/        # WebSocket server
│   │
│   ├── shared/                # Shared utilities
│   │   ├── types/            # Common types (Result, Option)
│   │   ├── utils/            # Utility functions
│   │   └── constants/        # Application constants
│   │
│   ├── config/                # Configuration
│   ├── container.ts           # DI container setup
│   └── index.ts               # Application entry point
│
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   └── fixtures/              # Test data
│
├── scripts/                   # Utility scripts
├── docs/                      # Documentation
└── [config files]
```

## Prerequisites

- **Node.js**: 20.x LTS
- **pnpm**: 8.x or higher
- **Docker**: 24.x or higher (for containerized deployment)
- **PostgreSQL**: 15+ with TimescaleDB extension (or use Docker)
- **Redis**: 7+ (optional, for caching)

## Quick Start

### 1. Install Dependencies

```bash
cd saps-rfid-platform
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services with Docker

```bash
# Start PostgreSQL (TimescaleDB) + Redis
docker-compose up -d timescaledb redis

# Wait for services to be healthy
docker-compose ps
```

### 4. Run Database Migrations

```bash
pnpm run db:migrate
```

### 5. Seed Database (Optional)

```bash
pnpm run db:seed
```

### 6. Start Development Server

```bash
pnpm run dev
```

The server will start on `http://localhost:8080`

## Development

### Available Scripts

```bash
# Development
pnpm run dev              # Start with hot reload
pnpm run build            # Build for production
pnpm run start            # Start production server

# Testing
pnpm test                 # Run all tests with coverage
pnpm run test:watch       # Run tests in watch mode
pnpm run test:unit        # Run unit tests only
pnpm run test:integration # Run integration tests
pnpm run test:e2e         # Run end-to-end tests

# Code Quality
pnpm run lint             # Lint code
pnpm run lint:fix         # Lint and fix issues
pnpm run format           # Format code
pnpm run format:check     # Check formatting
pnpm run typecheck        # Type check without emit

# Database
pnpm run db:migrate       # Run database migrations
pnpm run db:seed          # Seed database
pnpm run db:reset         # Reset database

# Docker
pnpm run docker:up        # Start all services
pnpm run docker:down      # Stop all services
pnpm run docker:logs      # View logs
pnpm run docker:build     # Build Docker image

# PM2
pnpm run start:pm2        # Start with PM2
pnpm run stop:pm2         # Stop PM2
pnpm run restart:pm2      # Restart PM2
pnpm run logs:pm2         # View PM2 logs
```

### Code Style

- **TypeScript Strict Mode**: Enabled
- **No `any` Types**: Use proper types or `unknown`
- **Functional Error Handling**: Use `Result<T, E>` from `neverthrow`
- **Validation**: Use Zod for all input validation
- **Pure Functions**: Prefer pure functions where possible
- **Immutability**: Avoid mutations, use spread operators
- **JSDoc**: Document all public APIs

### Testing

```bash
# Run tests with coverage
pnpm test

# Watch mode during development
pnpm run test:watch

# Test specific layer
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

**Coverage Requirements**: 80% across branches, functions, lines, and statements

## Deployment

### Docker Deployment

```bash
# Build production image
docker build -t saps-rfid-platform:latest .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f saps-rfid-app
```

### PM2 Deployment

```bash
# Build application
pnpm run build

# Start with PM2
pnpm run start:pm2

# Monitor
pm2 monit

# View logs
pm2 logs saps-rfid-platform

# Restart
pm2 restart saps-rfid-platform
```

## API Endpoints

### Health Checks

```
GET /health                 # Simple health check
GET /health/detailed        # Detailed health status
```

### Dockets

```
POST   /api/v1/dockets                    # Register new docket
GET    /api/v1/dockets                    # Search dockets
GET    /api/v1/dockets/:id                # Get docket details
GET    /api/v1/dockets/:id/history        # Get location history
```

### Zones

```
GET    /api/v1/zones                      # Get all zones
GET    /api/v1/zones/:id                  # Get zone details
GET    /api/v1/zones/:id/occupancy        # Get zone occupancy
GET    /api/v1/zones/:id/dockets          # Get dockets in zone
```

### Readers

```
GET    /api/v1/readers                    # Get all readers
GET    /api/v1/readers/:id                # Get reader details
GET    /api/v1/readers/:id/status         # Get reader status
```

### Metrics

```
GET    /metrics                           # Prometheus metrics
```

## WebSocket Events

### Client → Server

```javascript
// Subscribe to docket updates
socket.emit('subscribe:docket', { docketId: 'FSL-2025-000001' });

// Subscribe to zone updates
socket.emit('subscribe:zone', { zoneId: 'zone-uuid' });

// Unsubscribe
socket.emit('unsubscribe:docket', { docketId: 'FSL-2025-000001' });
socket.emit('unsubscribe:zone', { zoneId: 'zone-uuid' });
```

### Server → Client

```javascript
// Tag detected event
socket.on('tag:detected', (data) => {
  // { epc, readerId, timestamp, rssi }
});

// Docket moved event
socket.on('docket:moved', (data) => {
  // { docketId, fromZone, toZone, timestamp, confidence }
});

// Zone occupancy changed
socket.on('zone:occupancy', (data) => {
  // { zoneId, currentCount, capacity, percentage }
});
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

**Critical Variables:**

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saps_rfid
DB_USER=postgres
DB_PASSWORD=your_password

# RFID Readers (comma-separated)
RFID_READER_IPS=192.168.1.100,192.168.1.101,192.168.1.102
RFID_READER_PORT=5084

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX_REQUESTS=100
```

## Monitoring

### Prometheus Metrics

Access metrics at `http://localhost:9090/metrics`

**Available Metrics:**
- HTTP request duration
- RFID tag read rates
- Database connection pool stats
- Active WebSocket connections
- System resource usage

### Grafana Dashboards

Access Grafana at `http://localhost:3000` (default: admin/admin)

Pre-configured dashboards available in `monitoring/grafana/`

## Troubleshooting

### Database Connection Issues

```bash
# Check if TimescaleDB is running
docker-compose ps timescaledb

# Check logs
docker-compose logs timescaledb

# Reset database
pnpm run db:reset
```

### RFID Reader Connection Issues

```bash
# Test reader connectivity
ping 192.168.1.100

# Check firewall rules (LLRP uses port 5084)
telnet 192.168.1.100 5084

# Enable debug logging
LOG_LEVEL=debug pnpm run dev
```

### Performance Issues

```bash
# Monitor PM2 processes
pm2 monit

# Check database query performance
# See logs/app.log for slow queries

# Analyze container resource usage
docker stats
```

## Security

- **Input Validation**: All inputs validated with Zod
- **SQL Injection**: Using parameterized queries
- **Rate Limiting**: 100 requests/minute per IP
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers enabled
- **No Secrets in Code**: All secrets in environment variables

## License

PROPRIETARY - SAPS Forensic Laboratory

## Support

For issues and feature requests, please contact the development team.

## Contributing

This is an internal project. Please follow the coding standards and testing requirements outlined in this document.

---

**Built with ❤️ for SAPS Forensic Laboratory**
