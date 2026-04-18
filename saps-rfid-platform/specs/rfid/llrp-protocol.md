# LLRP Protocol Specification

## Overview

The Low Level Reader Protocol (LLRP) is used for communication between the SAPS RFID Platform and RFID readers. This document describes the message formats and integration patterns.

## Protocol Basics

| Property | Value |
|----------|-------|
| Protocol | LLRP (EPCglobal standard) |
| Transport | TCP/IP |
| Default Port | 5084 |
| Message Format | Binary TLV |
| Authentication | None (network-level security) |

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   RFID Reader   │──────│   LLRPGateway   │──────│   Application   │
│   (Hardware)    │ LLRP │   (Platform)    │Events│   (Backend)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │
        │                        ├── ReaderConnectionPool
        │                        ├── TagDeduplicator
        │                        ├── TagProcessor
        │                        └── ReaderHealthMonitor
```

## Message Types

### Reader → Platform

| Message | Description |
|---------|-------------|
| `RO_ACCESS_REPORT` | Tag read data with EPC, RSSI, antenna port |
| `READER_EVENT_NOTIFICATION` | Connection status, errors |
| `GET_READER_CONFIG_RESPONSE` | Reader capabilities |
| `GET_READER_CAPABILITIES_RESPONSE` | Hardware details |

### Platform → Reader

| Message | Description |
|---------|-------------|
| `SET_READER_CONFIG` | Configure antennas, power levels |
| `ADD_ROSPEC` | Define read operation specification |
| `ENABLE_ROSPEC` | Start reading |
| `DISABLE_ROSPEC` | Stop reading |
| `DELETE_ROSPEC` | Remove specification |
| `GET_READER_CONFIG` | Query current config |

## Tag Read Data Format

```typescript
interface TagRead {
  epc: string;           // Electronic Product Code (96-256 bits)
  rssi: number;          // Signal strength (-70 to -20 dBm)
  antennaPort: number;   // Antenna that detected tag (1-4)
  timestamp: Date;       // Read timestamp
  readerId: string;      // Reader identifier
  frequency: number;     // Channel frequency (MHz)
  phase: number;         // Phase angle (optional)
  dopplerShift: number;  // Motion detection (optional)
}
```

## EPC Format

The platform uses GS1 EPC Gen2 96-bit format:

```
┌────────┬──────────┬───────────┬─────────────┐
│ Header │ Filter   │ Partition │ Company     │
│ 8 bits │ 3 bits   │ 3 bits    │ 24-40 bits  │
├────────┴──────────┴───────────┼─────────────┤
│                               │ Item Ref    │
│                               │ 24-38 bits  │
└───────────────────────────────┴─────────────┘
```

Example: `E200001234567890ABCDEF01`

## Connection Lifecycle

```
1. CONNECT (TCP handshake)
   ↓
2. GET_READER_CAPABILITIES
   ↓
3. SET_READER_CONFIG (antennas, power)
   ↓
4. ADD_ROSPEC (inventory spec)
   ↓
5. ENABLE_ROSPEC
   ↓
6. [Receive RO_ACCESS_REPORT continuously]
   ↓
7. DISABLE_ROSPEC
   ↓
8. DELETE_ROSPEC
   ↓
9. DISCONNECT
```

## Platform Components

### LLRPGateway

Central manager for all reader connections.

```typescript
interface GatewayConfig {
  maxReaders: number;              // Default: 12
  deduplicationWindowSeconds: number; // Default: 2
  maxCacheSize: number;            // Default: 10000
  healthCheckIntervalMs: number;   // Default: 30000
  metricsIntervalMs: number;       // Default: 10000
  maxReconnectionAttempts: number; // Default: 5
  useCircuitBreaker: boolean;      // Default: true
}
```

### TagDeduplicator

Prevents duplicate tag events within a time window.

```typescript
// Deduplication key format
const key = `${tenantId}:${readerId}:${epc}`;

// Window-based deduplication
// If same tag seen within 2s window, ignore
```

### CircuitBreaker

Prevents cascade failures from unhealthy readers.

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;  // Failures before opening
  successThreshold: number;  // Successes before closing
  timeout: number;           // Time in open state (ms)
}
```

### ReaderHealthMonitor

Monitors reader connectivity and performance.

```typescript
interface ReaderHealth {
  readerId: string;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: Date;
  readsPerSecond: number;
  errorRate: number;
  latencyMs: number;
}
```

## Event Flow

```
1. Reader detects tag
   ↓
2. RO_ACCESS_REPORT sent to platform
   ↓
3. TagProcessor parses LLRP message
   ↓
4. TagDeduplicator filters duplicates
   ↓
5. Domain event emitted (TagDetectedEvent)
   ↓
6. Event bus notifies subscribers
   ↓
7. WebSocket pushes to frontend
```

## Supported Readers

| Manufacturer | Model | Notes |
|--------------|-------|-------|
| Impinj | Speedway R420 | 4-port, recommended |
| Impinj | Speedway R220 | 2-port |
| Zebra | FX9600 | 4-port |
| ThingMagic | M6e | Embedded module |

## Configuration Example

```typescript
// Reader connection configuration
const readerConfig = {
  host: '192.168.1.100',
  port: 5084,
  antennas: [1, 2, 3, 4],
  txPowerDbm: 30,
  inventoryMode: 'continuous',
  reportInterval: 100, // ms
};
```

## Error Handling

| Error Code | Description | Recovery |
|------------|-------------|----------|
| `CONNECTION_REFUSED` | Reader not responding | Retry with backoff |
| `AUTH_FAILED` | Authentication error | Check credentials |
| `READER_BUSY` | Reader in use | Wait and retry |
| `INVALID_CONFIG` | Bad parameters | Validate config |
| `TIMEOUT` | No response | Reconnect |

## Performance Targets

| Metric | Target |
|--------|--------|
| Tags per second | 1000+ |
| Processing latency | <50ms |
| Connection recovery | <5s |
| Deduplication accuracy | 99.9% |

## References

- EPCglobal LLRP Standard: https://www.gs1.org/standards/epc-rfid/llrp
- Impinj LLRP Toolkit: https://github.com/impinj/octane-sdk-java
- Platform code: `src/infrastructure/rfid/`
