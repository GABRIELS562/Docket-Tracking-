# 🚀 RFID Docket Tracking System - Production Deployment Guide

**Phase 6: Production Ready Deployment**

This guide provides comprehensive instructions for deploying the RFID Docket Tracking System in a production environment with enterprise-grade scalability, security, and monitoring.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Steps](#deployment-steps)
5. [Configuration](#configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Load Testing](#load-testing)
8. [Backup & Recovery](#backup--recovery)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

**Minimum Production Environment:**
- **CPU:** 8 cores (16 vCPUs recommended)
- **RAM:** 32 GB (64 GB recommended)
- **Storage:** 500 GB SSD (1 TB recommended)
- **Network:** 1 Gbps
- **OS:** Ubuntu 22.04 LTS / CentOS 8 / RHEL 8

**Recommended High-Availability Setup:**
- **Load Balancer:** 2x servers (4 cores, 8 GB RAM each)
- **Application Servers:** 3x servers (8 cores, 32 GB RAM, 500 GB SSD each)
- **Database Cluster:** 3x servers (16 cores, 64 GB RAM, 1 TB SSD each)
- **Monitoring Stack:** 1x server (8 cores, 16 GB RAM, 500 GB SSD)

### Software Requirements

```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose V2
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Node.js & npm (for development/testing)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL Client (for database management)
sudo apt-get install -y postgresql-client

# AWS CLI (for backup to S3)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

## Infrastructure Requirements

### Network Architecture

```
Internet → Firewall → Load Balancer → Application Servers → Database Cluster
                                   ↓
                              Monitoring Stack
```

### Port Configuration

```bash
# External (Internet-facing)
80/tcp    # HTTP (redirects to HTTPS)
443/tcp   # HTTPS (SSL/TLS)

# Internal (Private network)
3000/tcp  # Application servers
5432/tcp  # PostgreSQL master
5433/tcp  # PostgreSQL replica
6379/tcp  # Redis master
6380/tcp  # Redis replica
9090/tcp  # Prometheus
3001/tcp  # Grafana
5601/tcp  # Kibana
8404/tcp  # HAProxy stats
```

### Firewall Rules

```bash
# UFW Configuration (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow from 10.0.0.0/8 to any port 3000  # Internal API
sudo ufw allow from 10.0.0.0/8 to any port 5432  # Internal DB
sudo ufw enable

# IPTables rules (if not using UFW)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 3000 -j ACCEPT
iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 5432 -j ACCEPT
```

## Pre-Deployment Checklist

### ✅ Infrastructure Preparation

- [ ] Servers provisioned and accessible
- [ ] DNS records configured (A, CNAME, SSL certificates)
- [ ] Firewall rules implemented
- [ ] Load balancer configured
- [ ] Backup storage configured (S3 bucket or equivalent)
- [ ] Monitoring endpoints accessible
- [ ] SSL certificates obtained and installed

### ✅ Environment Configuration

- [ ] Environment variables configured
- [ ] Database credentials generated
- [ ] JWT secrets generated
- [ ] Encryption keys created
- [ ] SMTP server configured for alerts
- [ ] S3/backup credentials configured

### ✅ Security Preparation

- [ ] SSH keys deployed (disable password authentication)
- [ ] Non-root user created for application
- [ ] Database users with minimal privileges
- [ ] GPG keys for backup encryption
- [ ] Network segmentation implemented
- [ ] Intrusion detection system configured

## Deployment Steps

### Step 1: Clone and Prepare Repository

```bash
# Clone repository
git clone https://github.com/GABRIELS562/Docket-Tracking-.git
cd Docket-Tracking-/phase6-production

# Create environment file
cp .env.production .env
nano .env  # Edit with production values
```

### Step 2: Configure SSL Certificates

```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/certs/rfid-docket
sudo mkdir -p /etc/ssl/private/rfid-docket

# Option 1: Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d dockettrack.company.com
sudo cp /etc/letsencrypt/live/dockettrack.company.com/fullchain.pem /etc/ssl/certs/rfid-docket/
sudo cp /etc/letsencrypt/live/dockettrack.company.com/privkey.pem /etc/ssl/private/rfid-docket/

# Option 2: Commercial certificate
# Copy your certificate files to the SSL directories
```

### Step 3: Initialize Database

```bash
# Start database containers first
docker-compose -f docker-compose.prod.yml up -d postgres-master postgres-replica redis-master redis-replica

# Wait for database to be ready
sleep 30

# Apply migrations
docker exec -i rfid_postgres_master psql -U docket_user -d docket_tracking_prod < migrations/001_initial_schema.sql

# Verify database
docker exec rfid_postgres_master psql -U docket_user -d docket_tracking_prod -c "\\dt"
```

### Step 4: Deploy Application

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.prod.yml ps

# Check logs for any errors
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 5: Configure Load Balancer

```bash
# Update HAProxy configuration with actual server IPs
nano configs/haproxy.cfg

# Restart load balancer
docker-compose -f docker-compose.prod.yml restart load-balancer

# Verify load balancer status
curl -u admin:password http://localhost:8404/stats
```

### Step 6: Initialize Monitoring

```bash
# Verify Prometheus targets
curl http://localhost:9090/targets

# Access Grafana (default: admin/admin)
# Import dashboards from monitoring/grafana/dashboards/

# Configure Elasticsearch index patterns in Kibana
curl -X PUT "localhost:9200/_index_template/rfid-logs" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["rfid-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1
    }
  }
}
'
```

## Configuration

### Environment Variables

```bash
# Critical production settings
NODE_ENV=production
DB_PASSWORD=your_secure_db_password
JWT_SECRET=your_secure_jwt_secret_256_bits
ENCRYPTION_KEY=your_32_byte_encryption_key

# Performance tuning
DB_POOL_MAX=50
REDIS_TTL=3600
RATE_LIMIT_MAX=1000
MAX_WORKERS=4

# Security settings
CORS_ORIGIN=https://dockettrack.company.com
HELMET_CSP=true
BCRYPT_ROUNDS=12

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
PROMETHEUS_ENABLED=true
```

### Database Optimization

```sql
-- Production database tuning
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();

-- Create additional indexes for production workload
CREATE INDEX CONCURRENTLY idx_objects_compound ON objects(object_type, status, created_at);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp_personnel ON audit_logs(timestamp, personnel_id);
CREATE INDEX CONCURRENTLY idx_rfid_events_timestamp_location ON rfid_events(timestamp, location_id);
```

## Load Testing

### Running Load Tests

```bash
# Install load testing dependencies
cd tests/load
npm install axios

# Configure test parameters
export API_BASE_URL=https://dockettrack.company.com/api
export CONCURRENT_USERS=50
export TEST_DURATION=300
export RAMP_UP_TIME=60

# Run load test
node load-test.js

# Review results
cat load-test-report-*.json | jq '.summary'
```

### Performance Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| API Response Time (95th percentile) | < 2000ms | Prometheus + Grafana |
| Search Response Time (average) | < 500ms | Application logs |
| Database Query Time (95th percentile) | < 1000ms | PostgreSQL logs |
| Success Rate | > 99% | Application metrics |
| Throughput | > 100 req/s | Load balancer stats |
| Concurrent Users | 50+ | Load testing |
| Database Objects | 300k+ | Database monitoring |

## Backup & Recovery

### Automated Backup Setup

```bash
# Make backup script executable
chmod +x backup/scripts/backup.sh

# Configure backup environment
export BACKUP_RETENTION_DAYS=30
export BACKUP_S3_BUCKET=rfid-docket-backups
export BACKUP_ENCRYPTION_KEY=your_backup_encryption_key
export BACKUP_GPG_RECIPIENT=backup@company.com

# Test backup manually
./backup/scripts/backup.sh full

# Setup automated backups (crontab)
crontab -e
# Add: 0 2 * * * /path/to/backup/scripts/backup.sh full >> /var/log/backup.log 2>&1
```

### Recovery Procedures

```bash
# Database recovery from backup
./backup/scripts/restore.sh /path/to/backup.tar.gz

# Application files recovery
tar -xzf application_files.tar.gz -C /

# Configuration recovery
tar -xzf configurations.tar.gz -C /opt/rfid-docket/
```

## Security Hardening

### System Hardening

```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Configure fail2ban
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure auditd for compliance
sudo apt install auditd
sudo systemctl enable auditd
```

### Application Security

```bash
# Generate secure secrets
openssl rand -hex 32  # JWT secret
openssl rand -hex 16  # Encryption key
openssl rand -base64 32  # Session secret

# Database security
psql -h postgres-master -U postgres -c "
CREATE ROLE docket_readonly WITH LOGIN PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE docket_tracking_prod TO docket_readonly;
GRANT USAGE ON SCHEMA public TO docket_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO docket_readonly;
"

# Network security
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
```

## Monitoring Setup

### Health Check Endpoints

```bash
# Application health
curl https://dockettrack.company.com/health

# Database health
curl https://dockettrack.company.com/health/database

# Prometheus metrics
curl https://dockettrack.company.com/metrics

# Load balancer stats
curl -u admin:password https://dockettrack.company.com:8404/stats
```

### Alert Configuration

```yaml
# Prometheus alerting rules
groups:
  - name: rfid_docket_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: High database connection count
```

## Troubleshooting

### Common Issues

**1. Database Connection Issues**
```bash
# Check database status
docker exec rfid_postgres_master pg_isready -U docket_user

# Check connection pool
docker exec rfid_postgres_master psql -U docket_user -c "SELECT count(*) FROM pg_stat_activity;"

# Check logs
docker logs rfid_postgres_master
```

**2. High Memory Usage**
```bash
# Check container memory usage
docker stats

# Check system memory
free -h
htop

# Adjust container limits in docker-compose.prod.yml
```

**3. SSL Certificate Issues**
```bash
# Verify certificate
openssl x509 -in /etc/ssl/certs/rfid-docket.crt -text -noout

# Check certificate expiry
openssl x509 -in /etc/ssl/certs/rfid-docket.crt -checkend 86400

# Test SSL configuration
curl -I https://dockettrack.company.com
```

### Log Locations

```bash
# Application logs
docker logs rfid_api_server
tail -f /opt/rfid-docket/logs/application.log

# Database logs
docker logs rfid_postgres_master
tail -f /var/lib/postgresql/data/log/postgresql-*.log

# HAProxy logs
docker logs rfid_load_balancer
tail -f /var/log/haproxy.log

# System logs
sudo journalctl -u docker
tail -f /var/log/syslog
```

## Maintenance

### Regular Maintenance Tasks

**Daily:**
- [ ] Check system health dashboards
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Monitor disk space usage

**Weekly:**
- [ ] Review security alerts
- [ ] Update system packages
- [ ] Analyze performance metrics
- [ ] Test backup restoration

**Monthly:**
- [ ] Security scan and vulnerability assessment
- [ ] Database maintenance (VACUUM, REINDEX)
- [ ] Certificate expiry check
- [ ] Capacity planning review

### Update Procedures

```bash
# Application updates
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d --no-deps api-server

# Database schema updates
docker exec -i rfid_postgres_master psql -U docket_user -d docket_tracking_prod < new_migration.sql

# System updates
sudo apt update && sudo apt upgrade -y
sudo reboot  # If kernel updates
```

### Performance Monitoring

```bash
# Database performance
docker exec rfid_postgres_master psql -U docket_user -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"

# Application performance
curl https://dockettrack.company.com/metrics | grep http_request_duration

# System performance
iostat -x 1
sar -u 1 5
```

## Support & Contacts

**Emergency Contacts:**
- System Administrator: admin@company.com
- Database Administrator: dba@company.com
- Security Team: security@company.com

**Monitoring Dashboards:**
- Grafana: https://dockettrack.company.com:3001
- Prometheus: https://dockettrack.company.com:9090
- Kibana: https://dockettrack.company.com:5601
- HAProxy Stats: https://dockettrack.company.com:8404/stats

**Documentation:**
- API Documentation: https://dockettrack.company.com/api-docs
- User Manual: /docs/USER_MANUAL.md
- Architecture Guide: /docs/ARCHITECTURE.md

---

## 🎉 Production Deployment Complete!

Your RFID Docket Tracking System is now ready for production use with:

✅ **High Availability** - Load balanced, redundant components
✅ **Performance** - Optimized for 300k+ objects, 50+ concurrent users  
✅ **Security** - Enterprise-grade security hardening
✅ **Monitoring** - Comprehensive observability stack
✅ **Backup** - Automated backup and recovery procedures
✅ **Scalability** - Designed to handle massive growth

**Production Checklist Summary:**
- Database cluster with master/replica setup
- Redis caching for performance
- HAProxy load balancing
- SSL/TLS encryption
- Prometheus + Grafana monitoring
- Elasticsearch + Kibana logging
- Automated backups with encryption
- Security hardening and compliance
- Load testing validated
- Documentation complete

Your system is now enterprise-ready! 🚀