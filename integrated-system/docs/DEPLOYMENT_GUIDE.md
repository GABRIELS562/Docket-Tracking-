# RFID Docket Tracking System - Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Application Deployment](#application-deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Security Configuration](#security-configuration)
- [Performance Optimization](#performance-optimization)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive instructions for deploying the RFID Docket Tracking System in production environments. The system is designed for government compliance with robust audit trails, real-time RFID tracking, and AI-powered document classification.

### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│     Frontend    │────│      API        │
│    (Nginx)      │    │   (React SPA)   │    │  (Node.js)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │     Worker      │────│   Database      │
│ (Grafana/Prom)  │    │   (Background)  │    │ (PostgreSQL)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Logging     │    │      Cache      │    │   File Storage  │
│      (ELK)      │    │     (Redis)     │    │    (Local/S3)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or RHEL 8+ (recommended)
- **CPU**: Minimum 4 cores, 8 cores recommended
- **RAM**: Minimum 8GB, 16GB recommended
- **Storage**: Minimum 100GB SSD, 500GB recommended
- **Network**: Gigabit Ethernet

### Software Dependencies
- Node.js 18.0+ (LTS recommended)
- PostgreSQL 13+
- Redis 6+
- Nginx 1.20+
- Docker & Docker Compose (for containerized deployment)
- SSL certificates (Let's Encrypt or commercial)

### Required Accounts & Services
- SendGrid account (for email notifications)
- Twilio account (for SMS alerts)
- AWS account (for S3 backup storage)
- Domain name with DNS access

## Infrastructure Requirements

### Network Configuration
```bash
# Firewall rules (UFW example)
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 5432/tcp   # PostgreSQL (internal only)
sudo ufw allow 6379/tcp   # Redis (internal only)
sudo ufw enable
```

### DNS Configuration
```
A     docket-tracking.yourdomain.com      -> SERVER_IP
A     api.docket-tracking.yourdomain.com  -> SERVER_IP
CNAME www.docket-tracking.yourdomain.com  -> docket-tracking.yourdomain.com
```

## Environment Setup

### 1. Create Application User
```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash -G sudo docket-app
sudo mkdir -p /opt/docket-tracking
sudo chown docket-app:docket-app /opt/docket-tracking
```

### 2. Install Node.js
```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.x.x
npm --version
```

### 3. Install Docker (Optional)
```bash
# Install Docker for containerized deployment
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker docket-app
```

## Database Setup

### 1. Install PostgreSQL
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql postgresql-contrib postgresql-15-postgis-3

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE docket_tracking_prod;
CREATE USER docket_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE docket_tracking_prod TO docket_user;

-- Enable required extensions
\c docket_tracking_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Exit psql
\q
```

### 3. Configure PostgreSQL
```bash
# Edit postgresql.conf
sudo vim /etc/postgresql/15/main/postgresql.conf

# Recommended settings
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
max_connections = 200

# Edit pg_hba.conf for security
sudo vim /etc/postgresql/15/main/pg_hba.conf

# Add application access
host    docket_tracking_prod    docket_user    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4. Install Redis
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo vim /etc/redis/redis.conf

# Key settings
bind 127.0.0.1
requirepass your_redis_password_here
maxmemory 512mb
maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## Application Deployment

### Method 1: Manual Deployment

#### 1. Clone Repository
```bash
sudo -u docket-app bash
cd /opt/docket-tracking
git clone https://github.com/your-org/docket-tracking.git current
cd current
```

#### 2. Install Dependencies
```bash
# Install production dependencies
npm ci --production --legacy-peer-deps

# Build application
npm run build
```

#### 3. Configure Environment
```bash
# Copy environment configuration
cp scripts/config/production.env .env

# Edit configuration
vim .env
```

#### 4. Run Database Migrations
```bash
# Run migrations
npm run migrate

# Apply performance optimizations
psql -h localhost -U docket_user -d docket_tracking_prod \
     -f src/database/migrations/999_optimize_performance.sql
```

#### 5. Set Up Systemd Services
```bash
# Copy service files
sudo cp scripts/systemd/*.service /etc/systemd/system/

# Reload systemd and start services
sudo systemctl daemon-reload
sudo systemctl enable docket-tracking-api
sudo systemctl enable docket-tracking-frontend
sudo systemctl enable docket-tracking-worker

sudo systemctl start docket-tracking-api
sudo systemctl start docket-tracking-frontend
sudo systemctl start docket-tracking-worker
```

### Method 2: Automated Deployment Script

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh production main

# Check deployment status
sudo systemctl status docket-tracking-api
sudo systemctl status docket-tracking-frontend
sudo systemctl status docket-tracking-worker
```

### Method 3: Docker Deployment

```bash
# Create environment file
cp scripts/config/production.env .env.production

# Start all services
docker-compose -f scripts/docker/docker-compose.production.yml up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f api
```

## Monitoring & Logging

### 1. Application Monitoring
```bash
# Prometheus metrics available at:
http://localhost:9090

# Grafana dashboards available at:
http://localhost:3003
# Login: admin / [GRAFANA_PASSWORD]

# Health check endpoints:
curl http://localhost:3001/health
curl http://localhost:3000/health
```

### 2. Log Configuration
```bash
# Create log directories
sudo mkdir -p /var/log/docket-tracking
sudo chown docket-app:docket-app /var/log/docket-tracking

# Configure log rotation
sudo vim /etc/logrotate.d/docket-tracking
```

```
/var/log/docket-tracking/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 docket-app docket-app
    postrotate
        systemctl reload docket-tracking-api || true
    endscript
}
```

### 3. Set Up Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt install nginx

# Configure virtual host
sudo vim /etc/nginx/sites-available/docket-tracking
```

```nginx
upstream api_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream frontend_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name docket-tracking.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name docket-tracking.yourdomain.com;

    ssl_certificate /etc/ssl/certs/docket-tracking.crt;
    ssl_certificate_key /etc/ssl/private/docket-tracking.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API routes
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=100 nodelay;
    }

    # WebSocket for real-time features
    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets
    location /static {
        proxy_pass http://frontend_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend application
    location / {
        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle client-side routing
        try_files $uri $uri/ @fallback;
    }

    location @fallback {
        proxy_pass http://frontend_backend;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/docket-tracking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Security Configuration

### 1. SSL Certificate Setup
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d docket-tracking.yourdomain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Firewall Configuration
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 3. Security Hardening
```bash
# Disable root SSH login
sudo vim /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

## Performance Optimization

### 1. Database Optimization
```bash
# Run performance optimization script
psql -h localhost -U docket_user -d docket_tracking_prod \
     -f src/database/migrations/999_optimize_performance.sql

# Set up automated maintenance
sudo crontab -e -u postgres
# Add daily vacuum: 0 2 * * * psql -d docket_tracking_prod -c "CALL vacuum_maintenance();"
# Add weekly analysis: 0 3 * * 0 psql -d docket_tracking_prod -c "CALL analyze_all_tables();"
```

### 2. Application Performance
```bash
# Enable Node.js production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Configure PM2 for process management (alternative to systemd)
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

### 3. Caching Configuration
```bash
# Redis memory optimization
sudo vim /etc/redis/redis.conf

# Add configurations:
maxmemory 1gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 0
```

## Backup & Recovery

### 1. Database Backup
```bash
# Create backup script
sudo vim /opt/docket-tracking/scripts/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="docket_tracking_prod"

mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U docket_user -d $DB_NAME \
    --no-owner --no-privileges --clean --if-exists \
    > $BACKUP_DIR/docket_tracking_${DATE}.sql

# Compress backup
gzip $BACKUP_DIR/docket_tracking_${DATE}.sql

# Upload to S3 (optional)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    aws s3 cp $BACKUP_DIR/docket_tracking_${DATE}.sql.gz \
        s3://your-backup-bucket/database/
fi

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "docket_tracking_*.sql.gz" -mtime +30 -delete
```

```bash
# Make executable and schedule
chmod +x /opt/docket-tracking/scripts/backup-db.sh
sudo crontab -e
# Add: 0 1 * * * /opt/docket-tracking/scripts/backup-db.sh
```

### 2. Application Backup
```bash
# Create application backup script
sudo vim /opt/docket-tracking/scripts/backup-app.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup uploads and configuration
tar -czf $BACKUP_DIR/docket_tracking_app_${DATE}.tar.gz \
    -C /opt/docket-tracking \
    uploads config current/.env

# Upload to S3 (optional)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    aws s3 cp $BACKUP_DIR/docket_tracking_app_${DATE}.tar.gz \
        s3://your-backup-bucket/application/
fi

# Clean old backups
find $BACKUP_DIR -name "docket_tracking_app_*.tar.gz" -mtime +7 -delete
```

### 3. Disaster Recovery
```bash
# Database recovery
gunzip -c backup_file.sql.gz | psql -h localhost -U docket_user -d docket_tracking_prod

# Application recovery
cd /opt/docket-tracking
tar -xzf backup_file.tar.gz
systemctl restart docket-tracking-*
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
journalctl -u docket-tracking-api -f
tail -f /var/log/docket-tracking/application.log

# Check process status
sudo systemctl status docket-tracking-api
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
psql -h localhost -U docket_user -d docket_tracking_prod -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 3. High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart services if needed
sudo systemctl restart docket-tracking-*
```

#### 4. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/docket-tracking.crt -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
sudo certbot renew
```

### Performance Monitoring
```bash
# Check system performance
htop
iotop
nethogs

# Database performance
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;"
```

### Health Check Commands
```bash
# Application health
curl -f http://localhost:3001/health
curl -f http://localhost:3000/health

# Database health
psql -h localhost -U docket_user -d docket_tracking_prod -c "SELECT version();"

# Redis health
redis-cli ping
```

## Maintenance

### Regular Maintenance Tasks
1. **Daily**: Check application logs and system resources
2. **Weekly**: Review database performance and run ANALYZE
3. **Monthly**: Update system packages and security patches
4. **Quarterly**: Review and rotate logs, test backup restoration

### Update Process
```bash
# 1. Backup current system
./scripts/deploy.sh backup

# 2. Deploy new version
./scripts/deploy.sh production main

# 3. Run health checks
./scripts/health-check.sh

# 4. Rollback if issues occur
./scripts/deploy.sh rollback backup_name
```

## Support

For additional support:
- Check the troubleshooting guide: `/docs/TROUBLESHOOTING.md`
- Review application logs: `/var/log/docket-tracking/`
- Contact system administrators
- Open support ticket with deployment details

---

**Last Updated**: January 2025  
**Version**: 1.0.0