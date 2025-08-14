# 📋 On-Site Production Rollout Plan
## **Step-by-Step Implementation Guide for Government Data Center**

---

## 📅 Implementation Timeline Overview

```
Week 1-2:   Infrastructure Setup & Server Installation
Week 3-4:   Software Deployment & Configuration  
Week 5-6:   RFID Hardware Installation & Integration
Week 7-8:   Testing & Security Hardening
Week 9-10:  Data Migration & Training
Week 11-12: Go-Live & Handover
```

---

## 🚀 PHASE 1: PRE-DEPLOYMENT (2 Weeks Before)

### **Week -2: Site Preparation**

#### **Checklist:**
- [ ] **Data Center Requirements**
  ```
  □ Server room with A/C (18-22°C)
  □ 30kVA UPS minimum
  □ Network cabling (CAT6A)
  □ Power outlets (32A circuits)
  □ Physical security (biometric access)
  □ Fire suppression system
  ```

- [ ] **Network Requirements**
  ```
  □ 1Gbps internet connection
  □ Static IP addresses (minimum 5)
  □ Firewall configured
  □ VPN access setup
  □ VLAN segmentation ready
  ```

- [ ] **Hardware Procurement**
  ```
  □ 4x Dell PowerEdge R650 servers
  □ 1x Storage array (10TB minimum)
  □ 2x 48-port managed switches
  □ 8x Zebra FX7500 RFID readers
  □ 32x RFID antennas
  □ 700,000 RFID tags
  ```

### **Week -1: Team Preparation**

```yaml
Team Requirements:
  Project Manager: 1
  System Administrator: 2
  Network Engineer: 1
  Database Administrator: 1
  RFID Specialist: 1
  Security Engineer: 1
  Application Developer: 2
```

---

## 📦 PHASE 2: INFRASTRUCTURE DEPLOYMENT (Week 1-2)

### **Week 1: Hardware Installation**

#### **Day 1-2: Server Rack Setup**
```bash
# Physical Installation Checklist
1. Mount servers in rack (U positions 10-20)
2. Install PDUs and connect power
3. Connect network cables to switches
4. Label all cables and ports
5. Connect to UPS systems
6. Verify cooling and airflow
```

#### **Day 3-4: OS Installation**
```bash
# Install Ubuntu Server 22.04 LTS on all servers
sudo apt update && sudo apt upgrade -y

# Configure hostname for each server
sudo hostnamectl set-hostname rfid-prod-01
sudo hostnamectl set-hostname rfid-prod-02
sudo hostnamectl set-hostname rfid-db-01
sudo hostnamectl set-hostname rfid-db-02

# Configure network interfaces
sudo nano /etc/netplan/01-netcfg.yaml
```

#### **Day 5: Storage Configuration**
```bash
# Setup RAID configuration
sudo mdadm --create /dev/md0 --level=10 --raid-devices=4 /dev/sd[b-e]

# Create LVM volumes
sudo pvcreate /dev/md0
sudo vgcreate data_vg /dev/md0
sudo lvcreate -L 500G -n postgresql_lv data_vg
sudo lvcreate -L 200G -n backup_lv data_vg

# Format and mount
sudo mkfs.ext4 /dev/data_vg/postgresql_lv
sudo mount /dev/data_vg/postgresql_lv /var/lib/postgresql
```

### **Week 2: Kubernetes Cluster Setup**

#### **Day 1-2: Kubernetes Installation**
```bash
# Install Docker on all nodes
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Kubernetes
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt update
sudo apt install -y kubelet kubeadm kubectl

# Initialize master node
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.1.10

# Install Flannel network
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

#### **Day 3-4: Database Cluster Setup**
```sql
-- Install PostgreSQL 15
sudo apt install postgresql-15 postgresql-15-replication

-- Configure master database
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET wal_keep_segments = 64;
ALTER SYSTEM SET hot_standby = on;

-- Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'SecurePass123!';

-- Setup streaming replication to standby
pg_basebackup -h 192.168.1.20 -D /var/lib/postgresql/15/main -U replicator -v -P -W
```

#### **Day 5: Load Balancer & Monitoring**
```bash
# Install HAProxy
sudo apt install haproxy

# Configure HAProxy for Kubernetes API
cat >> /etc/haproxy/haproxy.cfg << EOF
frontend kubernetes-api
    bind *:6443
    mode tcp
    option tcplog
    default_backend kubernetes-masters

backend kubernetes-masters
    mode tcp
    balance roundrobin
    server master1 192.168.1.10:6443 check
    server master2 192.168.1.11:6443 check
    server master3 192.168.1.12:6443 check
EOF

# Install Prometheus & Grafana
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

---

## 💻 PHASE 3: APPLICATION DEPLOYMENT (Week 3-4)

### **Week 3: Core Application Setup**

#### **Day 1-2: Deploy Application**
```yaml
# deploy-application.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rfid-production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rfid-api
  namespace: rfid-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rfid-api
  template:
    metadata:
      labels:
        app: rfid-api
    spec:
      containers:
      - name: rfid-api
        image: localhost:5000/rfid-api:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          value: "192.168.1.20"
        - name: DB_NAME
          value: "rfid_evidence"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

#### **Day 3-4: Database Migration**
```bash
# Create database and schema
psql -U postgres << EOF
CREATE DATABASE rfid_evidence;
\c rfid_evidence;

CREATE TABLE evidence (
    id BIGSERIAL PRIMARY KEY,
    evidence_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    rfid_tag_id VARCHAR(50) UNIQUE,
    current_location_id INTEGER,
    chain_of_custody JSONB,
    iso17025_compliant BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evidence_rfid ON evidence(rfid_tag_id);
CREATE INDEX idx_evidence_location ON evidence(current_location_id);
CREATE INDEX idx_evidence_created ON evidence(created_at DESC);
EOF

# Run migrations
npm run migrate:production
```

#### **Day 5: Redis & Caching Setup**
```bash
# Install Redis cluster
sudo apt install redis-server redis-sentinel

# Configure Redis for production
cat > /etc/redis/redis.conf << EOF
bind 192.168.1.30
protected-mode yes
port 6379
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
EOF

sudo systemctl restart redis-server
```

### **Week 4: Integration & Configuration**

#### **Day 1-2: RFID Integration**
```javascript
// rfid-config.js
const FX7500_READERS = [
  { id: 'RECEPTION-01', ip: '192.168.2.10', location: 'Main Entry' },
  { id: 'RECEPTION-02', ip: '192.168.2.11', location: 'Main Entry' },
  { id: 'LAB-01', ip: '192.168.2.20', location: 'Laboratory 1' },
  { id: 'LAB-02', ip: '192.168.2.21', location: 'Laboratory 2' },
  { id: 'STORAGE-01', ip: '192.168.2.30', location: 'Evidence Storage' },
  { id: 'STORAGE-02', ip: '192.168.2.31', location: 'Evidence Storage' },
  { id: 'COURT-01', ip: '192.168.2.40', location: 'Court Prep' },
  { id: 'DISPOSAL-01', ip: '192.168.2.50', location: 'Disposal Area' }
];

// Initialize readers
READERS.forEach(reader => {
  connectToReader(reader.ip, reader.id);
  configureAntennas(reader.id, ANTENNA_CONFIG);
  startInventory(reader.id);
});
```

#### **Day 3-4: Security Configuration**
```bash
# Configure firewall rules
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 6443/tcp comment 'Kubernetes API'
sudo ufw allow 10250/tcp comment 'Kubelet'
sudo ufw allow 5432/tcp from 192.168.1.0/24 comment 'PostgreSQL'
sudo ufw allow 6379/tcp from 192.168.1.0/24 comment 'Redis'
sudo ufw enable

# Setup SSL certificates
sudo certbot certonly --standalone -d rfid.gov.za
kubectl create secret tls rfid-tls \
  --cert=/etc/letsencrypt/live/rfid.gov.za/fullchain.pem \
  --key=/etc/letsencrypt/live/rfid.gov.za/privkey.pem
```

#### **Day 5: Backup Configuration**
```bash
#!/bin/bash
# backup-script.sh

# Database backup
BACKUP_DIR="/backup/postgresql/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

pg_dump -h 192.168.1.20 -U postgres rfid_evidence | \
  gzip > $BACKUP_DIR/rfid_evidence_$(date +%H%M%S).sql.gz

# Application backup
kubectl get all --all-namespaces -o yaml > $BACKUP_DIR/k8s_resources.yaml

# RFID configuration backup
tar -czf $BACKUP_DIR/rfid_config.tar.gz /etc/rfid/

# Sync to backup server
rsync -avz /backup/ backup-server:/backup/

# Cleanup old backups (keep 30 days)
find /backup -type f -mtime +30 -delete
```

---

## 📡 PHASE 4: RFID HARDWARE (Week 5-6)

### **Week 5: Reader Installation**

#### **Physical Installation Plan**
```
LOCATION MAP:
┌──────────────────────────────────────────┐
│                                          │
│  RECEPTION        LAB 1         LAB 2    │
│  [R1] [R2]       [R3][R4]      [R5][R6]  │
│                                          │
│  ┌────────────┐  ┌──────────────────┐   │
│  │            │  │                  │   │
│  │  STORAGE   │  │  COURT PREP     │   │
│  │  [R7][R8]  │  │     [R9]        │   │
│  │            │  │                  │   │
│  └────────────┘  └──────────────────┘   │
│                                          │
│              DISPOSAL [R10]              │
└──────────────────────────────────────────┘

R = RFID Reader Position
```

#### **Reader Configuration**
```bash
# Configure each FX7500 reader
curl -X POST http://192.168.2.10/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{
    "power": 20,
    "session": 2,
    "antennas": [
      {"port": 1, "enabled": true, "power": 20},
      {"port": 2, "enabled": true, "power": 20},
      {"port": 3, "enabled": false},
      {"port": 4, "enabled": false}
    ],
    "reporting": {
      "interval": 1000,
      "includeAntennaPort": true,
      "includeRSSI": true,
      "includeTimestamp": true
    }
  }'
```

### **Week 6: Testing & Optimization**

#### **Day 1-3: RFID Performance Testing**
```javascript
// rfid-test.js
async function testRFIDPerformance() {
  const testResults = {
    readRate: 0,
    accuracy: 0,
    coverage: [],
    issues: []
  };
  
  // Test 1: Read rate
  const tags = await readTagsForDuration(60000); // 1 minute
  testResults.readRate = tags.length / 60; // tags per second
  
  // Test 2: Accuracy
  const knownTags = ['E200001234567890', 'E200001234567891'];
  const readTags = await readSpecificTags(knownTags);
  testResults.accuracy = (readTags.length / knownTags.length) * 100;
  
  // Test 3: Coverage
  for (let zone of ZONES) {
    const coverage = await testZoneCoverage(zone);
    testResults.coverage.push({zone, coverage});
  }
  
  return testResults;
}
```

#### **Day 4-5: System Integration Testing**
```bash
# Integration test checklist
echo "Starting integration tests..."

# 1. API Health Check
curl -f http://localhost:3000/health || exit 1

# 2. Database Connectivity
psql -h 192.168.1.20 -U postgres -c "SELECT 1" || exit 1

# 3. Redis Cache
redis-cli -h 192.168.1.30 ping || exit 1

# 4. RFID Readers
for reader in 192.168.2.{10..50}; do
  ping -c 1 $reader || echo "Reader $reader offline"
done

# 5. End-to-end test
./e2e-test.sh

echo "Integration tests completed!"
```

---

## 📚 PHASE 5: DATA MIGRATION (Week 7-8)

### **Week 7: Bulk Data Import**

#### **Tag Assignment Process**
```python
# bulk-tagging.py
import csv
import psycopg2
from datetime import datetime

def assign_tags_to_dockets():
    conn = psycopg2.connect(
        host="192.168.1.20",
        database="rfid_evidence",
        user="postgres",
        password="secure_password"
    )
    cur = conn.cursor()
    
    with open('docket_tag_mapping.csv', 'r') as file:
        csv_reader = csv.reader(file)
        next(csv_reader)  # Skip header
        
        batch = []
        for row in csv_reader:
            docket_id, tag_id = row
            batch.append((docket_id, tag_id, datetime.now()))
            
            if len(batch) >= 1000:
                cur.executemany(
                    """INSERT INTO evidence (evidence_code, rfid_tag_id, created_at)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (evidence_code) 
                       DO UPDATE SET rfid_tag_id = EXCLUDED.rfid_tag_id""",
                    batch
                )
                conn.commit()
                batch = []
                print(f"Processed {cur.rowcount} records")
        
        # Process remaining records
        if batch:
            cur.executemany(
                """INSERT INTO evidence (evidence_code, rfid_tag_id, created_at)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (evidence_code) 
                   DO UPDATE SET rfid_tag_id = EXCLUDED.rfid_tag_id""",
                batch
            )
            conn.commit()
    
    cur.close()
    conn.close()
    print("Tag assignment completed!")

if __name__ == "__main__":
    assign_tags_to_dockets()
```

### **Week 8: Physical Tagging**

#### **Tagging Schedule**
```
Day 1-2: Reception Area (50,000 items)
Day 3-4: Laboratory 1 (100,000 items)
Day 5-6: Laboratory 2 (100,000 items)
Day 7-8: Storage Facility (300,000 items)
Day 9-10: Court Preparation (150,000 items)

Total: 700,000 items
Team Size: 10 people
Rate: 70,000 items/day
```

---

## ✅ PHASE 6: GO-LIVE (Week 9-10)

### **Week 9: User Training**

#### **Training Schedule**
```yaml
Monday - System Administrators:
  - Server management
  - Backup procedures
  - Monitoring tools
  - Troubleshooting

Tuesday - RFID Operators:
  - Reader operation
  - Tag management
  - Troubleshooting
  - Zone configuration

Wednesday - End Users:
  - System login
  - Evidence search
  - Report generation
  - Chain of custody

Thursday - Management:
  - Dashboard overview
  - Reports and analytics
  - Compliance features
  - Audit trails

Friday - Hands-on Practice:
  - Simulated scenarios
  - Q&A session
  - Final assessment
```

### **Week 10: Production Cutover**

#### **Go-Live Checklist**
```bash
#!/bin/bash
# go-live-checklist.sh

echo "GO-LIVE CHECKLIST - $(date)"
echo "================================"

# System checks
check_item() {
    if eval "$2"; then
        echo "✅ $1"
    else
        echo "❌ $1 - FAILED"
        exit 1
    fi
}

check_item "Database accessible" "psql -h 192.168.1.20 -c 'SELECT 1' > /dev/null 2>&1"
check_item "API responding" "curl -f http://localhost:3000/health > /dev/null 2>&1"
check_item "All RFID readers online" "[ $(ping_readers | grep -c 'online') -eq 8 ]"
check_item "Backup system operational" "test -f /backup/$(date +%Y%m%d)/test.txt"
check_item "SSL certificate valid" "openssl s_client -connect rfid.gov.za:443 < /dev/null 2>&1 | grep -q 'Verify return code: 0'"
check_item "Monitoring active" "curl -f http://localhost:3000/metrics > /dev/null 2>&1"
check_item "All users created" "[ $(psql -h 192.168.1.20 -c 'SELECT COUNT(*) FROM users' -t) -gt 50 ]"
check_item "Documentation complete" "test -f /docs/user_manual.pdf"

echo "================================"
echo "✅ SYSTEM READY FOR GO-LIVE!"
```

---

## 📊 Post-Deployment (Week 11-12)

### **Week 11: Monitoring & Optimization**

#### **Performance Monitoring**
```yaml
Key Metrics to Monitor:
  - API response time: < 100ms
  - Database query time: < 50ms  
  - RFID read rate: > 500 tags/sec
  - System uptime: > 99.9%
  - Error rate: < 0.1%
  - User sessions: Track active users
  - Data growth: Monitor storage usage
```

### **Week 12: Handover**

#### **Deliverables Checklist**
- [ ] System documentation
- [ ] User manuals
- [ ] Admin guides
- [ ] Network diagrams
- [ ] Database schemas
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Contact list
- [ ] Warranty information
- [ ] Support contract

---

## 🔧 Support & Maintenance

### **Daily Tasks**
```bash
# Daily health check
0 6 * * * /opt/rfid/scripts/health-check.sh
0 18 * * * /opt/rfid/scripts/health-check.sh

# Backup verification
0 7 * * * /opt/rfid/scripts/verify-backup.sh

# Log rotation
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/rfid
```

### **Weekly Tasks**
- System updates
- Performance review
- Backup restoration test
- Security scan

### **Monthly Tasks**
- Capacity planning
- User access review
- Certificate renewal check
- Disaster recovery drill

---

## 📞 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|--------|
| Project Manager | TBD | +27 XX XXX XXXX | pm@gov.za |
| System Admin | TBD | +27 XX XXX XXXX | admin@gov.za |
| RFID Support | Zebra Tech | +27 11 555 4801 | support@zebra.com |
| Network Support | TBD | +27 XX XXX XXXX | network@gov.za |
| Database Admin | TBD | +27 XX XXX XXXX | dba@gov.za |

---

**This on-site rollout plan ensures a smooth, professional deployment of the RFID Evidence Management System in your government data center.**