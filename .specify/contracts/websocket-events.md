# WebSocket Events Contract — Core Docket Tracking

**Version**: 1.0
**Transport**: Socket.io over WebSocket/polling
**URL**: `/socket.io` (same host as API)

---

## 1. Connection

### 1.1 Authentication

WebSocket connections require a valid JWT token:

```javascript
const socket = io('https://site.local', {
  auth: { token: 'eyJhbGciOiJIUzI1NiIs...' },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});
```

### 1.2 Connection Events

```javascript
// Connection established
socket.on('connect', () => {
  console.log('Connected with ID:', socket.id);
});

// Disconnection
socket.on('disconnect', (reason) => {
  // reason: 'io server disconnect' | 'io client disconnect' | 'ping timeout' | etc.
});

// Connection error
socket.on('connect_error', (error) => {
  // error.message: 'unauthorized' | 'invalid token' | etc.
});
```

---

## 2. Client → Server Events

### 2.1 Subscribe to Zones

Subscribe to real-time updates for specific zones.

```javascript
// Subscribe
socket.emit('subscribe:zones', ['uuid-zone-1', 'uuid-zone-2']);

// Unsubscribe
socket.emit('unsubscribe:zones', ['uuid-zone-1']);
```

### 2.2 Subscribe to Item

Subscribe to updates for a specific item.

```javascript
// Subscribe
socket.emit('subscribe:item', 'uuid-item-1');

// Unsubscribe
socket.emit('unsubscribe:item', 'uuid-item-1');
```

### 2.3 Subscribe to Alerts

Subscribe to alert stream.

```javascript
// Subscribe to all alerts
socket.emit('subscribe:alerts');

// Subscribe to specific alert types
socket.emit('subscribe:alerts', { types: ['EXIT', 'RESTRICTED'] });

// Unsubscribe
socket.emit('unsubscribe:alerts');
```

### 2.4 Subscribe to Readers

Subscribe to reader status updates.

```javascript
// Subscribe to all readers
socket.emit('subscribe:readers');

// Subscribe to specific readers
socket.emit('subscribe:readers', ['uuid-reader-1', 'uuid-reader-2']);

// Unsubscribe
socket.emit('unsubscribe:readers');
```

---

## 3. Server → Client Events

### 3.1 Item Location Changed

Emitted when an item moves to a different zone.

```javascript
socket.on('item:location-changed', (event) => {
  // event structure:
  {
    itemId: 'uuid',
    itemNumber: 'LAB-2024-001234',
    previousZone: {
      id: 'uuid',
      name: 'Biology Lab',
      code: 'BIO-1'
    },
    currentZone: {
      id: 'uuid',
      name: 'Evidence Room A',
      code: 'EVD-A'
    },
    timestamp: '2026-04-19T10:30:00.123Z',
    confidence: 0.95,
    readerId: 'uuid'
  }
});
```

### 3.2 Zone Occupancy Changed

Emitted when zone item count changes.

```javascript
socket.on('zone:occupancy-changed', (event) => {
  // event structure:
  {
    zoneId: 'uuid',
    zoneName: 'Evidence Room A',
    zoneCode: 'EVD-A',
    occupancy: 246,
    delta: 1,  // +1 or -1
    capacity: 500,
    occupancyPercentage: 49.2,
    timestamp: '2026-04-19T10:30:00.123Z'
  }
});
```

### 3.3 Alert Triggered

Emitted when an alert is triggered.

```javascript
socket.on('alert:triggered', (event) => {
  // event structure:
  {
    alertId: 'uuid',
    alertType: 'EXIT',  // EXIT | RESTRICTED | STALE | READER_OFFLINE
    severity: 'HIGH',   // LOW | MEDIUM | HIGH | CRITICAL
    message: 'Docket LAB-2024-001234 exited via Main Exit',
    item: {
      id: 'uuid',
      itemNumber: 'LAB-2024-001234',
      referenceId: 'CASE-2024-001'
    },
    zone: {
      id: 'uuid',
      name: 'Main Exit',
      code: 'EXIT-MAIN'
    },
    timestamp: '2026-04-19T10:30:00.123Z'
  }
});
```

### 3.4 Alert Acknowledged

Emitted when an alert is acknowledged.

```javascript
socket.on('alert:acknowledged', (event) => {
  // event structure:
  {
    alertId: 'uuid',
    acknowledgedAt: '2026-04-19T10:35:00.123Z',
    acknowledgedBy: {
      id: 'uuid',
      displayName: 'Jane Supervisor'
    }
  }
});
```

### 3.5 Reader Status Changed

Emitted when a reader goes online/offline.

```javascript
socket.on('reader:status-changed', (event) => {
  // event structure:
  {
    readerId: 'uuid',
    readerName: 'Reader EVD-A-01',
    zoneId: 'uuid',
    zoneName: 'Evidence Room A',
    previousStatus: 'ONLINE',
    status: 'OFFLINE',  // ONLINE | OFFLINE | ERROR | CONNECTING | MAINTENANCE
    message: 'Connection timeout',
    timestamp: '2026-04-19T10:30:00.123Z'
  }
});
```

### 3.6 Tag Detected (Debug/Monitoring)

Emitted for every tag read (useful for monitoring, high volume).

```javascript
// Only emitted if subscribed to specific zone
socket.on('tag:detected', (event) => {
  // event structure:
  {
    epc: 'E280116060002004DECA48DA',
    readerId: 'uuid',
    readerName: 'Reader EVD-A-01',
    zoneId: 'uuid',
    rssi: -45,
    antenna: 1,
    timestamp: '2026-04-19T10:30:00.123Z',
    isKnown: true,  // false if unbound tag
    item: {
      id: 'uuid',
      itemNumber: 'LAB-2024-001234'
    }  // null if unbound
  }
});
```

---

## 4. Connection Status Events

### 4.1 System Status

Periodic heartbeat with system status.

```javascript
socket.on('system:status', (status) => {
  // status structure:
  {
    connectedReaders: 18,
    onlineReaders: 17,
    offlineReaders: 1,
    activeAlerts: 3,
    recentTagReads: 1250,  // last minute
    timestamp: '2026-04-19T10:30:00.123Z'
  }
});
```

---

## 5. Error Events

### 5.1 Subscription Error

```javascript
socket.on('error:subscription', (error) => {
  // error structure:
  {
    code: 'ZONE_NOT_FOUND',
    message: 'Zone uuid-zone-1 not found',
    requestedResource: 'zone',
    resourceId: 'uuid-zone-1'
  }
});
```

### 5.2 Authentication Error

```javascript
socket.on('error:auth', (error) => {
  // error structure:
  {
    code: 'TOKEN_EXPIRED',
    message: 'JWT token has expired',
    action: 'reauthenticate'
  }
});
```

---

## 6. Room Structure

Socket.io rooms for efficient event routing:

```
tenant:{tenantId}                    # All events for tenant
tenant:{tenantId}:zone:{zoneId}      # Zone-specific events
tenant:{tenantId}:item:{itemId}      # Item-specific events
tenant:{tenantId}:readers            # Reader status events
tenant:{tenantId}:alerts             # Alert events
```

---

## Document History

| Version | Date       | Author | Changes                    |
| ------- | ---------- | ------ | -------------------------- |
| 1.0     | 2026-04-19 | Claude | Initial WebSocket contract |
