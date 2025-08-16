# RFID Docket Tracking System - Troubleshooting Guide

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Application Issues](#application-issues)
- [Database Problems](#database-problems)
- [Performance Issues](#performance-issues)
- [RFID Hardware Issues](#rfid-hardware-issues)
- [Authentication & Security](#authentication--security)
- [Network & Connectivity](#network--connectivity)
- [Backup & Recovery](#backup--recovery)
- [Monitoring & Alerts](#monitoring--alerts)
- [Emergency Procedures](#emergency-procedures)

## Quick Diagnostics

### Health Check Commands
```bash
# System-wide health check
curl -f http://localhost:3001/health | jq .
curl -f http://localhost:3000/health

# Service status
sudo systemctl status docket-tracking-api
sudo systemctl status docket-tracking-frontend
sudo systemctl status docket-tracking-worker

# Database connectivity
psql -h localhost -U docket_user -d docket_tracking_prod -c "SELECT version();"

# Redis connectivity
redis-cli ping

# Disk space
df -h
du -sh /opt/docket-tracking/*

# Memory usage
free -h
ps aux --sort=-%mem | head -10

# CPU usage
top -o %CPU | head -20
```

### Log Locations
```bash
# Application logs
tail -f /var/log/docket-tracking/application.log
tail -f /var/log/docket-tracking/error.log
tail -f /var/log/docket-tracking/audit.log

# System logs
journalctl -u docket-tracking-api -f
journalctl -u docket-tracking-frontend -f
journalctl -u docket-tracking-worker -f

# Database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Application Issues

### Issue: Application Won't Start

#### Symptoms
- Service fails to start
- Port binding errors
- Missing dependencies

#### Diagnosis
```bash
# Check service status
sudo systemctl status docket-tracking-api

# Check if port is in use
sudo netstat -tulpn | grep :3001
sudo lsof -i :3001

# Check environment variables
sudo systemctl show docket-tracking-api --property=Environment

# Check application logs
journalctl -u docket-tracking-api --since "10 minutes ago"
```

#### Solutions
```bash
# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3001)

# Check and fix permissions
sudo chown -R docket-app:docket-app /opt/docket-tracking
sudo chmod +x /opt/docket-tracking/current/src/server.js

# Restart service
sudo systemctl restart docket-tracking-api

# Reinstall dependencies
cd /opt/docket-tracking/current
npm ci --production
```

### Issue: High Memory Usage

#### Symptoms
- Application consuming excessive memory
- Out of memory errors
- System becomes unresponsive

#### Diagnosis
```bash
# Check memory usage by process
ps aux --sort=-%mem | grep node

# Check Node.js heap usage
curl http://localhost:3001/metrics | grep nodejs_heap

# Monitor memory over time
watch -n 5 'free -h && ps aux --sort=-%mem | head -10'
```

#### Solutions
```bash
# Restart services to clear memory
sudo systemctl restart docket-tracking-api
sudo systemctl restart docket-tracking-worker

# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection optimization
export NODE_OPTIONS="--optimize-for-size"

# Check for memory leaks in application
node --inspect /opt/docket-tracking/current/src/server.js
```

### Issue: Slow Response Times

#### Symptoms
- API endpoints responding slowly
- Frontend loading slowly
- Timeouts on requests

#### Diagnosis
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null http://localhost:3001/api/dockets

# Monitor database queries
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
WHERE mean_time > 1000
ORDER BY mean_time DESC;"

# Check CPU and I/O
iostat -x 1 5
sar -u 1 5
```

#### Solutions
```bash
# Restart services
sudo systemctl restart docket-tracking-*

# Clear Redis cache
redis-cli FLUSHALL

# Optimize database
psql -h localhost -U docket_user -d docket_tracking_prod -c "CALL analyze_all_tables();"

# Check and add missing indexes
psql -h localhost -U docket_user -d docket_tracking_prod -f src/database/migrations/999_optimize_performance.sql
```

## Database Problems

### Issue: Database Connection Failed

#### Symptoms
- "Connection refused" errors
- Application can't connect to database
- Database service not running

#### Diagnosis
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database processes
ps aux | grep postgres

# Test connection
psql -h localhost -U docket_user -d docket_tracking_prod

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Check connection limits
psql -h localhost -U postgres -c "SHOW max_connections;"
psql -h localhost -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Solutions
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Fix connection limits
sudo vim /etc/postgresql/15/main/postgresql.conf
# Increase max_connections = 200

# Fix authentication
sudo vim /etc/postgresql/15/main/pg_hba.conf
# Add: host docket_tracking_prod docket_user 127.0.0.1/32 md5

# Reload configuration
sudo systemctl reload postgresql
```

### Issue: Database Performance Issues

#### Symptoms
- Slow queries
- High CPU usage on database server
- Locks and deadlocks

#### Diagnosis
```bash
# Check slow queries
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY total_time DESC 
LIMIT 10;"

# Check locks
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT pid, usename, application_name, state, query 
FROM pg_stat_activity 
WHERE state = 'active';"

# Check table sizes
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

#### Solutions
```bash
# Run VACUUM and ANALYZE
psql -h localhost -U docket_user -d docket_tracking_prod -c "VACUUM ANALYZE;"

# Reindex tables
psql -h localhost -U docket_user -d docket_tracking_prod -c "REINDEX DATABASE docket_tracking_prod;"

# Update statistics
psql -h localhost -U docket_user -d docket_tracking_prod -c "CALL analyze_all_tables();"

# Kill long-running queries
psql -h localhost -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';"
```

### Issue: Database Corruption

#### Symptoms
- Data integrity errors
- Corruption warnings in logs
- Unexpected query results

#### Diagnosis
```bash
# Check database integrity
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT datname, pg_database_size(datname) 
FROM pg_database 
WHERE datname = 'docket_tracking_prod';"

# Check for corruption
sudo -u postgres /usr/lib/postgresql/15/bin/pg_checksums --check -D /var/lib/postgresql/15/main

# Verify constraints
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE NOT convalidated;"
```

#### Solutions
```bash
# Stop application services
sudo systemctl stop docket-tracking-*

# Create emergency backup
pg_dump -h localhost -U docket_user docket_tracking_prod > emergency_backup.sql

# Restore from recent backup
psql -h localhost -U docket_user -d docket_tracking_prod < latest_backup.sql

# If corruption is severe, restore from backup
dropdb -h localhost -U postgres docket_tracking_prod
createdb -h localhost -U postgres docket_tracking_prod
psql -h localhost -U docket_user -d docket_tracking_prod < backup_file.sql
```

## Performance Issues

### Issue: High CPU Usage

#### Symptoms
- Server load average > number of cores
- Slow response times
- System becoming unresponsive

#### Diagnosis
```bash
# Check CPU usage
top -o %CPU
htop
sar -u 5 5

# Check load average
uptime
cat /proc/loadavg

# Identify CPU-intensive processes
ps aux --sort=-%cpu | head -10

# Check database CPU usage
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT pid, usename, application_name, state, 
       query_start, now() - query_start AS runtime, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY query_start;"
```

#### Solutions
```bash
# Kill CPU-intensive processes
sudo kill -TERM <pid>

# Restart services
sudo systemctl restart docket-tracking-*

# Optimize database queries
psql -h localhost -U docket_user -d docket_tracking_prod -c "CALL analyze_all_tables();"

# Add CPU limits to services
sudo systemctl edit docket-tracking-api
# Add:
# [Service]
# CPUQuota=200%
```

### Issue: High Disk I/O

#### Symptoms
- High I/O wait times
- Slow file operations
- Database performance issues

#### Diagnosis
```bash
# Check I/O statistics
iostat -x 1 5
iotop -o

# Check disk usage
df -h
du -sh /opt/docket-tracking/*
du -sh /var/lib/postgresql/*

# Check database I/O
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT schemaname, tablename, heap_blks_read, heap_blks_hit, 
       heap_blks_read/(heap_blks_hit+heap_blks_read+1)*100 AS miss_ratio
FROM pg_statio_user_tables 
ORDER BY heap_blks_read DESC;"
```

#### Solutions
```bash
# Clean up old logs
sudo find /var/log -name "*.log" -mtime +30 -delete
sudo journalctl --vacuum-time=30d

# Clean up old uploads
find /opt/docket-tracking/uploads -mtime +365 -type f -delete

# Optimize database configuration
sudo vim /etc/postgresql/15/main/postgresql.conf
# Increase shared_buffers = 512MB
# Increase effective_cache_size = 2GB

# Move database to faster storage if available
sudo systemctl stop postgresql
sudo rsync -av /var/lib/postgresql/ /fast-storage/postgresql/
sudo vim /etc/postgresql/15/main/postgresql.conf
# Update data_directory = '/fast-storage/postgresql/15/main'
```

## RFID Hardware Issues

### Issue: RFID Reader Not Responding

#### Symptoms
- No RFID events in database
- Reader status shows offline
- Network connectivity issues

#### Diagnosis
```bash
# Check RFID events
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT reader_id, COUNT(*), MAX(timestamp) as last_scan
FROM rfid_events 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY reader_id;"

# Check network connectivity to readers
ping 192.168.1.100  # Replace with reader IP
telnet 192.168.1.100 80

# Check RFID service logs
grep "RFID" /var/log/docket-tracking/application.log | tail -20
```

#### Solutions
```bash
# Restart RFID service component
sudo systemctl restart docket-tracking-worker

# Reset network configuration on reader
# (Consult RFID reader manual)

# Update reader firmware if available
# Check with hardware vendor

# Recalibrate reader antenna
# Follow hardware vendor procedures
```

### Issue: Poor RFID Signal Strength

#### Symptoms
- Inconsistent tag reads
- Low signal strength values
- Missing scans

#### Diagnosis
```bash
# Check signal strength statistics
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT reader_id, 
       AVG(signal_strength) as avg_signal,
       MIN(signal_strength) as min_signal,
       COUNT(CASE WHEN signal_strength < 0.5 THEN 1 END) as weak_signals
FROM rfid_events 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY reader_id
ORDER BY avg_signal;"

# Check for interference
# Use RFID reader diagnostic tools

# Check tag placement and orientation
# Physical inspection required
```

#### Solutions
```bash
# Adjust reader power settings
# Consult reader configuration manual

# Reposition readers or tags
# Physical adjustment required

# Clean reader antennas
# Physical maintenance required

# Update RFID reader configuration
# Use vendor-specific tools
```

## Authentication & Security

### Issue: Users Cannot Log In

#### Symptoms
- Authentication failures
- "Invalid credentials" errors
- JWT token issues

#### Diagnosis
```bash
# Check authentication logs
grep "auth" /var/log/docket-tracking/application.log | tail -20

# Test login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Check JWT secret configuration
sudo grep JWT_SECRET /opt/docket-tracking/current/.env

# Check user table
psql -h localhost -U docket_user -d docket_tracking_prod -c "
SELECT id, email, role, created_at, last_login 
FROM users 
WHERE email = 'admin@example.com';"
```

#### Solutions
```bash
# Reset user password
psql -h localhost -U docket_user -d docket_tracking_prod -c "
UPDATE users 
SET password = '$2b$10$encrypted_password_hash' 
WHERE email = 'admin@example.com';"

# Check JWT secret
sudo vim /opt/docket-tracking/current/.env
# Ensure JWT_SECRET is set

# Clear user sessions
redis-cli DEL "sess:*"

# Restart authentication service
sudo systemctl restart docket-tracking-api
```

### Issue: SSL Certificate Problems

#### Symptoms
- Browser SSL warnings
- Certificate expired errors
- HTTPS not working

#### Diagnosis
```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/docket-tracking.crt -text -noout | grep -A 2 Validity

# Check certificate chain
openssl s509 -in /etc/ssl/certs/docket-tracking.crt -text -noout

# Test SSL connection
openssl s_client -connect docket-tracking.yourdomain.com:443

# Check Nginx SSL configuration
sudo nginx -t
```

#### Solutions
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Update certificate in Nginx
sudo systemctl reload nginx

# Check certificate permissions
sudo chown root:root /etc/ssl/certs/docket-tracking.crt
sudo chmod 644 /etc/ssl/certs/docket-tracking.crt
sudo chmod 600 /etc/ssl/private/docket-tracking.key

# Force HTTPS redirect
sudo vim /etc/nginx/sites-available/docket-tracking
# Add: return 301 https://$server_name$request_uri;
```

## Network & Connectivity

### Issue: Network Connectivity Problems

#### Symptoms
- API calls failing
- Frontend not loading
- External service timeouts

#### Diagnosis
```bash
# Check network interfaces
ip addr show
ip route show

# Test external connectivity
ping 8.8.8.8
curl -I https://api.sendgrid.com

# Check DNS resolution
nslookup docket-tracking.yourdomain.com
dig docket-tracking.yourdomain.com

# Check firewall rules
sudo ufw status
sudo iptables -L

# Check port listening
sudo netstat -tulpn | grep -E "(3000|3001|5432|6379|80|443)"
```

#### Solutions
```bash
# Restart networking
sudo systemctl restart networking

# Fix DNS configuration
sudo vim /etc/resolv.conf
# Add: nameserver 8.8.8.8

# Open required ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Restart network services
sudo systemctl restart nginx
sudo systemctl restart docket-tracking-*
```

### Issue: Load Balancer Issues

#### Symptoms
- Uneven load distribution
- Some servers not receiving traffic
- Health check failures

#### Diagnosis
```bash
# Check Nginx upstream status
sudo nginx -s reload
curl http://localhost:80/nginx_status

# Check backend server health
curl -f http://localhost:3001/health
curl -f http://localhost:3000/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Monitor connection distribution
sudo netstat -an | grep :80 | wc -l
```

#### Solutions
```bash
# Reload Nginx configuration
sudo nginx -t && sudo nginx -s reload

# Restart failed backend servers
sudo systemctl restart docket-tracking-api
sudo systemctl restart docket-tracking-frontend

# Update upstream configuration
sudo vim /etc/nginx/sites-available/docket-tracking
# Adjust upstream server weights

# Check and fix health check endpoints
curl http://localhost:3001/health
```

## Backup & Recovery

### Issue: Backup Failures

#### Symptoms
- Scheduled backups not running
- Backup files not created
- Backup upload failures

#### Diagnosis
```bash
# Check backup cron jobs
sudo crontab -l
sudo crontab -l -u postgres

# Check backup script logs
tail -f /var/log/docket-tracking/backup.log

# Test backup script manually
sudo -u docket-app /opt/docket-tracking/scripts/backup-db.sh

# Check disk space for backups
df -h /opt/backups/

# Check S3 connectivity (if using)
aws s3 ls s3://your-backup-bucket/
```

#### Solutions
```bash
# Fix backup script permissions
sudo chmod +x /opt/docket-tracking/scripts/backup-db.sh
sudo chown docket-app:docket-app /opt/docket-tracking/scripts/backup-db.sh

# Fix backup directory permissions
sudo mkdir -p /opt/backups
sudo chown docket-app:docket-app /opt/backups

# Test and fix S3 credentials
aws configure list
aws s3 ls

# Recreate cron job
sudo crontab -e
# Add: 0 1 * * * /opt/docket-tracking/scripts/backup-db.sh
```

### Issue: Recovery Failures

#### Symptoms
- Cannot restore from backup
- Database restore errors
- Data inconsistency after restore

#### Diagnosis
```bash
# Check backup file integrity
gunzip -t backup_file.sql.gz

# Check backup file size
ls -lh /opt/backups/

# Test restore process
psql -h localhost -U docket_user -d test_restore < backup_file.sql

# Check database errors during restore
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### Solutions
```bash
# Stop all services before restore
sudo systemctl stop docket-tracking-*

# Create test database for restore validation
createdb -h localhost -U postgres test_restore
psql -h localhost -U docket_user -d test_restore < backup_file.sql

# Restore with proper permissions
sudo -u postgres psql -d docket_tracking_prod < backup_file.sql

# Fix ownership issues
psql -h localhost -U postgres -d docket_tracking_prod -c "
REASSIGN OWNED BY postgres TO docket_user;"

# Restart services after successful restore
sudo systemctl start docket-tracking-*
```

## Monitoring & Alerts

### Issue: Monitoring Not Working

#### Symptoms
- No metrics data
- Grafana dashboards empty
- Prometheus targets down

#### Diagnosis
```bash
# Check Prometheus status
curl http://localhost:9090/metrics
curl http://localhost:9090/api/v1/targets

# Check Grafana status
curl http://localhost:3003/api/health

# Check application metrics endpoint
curl http://localhost:3001/metrics

# Check container status (if using Docker)
docker ps
docker logs docket-tracking-prometheus
```

#### Solutions
```bash
# Restart monitoring services
sudo systemctl restart prometheus
sudo systemctl restart grafana-server

# Fix Prometheus configuration
sudo vim /etc/prometheus/prometheus.yml
sudo systemctl reload prometheus

# Reset Grafana admin password
sudo grafana-cli admin reset-admin-password admin

# Restart Docker containers (if applicable)
docker-compose restart prometheus grafana
```

### Issue: Missing Alerts

#### Symptoms
- Critical issues not alerting
- Alert notifications not sent
- False positive alerts

#### Diagnosis
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Check alert manager status
curl http://localhost:9093/api/v1/status

# Check notification configurations
sudo cat /etc/alertmanager/alertmanager.yml

# Test notification channels
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"test"}}]'
```

#### Solutions
```bash
# Fix alert rule syntax
sudo vim /etc/prometheus/alert.rules.yml
sudo systemctl reload prometheus

# Configure notification channels
sudo vim /etc/alertmanager/alertmanager.yml
sudo systemctl restart alertmanager

# Test email notifications
echo "Test email" | mail -s "Test Alert" admin@yourdomain.com

# Update Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from monitoring"}' \
  YOUR_SLACK_WEBHOOK_URL
```

## Emergency Procedures

### Complete System Failure

#### Immediate Actions
1. **Assess the situation**
   ```bash
   # Check system status
   uptime
   df -h
   free -h
   ps aux | wc -l
   ```

2. **Stop all services**
   ```bash
   sudo systemctl stop docket-tracking-*
   sudo systemctl stop nginx
   sudo systemctl stop postgresql
   sudo systemctl stop redis
   ```

3. **Check system resources**
   ```bash
   # Check for out of disk space
   df -h
   
   # Check for memory issues
   dmesg | grep -i "out of memory"
   
   # Check for hardware issues
   dmesg | grep -i error
   ```

4. **Emergency backup**
   ```bash
   # Quick database dump
   sudo -u postgres pg_dumpall > /tmp/emergency_backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Copy critical files
   tar -czf /tmp/emergency_files_$(date +%Y%m%d_%H%M%S).tar.gz \
     /opt/docket-tracking/uploads \
     /opt/docket-tracking/current/.env
   ```

#### Recovery Steps
1. **Restore from backup**
   ```bash
   # Restore database
   sudo systemctl start postgresql
   dropdb -h localhost -U postgres docket_tracking_prod
   createdb -h localhost -U postgres docket_tracking_prod
   psql -h localhost -U docket_user -d docket_tracking_prod < latest_backup.sql
   ```

2. **Restart services**
   ```bash
   sudo systemctl start redis
   sudo systemctl start docket-tracking-api
   sudo systemctl start docket-tracking-frontend
   sudo systemctl start docket-tracking-worker
   sudo systemctl start nginx
   ```

3. **Verify system functionality**
   ```bash
   # Test health endpoints
   curl -f http://localhost:3001/health
   curl -f http://localhost:3000/health
   
   # Test database connectivity
   psql -h localhost -U docket_user -d docket_tracking_prod -c "SELECT COUNT(*) FROM dockets;"
   
   # Test authentication
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password123"}'
   ```

### Data Corruption Emergency

#### Immediate Actions
1. **Stop all write operations**
   ```bash
   sudo systemctl stop docket-tracking-api
   sudo systemctl stop docket-tracking-worker
   ```

2. **Assess corruption extent**
   ```bash
   # Check database integrity
   sudo -u postgres /usr/lib/postgresql/15/bin/pg_checksums --check -D /var/lib/postgresql/15/main
   
   # Check specific tables
   psql -h localhost -U docket_user -d docket_tracking_prod -c "SELECT COUNT(*) FROM dockets;"
   ```

3. **Emergency backup of current state**
   ```bash
   pg_dump -h localhost -U docket_user docket_tracking_prod > corrupted_state_backup.sql
   ```

#### Recovery Actions
1. **Restore from latest clean backup**
   ```bash
   dropdb -h localhost -U postgres docket_tracking_prod
   createdb -h localhost -U postgres docket_tracking_prod
   psql -h localhost -U docket_user -d docket_tracking_prod < latest_clean_backup.sql
   ```

2. **Validate data integrity**
   ```bash
   # Run data validation queries
   psql -h localhost -U docket_user -d docket_tracking_prod -c "
   SELECT COUNT(*) as total_dockets FROM dockets;
   SELECT COUNT(*) as total_users FROM users;
   SELECT COUNT(*) as total_audit_logs FROM audit_logs;"
   ```

3. **Resume operations**
   ```bash
   sudo systemctl start docket-tracking-api
   sudo systemctl start docket-tracking-worker
   ```

### Security Incident Response

#### Immediate Actions
1. **Isolate the system**
   ```bash
   # Block external access
   sudo ufw deny 80/tcp
   sudo ufw deny 443/tcp
   
   # Stop web services
   sudo systemctl stop nginx
   sudo systemctl stop docket-tracking-frontend
   ```

2. **Preserve evidence**
   ```bash
   # Capture system state
   ps aux > /tmp/incident_processes_$(date +%Y%m%d_%H%M%S).txt
   netstat -tulpn > /tmp/incident_network_$(date +%Y%m%d_%H%M%S).txt
   
   # Backup logs
   tar -czf /tmp/incident_logs_$(date +%Y%m%d_%H%M%S).tar.gz /var/log/
   ```

3. **Check for compromise**
   ```bash
   # Check for suspicious processes
   ps aux | grep -v "\[.*\]" | sort
   
   # Check network connections
   netstat -an | grep ESTABLISHED
   
   # Check recent logins
   last | head -20
   who
   
   # Check for modified files
   find /opt/docket-tracking -mtime -1 -ls
   ```

#### Containment and Recovery
1. **Change all passwords**
   ```bash
   # Change database passwords
   psql -h localhost -U postgres -c "ALTER USER docket_user PASSWORD 'new_secure_password';"
   
   # Update application configuration
   sudo vim /opt/docket-tracking/current/.env
   # Update DB_PASSWORD, JWT_SECRET, etc.
   
   # Change system passwords
   sudo passwd docket-app
   ```

2. **Update and patch system**
   ```bash
   sudo apt update
   sudo apt upgrade
   sudo npm audit fix
   ```

3. **Restore from clean backup if necessary**
   ```bash
   # Follow data corruption recovery procedures
   ```

4. **Resume operations with monitoring**
   ```bash
   # Restart services
   sudo systemctl start docket-tracking-*
   sudo systemctl start nginx
   
   # Enable external access
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   
   # Monitor closely
   tail -f /var/log/docket-tracking/application.log
   ```

### Contact Information

#### Emergency Contacts
- **System Administrator**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Security Team**: [Contact Information]
- **Hardware Vendor Support**: [Contact Information]

#### Escalation Procedures
1. **Level 1**: Application restart and basic troubleshooting
2. **Level 2**: Database and system-level issues
3. **Level 3**: Hardware failures and security incidents
4. **Level 4**: Complete system rebuild and disaster recovery

---

**Remember**: Always backup before making changes and document all troubleshooting steps taken.

**Last Updated**: January 2025  
**Version**: 1.0.0