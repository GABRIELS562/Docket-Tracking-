# RFID Hardware Setup Guide

## Overview

This guide covers the physical installation and configuration of RFID readers for the SAPS Evidence Tracking Platform.

## Supported Hardware

### Recommended Readers

| Model | Ports | Use Case | Price Range |
|-------|-------|----------|-------------|
| Impinj Speedway R420 | 4 | Zone coverage | $$$$ |
| Impinj Speedway R220 | 2 | Portal/doorway | $$$ |
| Zebra FX9600 | 4 | Industrial | $$$$ |
| ThingMagic M6e | 1 | Embedded | $$ |

### Antenna Options

| Type | Gain | Beam Width | Use Case |
|------|------|------------|----------|
| Circular Polarized | 6 dBi | Wide (60°) | General zones |
| Linear Polarized | 9 dBi | Narrow (30°) | Portals |
| Near-field | 2 dBi | Very wide | Workbench |

### RFID Tags

| Tag Type | Read Range | Use Case |
|----------|------------|----------|
| UHF Gen2 Label | 1-5m | Evidence bags |
| UHF Gen2 Hard Tag | 3-10m | Equipment |
| On-metal Tag | 1-3m | Metal items |

## Network Architecture

```
                    ┌──────────────────────┐
                    │   Platform Server    │
                    │   (Port 8080)        │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │    Network Switch    │
                    │   (VLAN: RFID_NET)   │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────┴─────┐        ┌─────┴─────┐        ┌─────┴─────┐
    │ Reader 1  │        │ Reader 2  │        │ Reader N  │
    │ Zone A    │        │ Zone B    │        │ Zone N    │
    │ 192.168.1.│        │ 192.168.1.│        │ 192.168.1.│
    │    101    │        │    102    │        │    10N    │
    └───────────┘        └───────────┘        └───────────┘
```

## Physical Installation

### Zone Layout (FSL-PAROW Example)

```
┌─────────────────────────────────────────────────────────────┐
│                        FSL-PAROW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
│  │ Evidence    │   │ Processing  │   │ Cold Storage    │   │
│  │ Intake      │   │ Lab         │   │ (-20°C)         │   │
│  │ [R1][R2]    │   │ [R3][R4]    │   │ [R5]            │   │
│  └─────────────┘   └─────────────┘   └─────────────────┘   │
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
│  │ Analysis    │   │ DNA         │   │ Archive         │   │
│  │ Station     │   │ Extraction  │   │ Vault           │   │
│  │ [R6]        │   │ [R7][R8]    │   │ [R9][R10]       │   │
│  └─────────────┘   └─────────────┘   └─────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

[Rx] = Reader with antenna coverage
```

### Antenna Placement Rules

1. **Ceiling mount**: 2.5-3m height for zone coverage
2. **Portal mount**: Reader on each side of doorway
3. **Workbench**: Reader under or beside work surface
4. **Overlap**: 20% coverage overlap between zones
5. **Interference**: Minimum 3m between antennas

### Cable Requirements

| Cable | Max Length | Use |
|-------|------------|-----|
| Ethernet (Cat6) | 100m | Reader to switch |
| Antenna (LMR-240) | 6m | Reader to antenna |
| Antenna (LMR-400) | 15m | Long runs |
| Power (PoE+) | 100m | Via Ethernet |

## Reader Configuration

### IP Address Assignment

Reserve static IPs for all readers:

```
192.168.1.101 - Reader-Zone-A-01
192.168.1.102 - Reader-Zone-A-02
192.168.1.103 - Reader-Zone-B-01
... and so on
```

### LLRP Port

All readers communicate on port **5084** (LLRP default).

### Power Settings

| Environment | TX Power | Notes |
|-------------|----------|-------|
| Small zone (<50m²) | 20 dBm | Reduce interference |
| Standard zone | 25 dBm | Balanced |
| Large zone (>100m²) | 30 dBm | Maximum range |
| Portal | 27 dBm | Focused read |

### Antenna Configuration

```typescript
// Example: 4-port reader configuration
{
  antennas: [
    { port: 1, enabled: true, txPower: 25, rxSensitivity: -70 },
    { port: 2, enabled: true, txPower: 25, rxSensitivity: -70 },
    { port: 3, enabled: true, txPower: 25, rxSensitivity: -70 },
    { port: 4, enabled: true, txPower: 25, rxSensitivity: -70 },
  ],
  inventoryMode: 'continuous',
  reportInterval: 100, // ms
}
```

## Platform Registration

### Step 1: Add Reader to Database

```sql
INSERT INTO readers (
  reader_id,
  tenant_id,
  zone_id,
  reader_name,
  ip_address,
  port,
  reader_model,
  antenna_count,
  status
) VALUES (
  'reader-zone-a-01',
  'tenant-fsl-parow',
  'zone-evidence-intake',
  'Evidence Intake - Reader 01',
  '192.168.1.101',
  5084,
  'Impinj Speedway R420',
  4,
  'offline'
);
```

### Step 2: Configure via API

```bash
curl -X POST http://localhost:8080/api/v1/readers/register \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-fsl-parow" \
  -d '{
    "readerId": "reader-zone-a-01",
    "zoneId": "zone-evidence-intake",
    "readerName": "Evidence Intake - Reader 01",
    "ipAddress": "192.168.1.101",
    "port": 5084,
    "model": "Impinj Speedway R420"
  }'
```

### Step 3: Verify Connection

```bash
# Check reader status
curl http://localhost:8080/api/v1/readers/reader-zone-a-01/health

# Expected response
{
  "readerId": "reader-zone-a-01",
  "status": "online",
  "lastSeen": "2024-01-15T10:30:00Z",
  "readsPerSecond": 45,
  "errorRate": 0.001
}
```

## Troubleshooting

### Reader Not Connecting

1. **Ping test**: `ping 192.168.1.101`
2. **Port test**: `telnet 192.168.1.101 5084`
3. **Firewall**: Ensure port 5084 open
4. **VLAN**: Verify network segmentation

### Low Read Rate

1. **Power**: Increase TX power (max 30 dBm)
2. **Interference**: Check for metal objects, other readers
3. **Tags**: Verify tags are Gen2 compliant
4. **Orientation**: Adjust antenna angle

### Duplicate Reads

1. **Deduplication**: Platform handles automatically
2. **Window**: Default 2-second window
3. **Overlap**: Reduce antenna overlap if excessive

## Maintenance

### Daily Checks

- [ ] All readers showing "online" status
- [ ] No error alerts in dashboard
- [ ] Tag read rates within normal range

### Weekly Checks

- [ ] Review reader health metrics
- [ ] Check for firmware updates
- [ ] Verify antenna connections

### Monthly Checks

- [ ] Physical inspection of hardware
- [ ] Clean antennas if dusty
- [ ] Review and adjust power settings

## Safety Notes

- **RF Exposure**: Keep antennas away from personnel areas when at high power
- **Electrical**: Only use PoE+ certified equipment
- **Environment**: Readers rated for 0-50°C (cold storage requires special housing)

## Support Contacts

- Hardware vendor: [Contact your supplier]
- Platform support: [Internal IT contact]
- Documentation: See `specs/rfid/llrp-protocol.md`
