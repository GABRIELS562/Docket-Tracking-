# Frontend Refactor Plan: Zone-Centric Visualization

**Goal:** Handle 500,000 items efficiently with hybrid 3D overview + 2D detail

## Current State Analysis

### What Works (Keep)

| Component                    | Purpose           | Status                  |
| ---------------------------- | ----------------- | ----------------------- |
| React 18 + TypeScript + Vite | Core stack        | ✅ Keep                 |
| Zustand (useStore.ts)        | State management  | ✅ Keep, refactor       |
| TanStack Query               | Data fetching     | ✅ Keep                 |
| Socket.io (socket.ts)        | Real-time updates | ✅ Keep                 |
| Recharts                     | Analytics charts  | ✅ Keep                 |
| Tailwind CSS                 | Styling           | ✅ Keep                 |
| NotificationSystem           | Alerts            | ✅ Keep                 |
| DocketSearchPanel            | Item search       | ✅ Keep, add pagination |
| Analytics page               | Charts/stats      | ✅ Keep                 |

### What Needs Refactoring

| Component            | Issue                                  | Action                          |
| -------------------- | -------------------------------------- | ------------------------------- |
| ForensicBuilding.tsx | Hardcoded 12 zones, FSL-PAROW specific | **Rebuild** → ZoneOverlay3D     |
| RfidParticles.tsx    | Renders individual items (won't scale) | **Remove** → Zone heatmap only  |
| FloorPlan2D.tsx      | Static image-based                     | **Rebuild** → Data-driven SVG   |
| ZONE_POSITIONS       | Hardcoded in 4 files                   | **Centralize** → zones from API |
| mockData.ts          | Forensic-specific naming               | **Rename** → Item terminology   |
| App.tsx              | 376 lines, too complex                 | **Split** into route components |

### What to Remove

- RfidParticles.tsx (individual item rendering)
- HeatMapOverlay.tsx (merge into zone visualization)
- Hardcoded ZONE_POSITIONS constants
- docketLimit cap (replace with zone aggregation)

---

## Architecture: Hybrid 3D/2D Approach

```
┌─────────────────────────────────────────────────────────────┐
│                     3D OVERVIEW (Default)                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │    [Zone A]        [Zone B]        [Zone C]             │ │
│  │     12,450          8,203          45,102               │ │
│  │      🟢              🟡              🔴                 │ │
│  │                                                         │ │
│  │    [Zone D]        [Zone E]        [Zone F]             │ │
│  │     28,901         102,344         15,230               │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│  Click zone to drill down...                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Click Zone E)
┌─────────────────────────────────────────────────────────────┐
│                   2D ZONE DETAIL VIEW                        │
│  ┌───────────────────────┬─────────────────────────────────┐ │
│  │   Zone E Layout       │   Items in Zone (102,344)       │ │
│  │   ┌───────────────┐   │   ┌─────────────────────────┐   │ │
│  │   │ [Reader 1]    │   │   │ Search: [_________]     │   │ │
│  │   │   •  •  •     │   │   │                         │   │ │
│  │   │ [Reader 2]    │   │   │ INV-2024-000001  Zone E │   │ │
│  │   │   •  •        │   │   │ INV-2024-000002  Zone E │   │ │
│  │   │ [Reader 3]    │   │   │ INV-2024-000003  Zone E │   │ │
│  │   │   •  •  •  •  │   │   │ ... (paginated)         │   │ │
│  │   └───────────────┘   │   │                         │   │ │
│  │   ← Back to Overview  │   │ Page 1 of 2,047         │   │ │
│  └───────────────────────┴─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Strategy for 500K Items

### Problem

- Cannot fetch 500K items to frontend
- Cannot render 500K objects (GPU limit)
- Users don't need to see all items simultaneously

### Solution: Zone-Level Aggregation

**API Changes:**

```typescript
// Zone summary (always fetched)
GET /api/v1/zones
→ { zones: [{ zoneId, zoneName, itemCount, capacity, readers }] }

// Items ONLY when drilling into a zone (paginated)
GET /api/v1/zones/{zoneId}/items?page=1&limit=50
→ { items: [...], total: 102344, page: 1, totalPages: 2047 }

// Search across all items (server-side)
GET /api/v1/items/search?q=INV-2024&limit=50
→ { items: [...], total: 342 }
```

**Frontend Never Holds 500K Items:**

- Store holds: zones array (~50-100 zones)
- Store holds: current zone's items (50 max, paginated)
- Store holds: search results (50 max)

---

## Component Architecture

### New Component Structure

```
src/
├── components/
│   ├── overview/                    # 3D Overview (Zone-centric)
│   │   ├── ZoneOverview3D.tsx       # Main 3D canvas
│   │   ├── ZoneBlock.tsx            # Single zone geometry
│   │   └── ZoneLabel.tsx            # Floating label
│   │
│   ├── detail/                      # 2D Zone Detail
│   │   ├── ZoneDetailView.tsx       # Main detail container
│   │   ├── ZoneFloorPlan.tsx        # 2D SVG floor plan
│   │   ├── ItemList.tsx             # Paginated item list
│   │   └── ReaderMarkers.tsx        # Reader positions
│   │
│   ├── shared/                      # Shared UI
│   │   ├── SearchBar.tsx            # Global search
│   │   ├── ZoneSidebar.tsx          # Zone list
│   │   ├── ItemCard.tsx             # Item display
│   │   └── Pagination.tsx           # Page controls
│   │
│   └── charts/                      # Analytics (keep existing)
│       ├── OccupancyChart.tsx
│       ├── DistributionChart.tsx
│       └── ReaderActivityChart.tsx
│
├── pages/
│   ├── OverviewPage.tsx             # 3D zone overview
│   ├── ZoneDetailPage.tsx           # 2D zone detail
│   └── AnalyticsPage.tsx            # Charts (keep)
│
├── store/
│   ├── useZoneStore.ts              # Zone state
│   ├── useItemStore.ts              # Current items (paginated)
│   └── useUIStore.ts                # UI state (panels, modals)
│
└── lib/
    ├── api.ts                       # HTTP (refactored)
    ├── socket.ts                    # WebSocket (keep)
    └── types.ts                     # Shared types
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)

- [ ] Rename Docket → Item throughout codebase
- [ ] Create new type definitions (Item, Zone with counts)
- [ ] Centralize zone configuration (remove hardcoded positions)
- [ ] Split Zustand store into zones/items/ui

### Phase 2: 3D Overview (Day 2)

- [ ] Create ZoneOverview3D.tsx (replace ForensicBuilding)
- [ ] Create ZoneBlock.tsx (data-driven zone geometry)
- [ ] Remove RfidParticles.tsx (no individual items in 3D)
- [ ] Add zone click → navigate to detail view
- [ ] Color zones by occupancy percentage

### Phase 3: 2D Detail View (Day 3)

- [ ] Create ZoneDetailView.tsx container
- [ ] Create ZoneFloorPlan.tsx (SVG-based, data-driven)
- [ ] Create ItemList.tsx with pagination
- [ ] Add server-side search endpoint
- [ ] Wire up real-time updates for single zone

### Phase 4: Polish & Integration (Day 4)

- [ ] Back button from detail → overview
- [ ] Global search (searches server, shows zone)
- [ ] Real-time zone count updates
- [ ] Notifications for zone alerts
- [ ] Mobile responsiveness

---

## Key Decisions

### 3D Overview: What to Show

| Element            | Visible     | Notes               |
| ------------------ | ----------- | ------------------- |
| Zone blocks        | ✅ Yes      | Color = occupancy % |
| Zone labels        | ✅ Yes      | Name + count        |
| Individual items   | ❌ No       | Not scalable        |
| Reader positions   | ⚠️ Optional | Dots on zones       |
| Animated particles | ❌ No       | Misleading at scale |

### 2D Detail: What to Show

| Element          | Visible | Notes              |
| ---------------- | ------- | ------------------ |
| Zone floor plan  | ✅ Yes  | SVG polygon        |
| Reader positions | ✅ Yes  | Icons with status  |
| Item list        | ✅ Yes  | Paginated table    |
| Item search      | ✅ Yes  | Filter within zone |
| Recent activity  | ✅ Yes  | Last 10 movements  |

---

## Performance Targets

| Metric            | Target | Strategy                  |
| ----------------- | ------ | ------------------------- |
| Initial load      | <2s    | Only fetch zone summaries |
| Zone click        | <500ms | Lazy load items           |
| Search            | <1s    | Server-side, limit 50     |
| Real-time updates | <100ms | WebSocket zone counts     |
| 3D render         | 60 FPS | ~50 zone blocks max       |
| Memory            | <100MB | No item arrays in memory  |

---

## Files to Delete

```
src/components/3d/RfidParticles.tsx      # Individual items
src/components/3d/HeatMapOverlay.tsx     # Merge into ZoneBlock
src/components/3d/ForensicBuilding.tsx   # Replace with ZoneOverview3D
```

## Files to Heavily Modify

```
src/App.tsx                              # Simplify routing
src/store/useStore.ts                    # Split into 3 stores
src/lib/api.ts                           # Add pagination endpoints
src/lib/mockData.ts                      # Rename Docket → Item
src/components/FloorPlan2D.tsx           # Data-driven SVG
```

## Files to Keep As-Is

```
src/lib/socket.ts                        # WebSocket works
src/components/charts/*                  # Charts work
src/components/NotificationSystem.tsx    # Alerts work
src/pages/Analytics.tsx                  # Analytics works
```

---

## Next Steps

1. **Approve this plan** or request changes
2. **Start Phase 1**: Rename Docket → Item, split stores
3. **Build iteratively**: Overview → Detail → Polish

Ready to implement on your approval.
