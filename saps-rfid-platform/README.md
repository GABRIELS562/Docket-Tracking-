# RFID Spatial Intelligence Platform

Multi-tenant RFID tracking platform with 3D visualization and AI-powered anomaly detection. Built for industries that can't afford to lose track of high-value assets.

## What This Does

Instead of showing you spreadsheets and tables, this platform shows you a 3D digital twin of your facility. You can see exactly where every tagged item is, search for anything instantly, and get AI alerts when something looks wrong.

**Target industries:**
- Law enforcement (evidence tracking)
- Healthcare (medical equipment, pharmaceuticals)
- Mining (tools, safety equipment)
- Retail (high-value inventory)

## Key Features

### 3D Digital Twin
Real-time 3D visualization of your facility. Items appear where they actually are. Click on anything to see details. Fly through the space to inspect zones.

### Search-First Interface
Type what you're looking for. Results appear instantly. Click a result and the camera flies to that item in 3D space. No more hunting through spreadsheets.

### AI Anomaly Detection
The system learns normal patterns and flags when something's off:
- **Dwell time alerts** - Item sitting too long in one place
- **Unauthorized movement** - Item left a secure zone without clearance
- **Unusual sequences** - Item skipped expected workflow steps
- **After-hours activity** - Movement detected outside normal operating hours

### Multi-Tenant Architecture
One platform, multiple clients. Each tenant gets their own:
- Custom terminology (evidence, samples, assets, inventory)
- Industry-specific alert thresholds
- Branded experience
- Isolated data

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, React Three Fiber, Zustand |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL + TimescaleDB |
| RFID | LLRP protocol |
| Validation | Zod |
| Architecture | Hexagonal (Clean Architecture) |

## Project Structure

```
saps-rfid-platform/
├── frontend/                 # React 3D application
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3d/          # Three.js components (Scene, Warehouse, Items)
│   │   │   ├── layout/      # Header, Sidebar, Layout
│   │   │   └── ui/          # Buttons, Cards, Search, AI Panels
│   │   ├── pages/           # Route pages
│   │   ├── stores/          # Zustand state management
│   │   ├── hooks/           # Custom React hooks
│   │   └── services/        # API and WebSocket clients
│   └── package.json
│
├── src/                      # Backend application
│   ├── domain/              # Business logic (entities, events, rules)
│   ├── application/         # Use cases and DTOs
│   ├── infrastructure/      # Database, RFID, logging
│   └── presentation/        # REST API and WebSocket server
│
├── docker-compose.yml       # Full stack deployment
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 20+
- Docker (for database)
- pnpm

### Quick Start

```bash
# Clone and install
cd saps-rfid-platform
pnpm install

# Start database
docker-compose up -d timescaledb

# Run migrations
pnpm run db:migrate

# Start backend
pnpm run dev

# In another terminal, start frontend
cd frontend
pnpm install
pnpm run dev
```

Open `http://localhost:5173` and select a tenant to explore.

## Demo Mode

The platform includes a demo mode with simulated RFID data. Use the green "Demo Controls" panel (bottom-right of 3D view) to:

1. **Show RFID Readers** - Highlights all 14 readers in the facility
2. **Show Tagged Inventory** - Displays 250+ tracked items
3. **Trigger Dwell Alert** - Simulates an item stuck too long
4. **Trigger Unauthorized Exit** - Simulates a security breach
5. **Trigger Unusual Sequence** - Simulates workflow violation
6. **Trigger After-Hours Alert** - Simulates suspicious timing

## API Endpoints

### Items
```
POST   /api/v1/items              # Register new item
GET    /api/v1/items              # Search items
GET    /api/v1/items/:id          # Get item details
GET    /api/v1/items/:id/history  # Location history
```

### Zones
```
GET    /api/v1/zones              # List all zones
GET    /api/v1/zones/:id/items    # Items in zone
```

### Readers
```
GET    /api/v1/readers            # List all readers
```

### Health
```
GET    /health                    # Simple health check
GET    /health/detailed           # Full system status
```

## WebSocket Events

Real-time updates via Socket.IO:

```javascript
// Subscribe to updates
socket.emit('subscribe:zones', [1, 2, 3]);

// Receive events
socket.on('tag:detected', (data) => { /* ... */ });
socket.on('item:moved', (data) => { /* ... */ });
socket.on('zone:occupancy', (data) => { /* ... */ });
```

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rfid_platform
DB_USER=postgres
DB_PASSWORD=your_password

# RFID (comma-separated reader IPs)
RFID_READER_IPS=192.168.1.100,192.168.1.101

# Server
PORT=8080
CORS_ORIGIN=http://localhost:5173
```

## Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

This starts:
- Backend API (port 8080)
- Frontend (port 5173)
- TimescaleDB (port 5432)
- Redis (port 6379)

### Manual
```bash
# Build backend
pnpm run build

# Build frontend
cd frontend && pnpm run build

# Start with PM2
pnpm run start:pm2
```

## Current Tenants

| Tenant | Industry | Item Term | Dwell Threshold |
|--------|----------|-----------|-----------------|
| SAPS Forensics | Law Enforcement | Evidence | 14 days |
| MediTrack | Healthcare | Specimen | 7 days |
| MineSecure | Mining | Equipment | 30 days |
| RetailGuard | Retail | Product | 3 days |

## What Makes This Different

Most RFID platforms show you data in tables. This one shows you a 3D model of your actual facility with items positioned where they really are.

Most platforms alert you after something goes wrong. This one uses AI to catch problems while they're developing.

Most platforms are one-size-fits-all. This one adapts terminology and rules to your industry.

## Roadmap

- [ ] Mobile app for floor staff
- [ ] CAD/BIM import for warehouse setup
- [ ] Integration with court case management (SAPS)
- [ ] SAHPRA compliance module (Healthcare)
- [ ] Machine learning for predictive analytics

## License

Proprietary. Contact for licensing.

---

Built in South Africa for industries that track things that matter.
