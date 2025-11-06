# Large Lab Deployment Plan (800m²)
## SAPS Forensic Laboratory RFID Tracking System

---

## Executive Summary

**Lab Size:** 800m² (8,600 sq ft)
**Coverage Target:** 100% complete tracking
**Expected Dockets:** 1,000-10,000+ evidence items
**Investment:** $25,000-35,000 (hardware + tags)
**Savings vs. MotionWorks:** $15,000+ (MotionWorks costs $50k for software alone)

---

## Equipment List & Specifications

### **Core RFID Infrastructure**

#### **1. Fixed RFID Readers (3× Units)**

| Item | Model | Qty | Unit Price | Total | Notes |
|------|-------|-----|------------|-------|-------|
| **8-Port RFID Reader** | Zebra FX9600 | 3 | $4,500 | **$13,500** | Primary coverage |
| **Reader Power Supply** | Included | 3 | Included | Included | PoE or AC adapter |
| **Ethernet Cables** | Cat6, 15m | 3 | $25 | $75 | Network connection |

**Total Readers:** **$13,575**

**Reader Placement:**
- **Reader 1 (FX9600-01):** Main evidence processing area (192.168.1.100)
- **Reader 2 (FX9600-02):** Storage/vault area (192.168.1.101)
- **Reader 3 (FX9600-03):** Receiving/shipping + examination rooms (192.168.1.102)

---

#### **2. RFID Antennas (24× Mixed Types)**

| Antenna Type | Model | Qty | Unit Price | Total | Use Case |
|--------------|-------|-----|------------|-------|----------|
| **Wide Coverage** | Zebra AN720 | 12 | $200 | **$2,400** | General area coverage |
| **Portal/Doorway** | Zebra AN620 | 6 | $250 | **$1,500** | Entry/exit points |
| **Long Range** | Zebra AN440 | 4 | $300 | **$1,200** | Corridors/large rooms |
| **Near Metal** | Zebra AN480 | 2 | $275 | **$550** | Metal shelving areas |

**Total Antennas:** **$5,650**

**Antenna Allocation:**
- **FX9600-01:** 8 antennas (4× AN720, 2× AN620, 2× AN440)
- **FX9600-02:** 8 antennas (4× AN720, 2× AN620, 1× AN440, 1× AN480)
- **FX9600-03:** 8 antennas (4× AN720, 2× AN620, 1× AN440, 1× AN480)

---

#### **3. RF Cabling**

| Item | Specification | Qty | Unit Price | Total | Notes |
|------|--------------|-----|------------|-------|-------|
| **Low-Loss Coax** | LMR-400, 5m | 12 | $35 | $420 | Short runs |
| **Low-Loss Coax** | LMR-400, 10m | 8 | $60 | $480 | Medium runs |
| **Low-Loss Coax** | LMR-400, 15m | 4 | $85 | $340 | Long runs |
| **RF Connectors** | N-Type, 50Ω | 48 | $5 | $240 | Spares included |

**Total Cabling:** **$1,480**

---

#### **4. Handheld RFID Scanners (4× Units)**

| Item | Model | Qty | Unit Price | Total | Notes |
|------|-------|-----|------------|-------|-------|
| **Handheld Scanner** | Zebra MC3390R | 4 | $3,200 | **$12,800** | Mobile inventory |
| **Charging Cradles** | 4-slot cradle | 2 | $400 | $800 | Charge 8 devices |
| **Spare Batteries** | Extended capacity | 8 | $120 | $960 | 2 per device |

**Total Handhelds:** **$14,560**

---

#### **5. RFID Tags (Initial Stock)**

| Tag Type | Model | Qty | Unit Price | Total | Notes |
|----------|-------|-----|------------|-------|-------|
| **Standard UHF** | Alien Higgs-3 | 5,000 | $0.25 | $1,250 | Bulk evidence |
| **Durable Metal** | Impinj Monza R6-P | 2,000 | $0.40 | $800 | Metal items |
| **Premium High-Perf** | NXP UCODE 8 | 1,000 | $0.50 | $500 | Critical evidence |

**Total Tags (8,000):** **$2,550**

**Tag Application:**
- Print lab number + CAS number as QR code
- Attach RFID tag with adhesive backing
- Scan QR code to register RFID tag in system

---

#### **6. Optional: Antenna Multiplexer**

| Item | Model | Qty | Unit Price | Total | Notes |
|------|-------|-----|------------|-------|-------|
| **Multiplexer** | Zebra RD5000 | 1 | $1,800 | **$1,800** | 8:1 antenna expansion |

**Use Case:** If you need **MORE than 24 zones** (e.g., 40+ zones)

---

#### **7. Mounting Hardware**

| Item | Specification | Qty | Unit Price | Total | Notes |
|------|--------------|-----|------------|-------|-------|
| **Antenna Brackets** | Ceiling/wall mount | 24 | $15 | $360 | Adjustable angle |
| **Reader Enclosures** | IP65 rated | 3 | $80 | $240 | Dust/moisture protection |
| **Cable Management** | Conduit, ties, clips | 1 lot | $200 | $200 | Professional install |

**Total Mounting:** **$800**

---

### **TOTAL HARDWARE COST**

| Category | Subtotal |
|----------|----------|
| RFID Readers (3× FX9600) | $13,575 |
| Antennas (24× mixed) | $5,650 |
| RF Cabling | $1,480 |
| Handheld Scanners (4×) | $14,560 |
| RFID Tags (8,000) | $2,550 |
| Mounting Hardware | $800 |
| **Subtotal** | **$38,615** |
| **Optional Multiplexer** | $1,800 |
| **TOTAL** | **$40,415** |

**Recommended Budget:** **$35,000-40,000** (includes contingency)

---

## Backend Server Infrastructure

### **Server Requirements**

For 800m² lab with 3 readers and 10,000+ dockets:

| Component | Specification | Estimated Cost |
|-----------|--------------|----------------|
| **Server Hardware** | Dell PowerEdge R250 or similar | $2,500-3,500 |
| **CPU** | Intel Xeon 4-core, 3.0 GHz+ | Included |
| **RAM** | 32 GB DDR4 | Included |
| **Storage** | 2× 1TB SSD (RAID 1) | Included |
| **Network** | Dual Gigabit Ethernet | Included |
| **UPS** | 1500VA with 20min runtime | $300-500 |

**Alternative:** Use existing server or cloud VPS ($50-100/month)

### **Network Infrastructure**

| Component | Specification | Qty | Cost |
|-----------|--------------|-----|------|
| **Network Switch** | 24-port Gigabit, managed | 1 | $300-500 |
| **Network Cables** | Cat6, various lengths | 1 lot | $200 |
| **WiFi Access Points** | Enterprise-grade (for handhelds) | 2-3 | $200-300 each |

**Total Network:** **$1,000-1,500**

### **Software (FREE - Open Source)**

| Component | License | Cost |
|-----------|---------|------|
| **SAPS RFID Platform Backend** | Open Source | **FREE** |
| **PostgreSQL + TimescaleDB** | Open Source | **FREE** |
| **Frontend Dashboard** | Open Source | **FREE** |
| **Node.js Runtime** | Open Source | **FREE** |

**Compare to:** Zebra MotionWorks ($50,000+)
**Savings:** **$50,000**

---

## Lab Layout Design

### **Recommended Zones & Coverage**

```
┌─────────────────────────────────────────────────────────────────┐
│                  SAPS Forensic Lab (800m²)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Receiving   │  │  Processing  │  │   Storage    │          │
│  │   Area       │  │    Area      │  │    Vault     │          │
│  │              │  │              │  │              │          │
│  │  AN720 (x2)  │  │  AN720 (x4)  │  │  AN720 (x4)  │          │
│  │  AN620 (x2)  │  │  AN440 (x2)  │  │  AN620 (x2)  │          │
│  │              │  │              │  │  AN480 (x1)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         │    FX9600-03    │    FX9600-01    │    FX9600-02     │
│         │  192.168.1.102  │  192.168.1.100  │  192.168.1.101   │
│         └─────────────────┴─────────────────┘                   │
│                           │                                     │
│  ┌──────────────┐  ┌──────▼──────┐  ┌──────────────┐          │
│  │ Examination  │  │   Network   │  │   Archive    │          │
│  │    Rooms     │  │   Switch    │  │   Storage    │          │
│  │              │  │   Server    │  │              │          │
│  │  AN720 (x2)  │  └─────────────┘  │  AN440 (x1)  │          │
│  │  AN440 (x1)  │                   │  AN480 (x1)  │          │
│  └──────────────┘                   └──────────────┘          │
│                                                                  │
│  Coverage: 100% of lab space                                   │
│  Dead zones: None (overlapping antenna coverage)               │
│  Portal zones: 3 (Receiving, Vault, Archive)                   │
└─────────────────────────────────────────────────────────────────┘
```

### **Zone Breakdown**

| Zone | Area (m²) | Antennas | Reader | Purpose |
|------|----------|----------|--------|---------|
| **Receiving** | 100 | 4 (2×AN720, 2×AN620 portal) | FX9600-03 | Evidence intake |
| **Processing** | 250 | 6 (4×AN720, 2×AN440) | FX9600-01 | Main work area |
| **Storage Vault** | 200 | 7 (4×AN720, 2×AN620, 1×AN480) | FX9600-02 | Secure storage |
| **Examination** | 150 | 3 (2×AN720, 1×AN440) | FX9600-03 | Analysis labs |
| **Archive** | 100 | 2 (1×AN440, 1×AN480) | FX9600-02 | Long-term storage |

**Total Coverage:** 800m²
**Overlap Zones:** 15-20% (intentional for redundancy)

---

## Installation Plan

### **Phase 1: Infrastructure Setup (Week 1-2)**

#### **Day 1-3: Network & Server**
- [ ] Install network switch in server room
- [ ] Run Cat6 cables to reader locations
- [ ] Set up server hardware (or configure VPS)
- [ ] Install PostgreSQL + TimescaleDB
- [ ] Configure static IPs for readers
- [ ] Install WiFi access points for handhelds

#### **Day 4-7: Reader Installation**
- [ ] Mount FX9600 readers in designated locations
- [ ] Connect readers to network (PoE or AC power)
- [ ] Configure reader IP addresses:
  - FX9600-01: 192.168.1.100
  - FX9600-02: 192.168.1.101
  - FX9600-03: 192.168.1.102
- [ ] Test network connectivity (ping, telnet port 5084)

### **Phase 2: Antenna Deployment (Week 2-3)**

#### **Day 8-12: Antenna Installation**
- [ ] Mount ceiling/wall brackets
- [ ] Install antennas at optimal heights:
  - Ceiling mount: 2.5-3m high
  - Wall mount: 1.5-2m high
- [ ] Run RF cables (LMR-400) from readers to antennas
- [ ] Label all cables and antennas for troubleshooting
- [ ] Test RF connections (use reader diagnostics)

#### **Day 13-14: Portal Setup**
- [ ] Install AN620 portal antennas at 3 entry/exit points:
  - Receiving area door
  - Vault door
  - Archive room door
- [ ] Adjust antenna alignment for 100% read accuracy
- [ ] Test with sample tags (walk through portal)

### **Phase 3: Backend Configuration (Week 3)**

#### **Day 15-17: Software Setup**
- [ ] Clone SAPS RFID Platform repository
- [ ] Install Node.js 20 LTS
- [ ] Run `npm install` in backend directory
- [ ] Configure `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/saps_rfid
TIMESCALEDB_ENABLED=true

# RFID Readers
RFID_READER_IPS=192.168.1.100,192.168.1.101,192.168.1.102
RFID_READER_PORT=5084
RFID_READ_POWER=25
RFID_SESSION_TIMEOUT=30000
RFID_RECONNECT_DELAY=5000

# Server
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
```

- [ ] Run database migrations:
```bash
npm run db:migrate
```

- [ ] Start backend server:
```bash
npm run start
```

#### **Day 18-19: Reader Connection Test**
- [ ] Start backend with debug logging:
```bash
LOG_LEVEL=debug npm run start
```

- [ ] Verify all 3 readers connect:
```
[LLRP] Connecting to reader 192.168.1.100:5084
[LLRP] Connection established: FX9600-01
[LLRP] ROSpec enabled on FX9600-01
[LLRP] Connecting to reader 192.168.1.101:5084
[LLRP] Connection established: FX9600-02
...
```

- [ ] Check reader status via API:
```bash
curl http://localhost:8080/api/readers
```

### **Phase 4: Tag Registration (Week 4)**

#### **Day 20-21: Tag Preparation**
- [ ] Generate QR code stickers for existing dockets
- [ ] Format: `{"labNumber": "12345/25", "caseNumber": "25/34/25"}`
- [ ] Print QR codes on adhesive labels
- [ ] Attach RFID tags to each docket

#### **Day 22-24: Bulk Registration**
- [ ] Use bulk import feature to register tags
- [ ] Scan QR code → extracts lab/CAS number
- [ ] Scan RFID tag → links tag to docket
- [ ] Repeat for all existing evidence

**Estimated Rate:** 50-100 dockets per hour (with QR scanner)

### **Phase 5: Testing & Validation (Week 4-5)**

#### **Day 25-27: Coverage Testing**
- [ ] Walk through lab with sample tagged items
- [ ] Verify all zones detect tags
- [ ] Identify any dead spots
- [ ] Adjust antenna angles/power as needed
- [ ] Test portal accuracy (100% read rate goal)

#### **Day 28-30: Operational Testing**
- [ ] Simulate evidence receiving workflow
- [ ] Test real-time location updates
- [ ] Verify WebSocket dashboard updates
- [ ] Test search and retrieval functions
- [ ] Train staff on handheld scanners

---

## Configuration Reference

### **Backend Environment Variables**

```bash
# ===== DATABASE =====
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=saps_rfid
DATABASE_USER=rfid_user
DATABASE_PASSWORD=secure_password_here
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
TIMESCALEDB_ENABLED=true

# ===== RFID READERS =====
# Comma-separated list of reader IPs
RFID_READER_IPS=192.168.1.100,192.168.1.101,192.168.1.102

# LLRP port (default: 5084)
RFID_READER_PORT=5084

# Transmit power in dBm (10-30, recommend 25 for large lab)
RFID_READ_POWER=25

# Session timeout in milliseconds
RFID_SESSION_TIMEOUT=30000

# Reconnection delay in milliseconds
RFID_RECONNECT_DELAY=5000

# ===== SERVER =====
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# ===== WEBSOCKET =====
WEBSOCKET_PORT=8080
WEBSOCKET_PATH=/socket.io

# ===== SECURITY =====
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===== PERFORMANCE =====
MAX_CONCURRENT_READERS=12
TAG_DEDUPLICATION_WINDOW_SECONDS=2
MAX_TAG_CACHE_SIZE=10000
HEALTH_CHECK_INTERVAL_MS=30000
```

### **Network Configuration**

#### **Static IP Assignment**

| Device | IP Address | Hostname | Notes |
|--------|-----------|----------|-------|
| **Server** | 192.168.1.10 | saps-server | Backend application |
| **FX9600-01** | 192.168.1.100 | fx9600-processing | Main processing area |
| **FX9600-02** | 192.168.1.101 | fx9600-storage | Storage/vault area |
| **FX9600-03** | 192.168.1.102 | fx9600-receiving | Receiving/exam area |
| **Network Switch** | 192.168.1.1 | switch-main | Gigabit switch |

#### **Firewall Rules**

```bash
# Allow LLRP traffic (TCP port 5084)
sudo ufw allow 5084/tcp

# Allow HTTP API (TCP port 8080)
sudo ufw allow 8080/tcp

# Allow PostgreSQL (local only)
sudo ufw allow from 127.0.0.1 to any port 5432

# Allow SSH (administration)
sudo ufw allow 22/tcp
```

---

## Maintenance & Monitoring

### **Daily Health Checks**

```bash
# Check reader connectivity
curl http://localhost:8080/api/readers

# Check system stats
curl http://localhost:8080/api/health

# View recent tag reads
curl http://localhost:8080/api/rfid/recent?limit=10
```

### **Weekly Maintenance**

- [ ] Check reader status (all online?)
- [ ] Review tag read rates (any anomalies?)
- [ ] Check database size (disk space ok?)
- [ ] Review logs for errors
- [ ] Test backup/restore procedures

### **Monthly Tasks**

- [ ] Clean antenna connections
- [ ] Check RF cable integrity
- [ ] Update backend software (if available)
- [ ] Review coverage gaps (add antennas if needed)
- [ ] Inventory RFID tags (order more if low)

---

## Performance Expectations

### **System Capabilities**

| Metric | Expected Performance |
|--------|---------------------|
| **Concurrent Tag Reads** | 100+ tags/second |
| **Reader Uptime** | 99.9% (with auto-reconnect) |
| **Tag Detection Accuracy** | 95-99% (varies by environment) |
| **Portal Read Accuracy** | 99.9% (dual antenna setup) |
| **Location Update Latency** | < 2 seconds (real-time) |
| **Dashboard Refresh Rate** | 1-5 seconds (WebSocket) |
| **Database Query Time** | < 100ms (indexed queries) |
| **Maximum Dockets Tracked** | 100,000+ (scalable) |

### **Expected Coverage**

| Zone | Coverage | Accuracy | Notes |
|------|----------|----------|-------|
| **Receiving** | 100% | 99% | Portal ensures every item detected |
| **Processing** | 98-100% | 95% | High antenna density |
| **Storage Vault** | 100% | 99% | Portal + ceiling coverage |
| **Examination** | 95-98% | 90% | Metal benches may interfere |
| **Archive** | 95-100% | 95% | Long-range antennas |

**Overall Lab Coverage:** **98-100%**

---

## Training Requirements

### **Staff Training (Recommended: 2-day workshop)**

#### **Day 1: System Overview**
- RFID technology basics
- How tags and readers work
- Lab zone mapping
- Safety and handling procedures

#### **Day 2: Hands-On Training**
- Using handheld scanners (MC3390R)
- Registering new evidence via QR + RFID
- Searching for evidence in dashboard
- Handling missing/misplaced items
- Basic troubleshooting

### **Training Materials**

Create custom guides:
- [ ] Quick start guide (1 page)
- [ ] Handheld scanner manual
- [ ] QR code scanning procedure
- [ ] Troubleshooting checklist
- [ ] Video tutorials (5-10 min each)

---

## ROI Analysis

### **Cost Comparison**

| Solution | Hardware | Software | Total 5-Year Cost |
|----------|----------|----------|-------------------|
| **Zebra MotionWorks** | $35,000 | $50,000 + $10k/yr | **$100,000+** |
| **SAPS RFID Platform** | $40,000 | **FREE** | **$40,000** |

**Total Savings:** **$60,000 over 5 years**

### **Additional Benefits**

| Benefit | Annual Value |
|---------|--------------|
| **Time Savings** (faster evidence location) | $15,000-20,000 |
| **Reduced Loss** (fewer missing items) | $10,000-15,000 |
| **Audit Compliance** (automated chain of custody) | $5,000-10,000 |
| **Improved Throughput** (faster processing) | $20,000-30,000 |

**Total Annual Benefit:** **$50,000-75,000**
**Payback Period:** **6-8 months**

---

## Next Steps

### **Immediate Actions**

1. **Budget Approval** - Get $40,000 approved
2. **Vendor Quotes** - Request quotes from Zebra distributors
3. **Network Survey** - Assess existing network infrastructure
4. **Team Assembly** - Assign project lead + 2-3 technical staff

### **Procurement Timeline**

| Week | Action |
|------|--------|
| Week 1 | Finalize equipment list, get quotes |
| Week 2 | Purchase orders submitted |
| Week 3-4 | Equipment delivery |
| Week 5-8 | Installation (see Phase 1-5 above) |
| Week 9 | Go-live + training |
| Week 10+ | Full production operations |

### **Recommended Vendors**

- **Zebra Technologies** - Direct or authorized reseller
- **Barcodes Inc.** - Zebra distributor
- **ScanSource** - Large distributor
- **Local IT VAR** - For installation services

---

## Support & Contact

### **Technical Support**

**SAPS RFID Platform (Backend):**
- GitHub: [Your repo link]
- Documentation: See `/docs` folder
- Community: [Forum/Slack link]

**Zebra Hardware:**
- Zebra Support Portal: https://www.zebra.com/support
- Phone: [Regional support number]
- Chat: Available on Zebra website

### **Emergency Contacts**

Keep a list of:
- [ ] IT Department contact
- [ ] Zebra technical support
- [ ] Network administrator
- [ ] Server administrator
- [ ] Project lead

---

## Conclusion

This deployment plan provides a **complete roadmap** for implementing a **professional-grade RFID tracking system** in your 800m² forensic laboratory.

### **Key Highlights:**

✅ **100% Coverage** - Every zone monitored
✅ **Real-time Tracking** - Sub-2-second location updates
✅ **Cost-Effective** - $40k vs. $100k for commercial solution
✅ **Scalable** - Easily add more readers/antennas
✅ **Open Source** - No vendor lock-in, fully customizable

**Your system will be production-ready in 8-10 weeks!** 🚀

---

## Appendix

### **A. Equipment Suppliers**

**Zebra Authorized Distributors:**
- ScanSource: https://www.scansource.com
- Barcodes Inc: https://www.barcodesinc.com
- POS Portal: https://www.posportal.com

**RFID Tag Suppliers:**
- Alien Technology: https://www.alientechnology.com
- Impinj: https://www.impinj.com
- Avery Dennison: https://rfid.averydennison.com

### **B. Installation Service Providers**

Consider hiring certified installers for:
- Antenna mounting and alignment
- RF cable installation
- Network infrastructure
- System integration

**Estimated Professional Installation Cost:** $5,000-8,000

### **C. Warranty & Support**

**Hardware Warranties:**
- Zebra readers: 3-year standard warranty
- Antennas: 1-year warranty
- Handheld scanners: 1-year, extendable to 5 years

**Extended Support Options:**
- Zebra OneCare: $500-1,000/year per device
- 24/7 technical support
- Advanced replacement service

---

**Document Version:** 1.0
**Last Updated:** 2025-10-06
**Author:** SAPS RFID Platform Team
