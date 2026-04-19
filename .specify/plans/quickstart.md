# Quickstart Guide — SAPS RFID Docket Tracking

**Target**: Fresh clone to running system in <10 minutes

---

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git
- 4GB RAM minimum
- Ports 80, 5432, 6379, 1883 available

---

## Quick Start (Development)

```bash
# 1. Clone repository
git clone https://github.com/GABRIELS562/Docket-Tracking-.git
cd Docket-Tracking-

# 2. Copy environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Wait for services to be healthy (~30 seconds)
docker-compose ps

# 5. Run database migrations
docker-compose exec backend npm run db:migrate

# 6. Seed demo data (optional)
docker-compose exec backend npm run db:seed

# 7. Open browser
open http://localhost:3000
```

---

## Environment Variables

Minimum required in `.env`:

```bash
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=saps_rfid
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# MQTT
MQTT_BROKER_URL=mqtt://mosquitto:1883

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=8h

# API
API_PORT=8080
NODE_ENV=development
```

---

## Services

| Service     | Port | URL                       | Notes         |
| ----------- | ---- | ------------------------- | ------------- |
| Frontend    | 3000 | http://localhost:3000     | React SPA     |
| Backend API | 8080 | http://localhost:8080/api | Express       |
| PostgreSQL  | 5432 | -                         | TimescaleDB   |
| Redis       | 6379 | -                         | Session cache |
| Mosquitto   | 1883 | -                         | MQTT broker   |

---

## Health Check

```bash
# Check all services
docker-compose ps

# Check backend health
curl http://localhost:8080/health

# Detailed health (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/health/detailed
```

---

## Demo Mode

If no RFID readers connected, the system runs in demo mode:

1. Open http://localhost:3000
2. Login with demo credentials:
   - Email: `demo@fsl.gov.za`
   - Password: `demo123`
3. Dashboard shows simulated data
4. Zone occupancy updates every 5 seconds

---

## Common Commands

```bash
# View logs
docker-compose logs -f backend

# Restart backend
docker-compose restart backend

# Reset database
docker-compose exec backend npm run db:reset

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready: wait 30s and try again
# - Missing env vars: check .env file
# - Port conflict: check nothing on 8080
```

### Database connection failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"
```

### Frontend shows "Disconnected"

```bash
# Check WebSocket connection
# Open browser console, look for Socket.io errors

# Check backend is running
curl http://localhost:8080/health
```

---

## Production Deployment

See `docs/deployment-guide.md` for:

- TLS configuration
- Licence file installation
- LDAP/SSO setup
- Backup configuration
- Reader provisioning

---

## Next Steps

1. **Configure readers**: Add FX9600 reader IPs in admin panel
2. **Set up zones**: Define physical zones and assign readers
3. **Test tag binding**: Use tag-binding workflow to register dockets
4. **Configure alerts**: Set up exit and restricted zone alerts
5. **LDAP integration**: Connect to customer AD for SSO

---

## Document History

| Version | Date       | Author | Changes            |
| ------- | ---------- | ------ | ------------------ |
| 1.0     | 2026-04-19 | Claude | Initial quickstart |
