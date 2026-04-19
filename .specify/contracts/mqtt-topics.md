# MQTT Topic Schema — Core Docket Tracking

**Version**: 1.0
**Broker**: Eclipse Mosquitto
**Port**: 1883 (internal), 8883 (TLS, optional)

---

## 1. Topic Hierarchy

```
rfid/
├── tenant/{tenantId}/
│   ├── readers/{readerId}/
│   │   ├── tags          # Tag reads (reader → broker)
│   │   ├── status        # Reader status (reader → broker)
│   │   └── config        # Configuration (broker → reader)
│   └── gateway/
│       └── heartbeat     # Gateway heartbeat (gateway → broker)
│
└── system/
    └── broadcast         # System-wide announcements

# Phase 2 (reserved)
access/
└── tenant/{tenantId}/
    └── events            # HID/iClass access card events
```

---

## 2. Reader → Broker Topics

### 2.1 Tag Reads

**Topic**: `rfid/tenant/{tenantId}/readers/{readerId}/tags`

**QoS**: 1 (at least once)

**Payload** (JSON):

```json
{
  "epc": "E280116060002004DECA48DA",
  "rssi": -45,
  "antenna": 1,
  "timestamp": "2026-04-19T10:30:00.123Z",
  "peakRssi": -42,
  "phaseAngle": 45.2,
  "readCount": 3
}
```

**Field Definitions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `epc` | string | Yes | 96-bit EPC (24 hex chars) |
| `rssi` | integer | Yes | Received signal strength (-90 to 0 dBm) |
| `antenna` | integer | Yes | Antenna port (1-8) |
| `timestamp` | ISO8601 | Yes | Reader timestamp (used for latency calc only) |
| `peakRssi` | integer | No | Peak RSSI during read |
| `phaseAngle` | number | No | RF phase angle (degrees) |
| `readCount` | integer | No | Number of reads in this report |

**Note**: Server timestamps the read at ingestion, NOT using reader timestamp.

### 2.2 Reader Status

**Topic**: `rfid/tenant/{tenantId}/readers/{readerId}/status`

**QoS**: 1

**Retained**: Yes (last status persists)

**Payload** (JSON):

```json
{
  "status": "ONLINE",
  "uptimeSeconds": 86400,
  "lastReadAt": "2026-04-19T10:29:55.000Z",
  "antennas": [
    { "port": 1, "connected": true, "transmitPower": 27.0 },
    { "port": 2, "connected": true, "transmitPower": 27.0 },
    { "port": 3, "connected": false },
    { "port": 4, "connected": false }
  ],
  "firmwareVersion": "3.2.42",
  "temperature": 45.2,
  "cpuUsage": 12.5,
  "memoryUsage": 34.2,
  "timestamp": "2026-04-19T10:30:00.000Z"
}
```

**Status Values**:
| Status | Description |
|--------|-------------|
| `ONLINE` | Reader operational, actively reading |
| `IDLE` | Reader connected, no tags in range |
| `ERROR` | Reader error (see error field) |
| `REBOOTING` | Reader is rebooting |

---

## 3. Broker → Reader Topics

### 3.1 Configuration Updates

**Topic**: `rfid/tenant/{tenantId}/readers/{readerId}/config`

**QoS**: 2 (exactly once)

**Payload** (JSON):

```json
{
  "command": "UPDATE_CONFIG",
  "config": {
    "transmitPower": 27.0,
    "readInterval": 100,
    "rssiThreshold": -70,
    "antennas": [1, 2],
    "session": 1,
    "modeIndex": 0
  },
  "requestId": "uuid",
  "timestamp": "2026-04-19T10:30:00.000Z"
}
```

**Commands**:
| Command | Description |
|---------|-------------|
| `UPDATE_CONFIG` | Update reader configuration |
| `RESTART` | Restart reader |
| `START_INVENTORY` | Start continuous inventory |
| `STOP_INVENTORY` | Stop inventory |
| `PING` | Health check |

**Configuration Fields**:
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `transmitPower` | number | 10.0-30.0 | Transmit power in dBm |
| `readInterval` | integer | 50-1000 | Read interval in ms |
| `rssiThreshold` | integer | -90 to -30 | Minimum RSSI to report |
| `antennas` | array | [1-8] | Active antenna ports |
| `session` | integer | 0-3 | RFID session |
| `modeIndex` | integer | 0-100 | Reader mode index |

---

## 4. Gateway Topics

### 4.1 Gateway Heartbeat

**Topic**: `rfid/tenant/{tenantId}/gateway/heartbeat`

**QoS**: 0

**Interval**: Every 10 seconds

**Payload** (JSON):

```json
{
  "gatewayId": "gateway-001",
  "connectedReaders": 18,
  "subscribedTopics": 20,
  "messagesProcessed": 125000,
  "messagesPerSecond": 45.2,
  "queueDepth": 12,
  "uptime": 86400,
  "timestamp": "2026-04-19T10:30:00.000Z"
}
```

---

## 5. System Topics

### 5.1 Broadcast

**Topic**: `rfid/system/broadcast`

**QoS**: 1

**Payload** (JSON):

```json
{
  "type": "MAINTENANCE",
  "message": "Scheduled maintenance in 5 minutes",
  "severity": "WARNING",
  "timestamp": "2026-04-19T10:30:00.000Z"
}
```

---

## 6. Phase 2: Access Events (Reserved)

### 6.1 Access Card Events

**Topic**: `access/tenant/{tenantId}/events`

**Payload** (JSON):

```json
{
  "cardId": "HID-12345678",
  "cardType": "HID_ICLASS",
  "userId": "uuid",
  "zoneId": "uuid",
  "accessPoint": "Door EVD-A",
  "granted": true,
  "timestamp": "2026-04-19T10:30:00.000Z"
}
```

**Note**: Reserved for Phase 2 HID/iClass integration.

---

## 7. MQTT Client Configuration

### 7.1 Reader Client (FX9600)

```
Broker:         mqtt://mosquitto:1883
Client ID:      FX9600-{serialNumber}
Clean Session:  false
Keep Alive:     60 seconds
Will Topic:     rfid/tenant/{tenantId}/readers/{readerId}/status
Will Payload:   {"status": "OFFLINE", "timestamp": "..."}
Will Retain:    true
Will QoS:       1
```

### 7.2 Gateway Subscriber

```
Broker:         mqtt://mosquitto:1883
Client ID:      rfid-gateway-{env}
Clean Session:  true
Keep Alive:     30 seconds

Subscribe:
  - rfid/+/readers/+/tags      QoS 1
  - rfid/+/readers/+/status    QoS 1
```

---

## 8. Message Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MQTT MESSAGE FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

   FX9600 Reader                    Mosquitto                  Gateway
        │                              │                          │
        │ ── CONNECT ─────────────────▶│                          │
        │ ◀── CONNACK ─────────────────│                          │
        │                              │                          │
        │                              │◀── SUBSCRIBE ────────────│
        │                              │    rfid/+/readers/+/tags │
        │                              │                          │
        │ ── PUBLISH ─────────────────▶│                          │
        │    rfid/.../tags             │ ── PUBLISH ─────────────▶│
        │    {"epc":"E280..."}         │    rfid/.../tags         │
        │                              │    {"epc":"E280..."}     │
        │                              │                          │
        │                              │                          │ Process
        │                              │                          │ tag read
        │                              │                          │
        │ ◀── PUBLISH ─────────────────│                          │
        │    rfid/.../config           │◀── PUBLISH ──────────────│
        │    {"command":"..."}         │    rfid/.../config       │
        │                              │    {"command":"..."}     │
        │                              │                          │
```

---

## 9. Security

### 9.1 Authentication

- Username/password authentication via Mosquitto ACL
- Each reader has unique credentials provisioned at deployment
- Gateway uses service account credentials

### 9.2 Authorization (ACL)

```
# Reader can only publish to its own topics
user reader-FX9600-001
topic readwrite rfid/tenant/+/readers/reader-001/#

# Gateway can subscribe to all reader topics
user rfid-gateway
topic read rfid/#
topic write rfid/+/readers/+/config
```

### 9.3 TLS (Production)

```
# mosquitto.conf
listener 8883
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
require_certificate false
```

---

## 10. Deployment Model Notes

### 10.1 UUID vs Serial Number Topic Naming

**Current Design**: Topics use database UUIDs (`rfid/tenant/{tenantId}/readers/{readerId}/...`).

**Implication**: Readers must be registered in the database BEFORE MQTT credentials can be provisioned. The provisioning workflow is:

1. Installer registers reader in admin UI (creates database record with UUID)
2. System generates MQTT credentials for that UUID
3. Installer configures reader with credentials and topic paths
4. Reader connects to Mosquitto

**Works for pilot**: Installers register and provision readers during a single site visit. No pre-flashing required.

**Future consideration**: If rollouts require **pre-flashed readers shipped to customer sites** (before database registration), migrate to serial-number-based topics:

```
# Future alternative (not implemented)
rfid/tenant/{tenantId}/readers/serial/{serialNumber}/tags
```

This would allow readers to be configured at the factory with static topic paths, then "claimed" into a tenant's database after installation. **Not needed for v1 pilot; document decision for future-you.**

---

## 11. Monitoring

### 11.1 $SYS Topics

Monitor broker health via Mosquitto $SYS topics:

```
$SYS/broker/clients/connected      # Connected clients
$SYS/broker/messages/received      # Total messages received
$SYS/broker/messages/sent          # Total messages sent
$SYS/broker/load/messages/received/1min  # Load average
```

---

## Document History

| Version | Date       | Author | Changes               |
| ------- | ---------- | ------ | --------------------- |
| 1.0     | 2026-04-19 | Claude | Initial MQTT contract |
