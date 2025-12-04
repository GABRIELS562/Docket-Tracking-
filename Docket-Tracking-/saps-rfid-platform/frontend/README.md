# RFID Platform Frontend

3D visualization interface for the RFID Spatial Intelligence Platform. Built with React Three Fiber for WebGL rendering and Zustand for state management.

## Features

### 3D Warehouse Visualization
- Full 3D model of facility with zones, shelving, and equipment
- Instanced rendering for 250+ items without performance drop
- Post-processing effects (bloom, ambient occlusion)
- Cinematic camera with smooth transitions

### Interactive Elements
- Click items to see details panel
- Hover for quick info tooltips
- Zone highlighting with occupancy colors
- RFID reader visualization with range indicators

### Search Integration
- Type-ahead search with instant results
- Click result to fly camera to item location
- Pathfinding visualization shows route to item
- Faceted filters by zone, status, type

### AI Alerts Panel
- Real-time anomaly notifications
- Severity-based color coding
- Click alert to fly to affected item
- Acknowledgement workflow

### Demo Controls
- Presentation helper for demos
- Trigger simulated scenarios
- Show/hide RFID readers
- Control camera presets

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Three Fiber** - Three.js React renderer
- **Drei** - R3F helper components
- **Zustand** - State management
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Project Structure

```
src/
├── components/
│   ├── 3d/
│   │   ├── Scene.tsx              # Main 3D canvas wrapper
│   │   ├── Warehouse.tsx          # Building geometry and zones
│   │   ├── RFIDItems.tsx          # Item visualization
│   │   ├── RFIDReaders.tsx        # Reader positions and ranges
│   │   ├── Controls.tsx           # Camera controls
│   │   ├── Lighting.tsx           # Scene lighting
│   │   ├── CinematicCamera.tsx    # Smooth camera transitions
│   │   ├── ZoneHeatmap.tsx        # Occupancy heatmap overlay
│   │   └── PathfindingVisualization.tsx
│   │
│   ├── layout/
│   │   ├── Layout.tsx             # App shell
│   │   ├── Header.tsx             # Top bar with tenant info
│   │   └── Sidebar.tsx            # Navigation
│   │
│   └── ui/
│       ├── SearchInterface.tsx    # Search with suggestions
│       ├── AIAlertsPanel.tsx      # Anomaly notifications
│       ├── DemoControls.tsx       # Presentation helpers
│       ├── RealTimeAnalytics.tsx  # Live stats overlay
│       └── [common components]
│
├── pages/
│   ├── TenantSelectPage.tsx       # Landing page, tenant picker
│   ├── DashboardPage.tsx          # Main 3D view
│   ├── SearchPage.tsx             # Full search interface
│   ├── AnalyticsPage.tsx          # Charts and reports
│   ├── WarehouseSetupPage.tsx     # Zone configuration
│   └── AdminPage.tsx              # Settings
│
├── stores/
│   ├── sceneStore.ts              # 3D scene state
│   ├── aiAnalyticsStore.ts        # AI alerts and patterns
│   ├── filterStore.ts             # Search filters
│   └── authStore.ts               # Tenant/auth state
│
├── hooks/
│   ├── useAIAnomalyGenerator.ts   # Demo anomaly simulation
│   └── useWebSocket.ts            # Real-time updates
│
├── services/
│   ├── websocket.ts               # Socket.IO client
│   └── searchApi.ts               # Search API client
│
└── App.tsx                        # Routes and providers
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## State Management

### sceneStore
Controls the 3D scene state:
```typescript
// Camera
goToPreset('overview' | 'storage' | 'shipping')
flyToZone(zoneId: string)
flyToItem(position: [number, number, number])

// Visibility
toggleReaders()
toggleLabels()
toggleHeatmap()

// Selection
selectItem(itemId: string)
highlightZone(zoneId: string)
```

### aiAnalyticsStore
Manages AI analytics and alerts:
```typescript
// Tenant
setTenant(tenantId: string)

// Anomalies
addAnomaly(anomaly: AnomalyEvent)
acknowledgeAnomaly(id: string)

// Dwell Alerts
addDwellAlert(alert: DwellAlert)

// Patterns
updateZonePattern(zoneId: string, pattern: ZonePattern)
```

## 3D Components

### Scene.tsx
Main wrapper that sets up:
- Canvas with WebGL context
- Post-processing effects
- Camera controls
- All 3D child components
- UI overlay panels

### Warehouse.tsx
The building itself:
- Floor with grid texture
- Walls with transparency
- Zone boundaries (colored boxes)
- Shelving units
- Entry/exit markers

### RFIDItems.tsx
Tracked items using instanced meshes:
- Position from RFID location data
- Color based on status
- Selection highlighting
- Tooltip on hover
- Click to select

### CinematicCamera.tsx
Smooth camera movements:
- Fly-to animations with easing
- Preset positions (overview, zones)
- Orbit controls integration
- Auto-rotation option

## Demo Mode

For presentations without live RFID data. The `useAIAnomalyGenerator` hook creates realistic simulated events.

Enable demo mode by:
1. Selecting any tenant from landing page
2. Using Demo Controls panel (green, bottom-right)

Demo scenarios:
- Show all RFID readers with range indicators
- Show 250+ tagged inventory items
- Trigger dwell time alerts
- Trigger security breach alerts
- Trigger workflow violation alerts

## Performance

Optimizations for smooth 60fps:
- Instanced meshes for items (single draw call)
- Frustum culling (don't render off-screen)
- Level of detail (simpler geometry when far)
- Lazy loading pages (code splitting)
- Memoized components

Bundle size:
- Initial load: ~200KB
- Three.js chunk: ~500KB (lazy)
- Charts chunk: ~380KB (lazy on analytics page)

## Environment Variables

```bash
# API endpoint
VITE_API_URL=http://localhost:8080

# WebSocket endpoint
VITE_WS_URL=ws://localhost:8080
```

## Browser Support

Requires WebGL 2.0:
- Chrome 56+
- Firefox 51+
- Safari 15+
- Edge 79+

Mobile works but desktop recommended for best experience.

## Key Files

| File | Purpose |
|------|---------|
| `Scene.tsx` | 3D canvas setup and composition |
| `sceneStore.ts` | All 3D state and camera controls |
| `aiAnalyticsStore.ts` | AI alerts, patterns, tenant config |
| `TenantSelectPage.tsx` | Multi-tenant entry point |
| `DemoControls.tsx` | Presentation helper panel |
| `SearchInterface.tsx` | Search with fly-to integration |

## Scripts

```bash
pnpm run dev        # Start dev server
pnpm run build      # Production build
pnpm run preview    # Preview build
pnpm run lint       # Run ESLint
pnpm run typecheck  # TypeScript check
```
