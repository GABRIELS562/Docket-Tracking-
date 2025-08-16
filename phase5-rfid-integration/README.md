# Phase 5: RFID Integration & Hardware Preparation

## Overview
Complete RFID hardware integration system for Zebra FX9600 readers with real-time event processing, multiple reader coordination, and comprehensive simulation capabilities.

## Features
✅ **Zebra FX9600 Integration** - MQTT/TCP protocol support  
✅ **Real-time Event Processing** - Batch processing with 1000+ events/second  
✅ **Multiple Reader Coordination** - Support for 3-18 readers simultaneously  
✅ **Hardware Status Monitoring** - Health checks and performance metrics  
✅ **Automatic Tag Detection** - Real-time object location updates  
✅ **Movement Tracking** - Object movement detection and analysis  
✅ **Collision Handling** - Tag collision detection and resolution  
✅ **Alert System** - Real-time alerts for system events  
✅ **Simulation Mode** - Complete RFID simulation for development  
✅ **WebSocket Real-time** - Live updates for all events  

## Architecture

### Core Services
- **ZebraReaderService** - Hardware communication via MQTT/TCP
- **RfidEventProcessor** - Real-time event processing and batching
- **RfidSimulator** - Complete simulation environment
- **DatabaseService** - High-performance data management

### Performance Specifications
- **Event Processing**: 1,000+ events/second per reader
- **Reader Support**: 3-18 Zebra FX9600 readers
- **Tag Capacity**: 300,000+ tags efficiently tracked
- **Real-time Updates**: < 1 second from tag read to database
- **System Uptime**: 99.9% availability target

## Quick Start

### 1. Install Dependencies
```bash
cd phase5-rfid-integration
npm install
```

### 2. Setup Database
```bash
# Create database
createdb rfid_hardware_integration

# Run migrations
psql -d rfid_hardware_integration -f migrations/create_rfid_tables.sql
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start in Simulation Mode
```bash
# For development/testing
RFID_MODE=simulation npm run dev
```

### 5. Start with Hardware
```bash
# For production with real readers
RFID_MODE=hardware npm run dev
```

## API Endpoints

### Reader Management
```bash
GET    /api/rfid/readers              # List all readers
GET    /api/rfid/readers/:id          # Get reader details
POST   /api/rfid/readers/:id/connect  # Connect reader
POST   /api/rfid/readers/:id/disconnect # Disconnect reader
POST   /api/rfid/readers/:id/command  # Send command to reader
```

### Event Processing
```bash
GET    /api/rfid/events               # Get RFID events
GET    /api/rfid/events/stats         # Event statistics
POST   /api/rfid/events/process       # Force batch processing
```

### Object Tracking
```bash
GET    /api/rfid/objects              # Get tracked objects
GET    /api/rfid/objects/:id/movements # Object movement history
```

### Alert Management
```bash
GET    /api/rfid/alerts               # Get system alerts
POST   /api/rfid/alerts/:id/acknowledge # Acknowledge alert
```

### Simulation Control
```bash
GET    /api/rfid/simulation/status    # Simulation status
POST   /api/rfid/simulation/start     # Start simulation
POST   /api/rfid/simulation/stop      # Stop simulation
POST   /api/rfid/simulation/config    # Update configuration
```

### System Health
```bash
GET    /api/rfid/health               # System health status
GET    /api/rfid/performance          # Performance metrics
```

## WebSocket Events

Connect to WebSocket server on port 3005:

```javascript
const socket = io('http://localhost:3005');

// Subscribe to events
socket.emit('subscribe-events');
socket.emit('subscribe-alerts');
socket.emit('subscribe-reader', 'FX9600-001');

// Listen for real-time updates
socket.on('tag_read', (data) => {
  console.log('Tag read:', data);
});

socket.on('object_moved', (data) => {
  console.log('Object moved:', data);
});

socket.on('alert_created', (data) => {
  console.log('New alert:', data);
});

socket.on('collision_detected', (data) => {
  console.log('Tag collision:', data);
});
```

## Configuration

### Environment Variables

```env
# RFID Hardware Configuration
RFID_MODE=simulation                    # 'simulation' or 'hardware'
RFID_READER_COUNT=6                     # Number of simulated readers
RFID_BASE_IP=192.168.1.100             # Base IP for readers
RFID_BASE_PORT=14150                    # Base port for readers

# Zebra FX9600 Configuration
ZEBRA_READER_TYPE=FX9600               # Reader model
ZEBRA_ANTENNA_COUNT=4                   # Antennas per reader
ZEBRA_MAX_POWER=30.0                   # Maximum power (dBm)
ZEBRA_FREQUENCY_REGION=US              # Frequency region

# Performance Settings
TAG_PROCESSING_BATCH_SIZE=100          # Events per batch
EVENT_PROCESSING_INTERVAL=100          # Processing interval (ms)
MAX_EVENTS_PER_SECOND=1000            # Rate limiting
READER_HEALTH_CHECK_INTERVAL=30000     # Health check interval (ms)

# Simulation Settings
SIMULATION_ENABLE=true                  # Enable simulation
SIMULATION_TAG_COUNT=1000              # Number of tags
SIMULATION_READERS_COUNT=6             # Number of readers
SIMULATION_EVENT_RATE=50               # Events per second
SIMULATION_MOVEMENT_PROBABILITY=0.1     # Movement probability
```

### Hardware Configuration

For production deployment with real Zebra FX9600 readers:

```env
RFID_MODE=hardware
MQTT_BROKER_URL=mqtt://192.168.1.10:1883
MQTT_USERNAME=rfid_user
MQTT_PASSWORD=secure_password
TCP_ENABLE=true
TCP_TIMEOUT=5000
```

## Testing

### Run Integration Tests
```bash
npm run test-readers
```

### Run Performance Tests
```bash
npm run test-readers -- --stress
```

### Manual Testing
```bash
# Start simulation
curl -X POST http://localhost:3004/api/rfid/simulation/start

# Check status
curl http://localhost:3004/api/rfid/simulation/status

# Get events
curl "http://localhost:3004/api/rfid/events?limit=10"

# Get system health
curl http://localhost:3004/api/rfid/health
```

## Database Schema

### Key Tables
- **rfid_readers** - Reader hardware configuration and status
- **rfid_events** - High-volume event data (partitioned)
- **objects** - Tracked objects with current locations
- **object_movements** - Movement history and analytics
- **system_alerts** - Real-time alerts and notifications
- **tag_collisions** - Collision detection and resolution
- **reader_health_logs** - Hardware health monitoring

### Performance Indexes
- Optimized for high-volume inserts (10M+ events/day)
- Real-time queries (< 100ms response)
- Movement tracking and analytics
- Full-text search capabilities

## Zebra FX9600 Integration

### Supported Features
- **Inventory Operations** - Start/stop continuous reading
- **Antenna Configuration** - Power, sensitivity, polarization
- **Filter Configuration** - EPC, TID, User memory filters
- **Region Configuration** - Frequency and power tables
- **Health Monitoring** - Temperature, VSWR, power levels

### Protocol Support
- **MQTT** - Publish/subscribe event streaming
- **TCP** - Direct socket communication
- **HTTP** - RESTful configuration API

### Command Examples
```javascript
// Start inventory
await readerService.sendCommand('FX9600-001', {
  command: 'start_inventory',
  parameters: {
    duration: 0, // Continuous
    reportTrigger: 'immediate'
  }
});

// Configure antenna
await readerService.sendCommand('FX9600-001', {
  command: 'set_antenna_config',
  parameters: {
    antenna: 1,
    enabled: true,
    powerLevel: 25.0,
    sensitivity: -70
  }
});
```

## Simulation Mode

### Features
- **Virtual Reader Network** - 6 simulated FX9600 readers
- **Realistic Tag Behavior** - Movement patterns and signal strength
- **Collision Simulation** - Multi-tag collision scenarios
- **Error Injection** - Hardware failure simulation
- **Performance Testing** - High-load event generation

### Simulation Configuration
```json
{
  "enabled": true,
  "tagCount": 1000,
  "readerCount": 6,
  "eventRate": 50,
  "movementProbability": 0.1,
  "collisionProbability": 0.05,
  "errorRate": 0.01
}
```

## Performance Monitoring

### Real-time Metrics
- Events per second by reader
- Queue sizes and processing times
- Memory and CPU usage
- Network latency and connectivity
- Tag read rates and signal strength

### Health Monitoring
- Reader connectivity status
- Antenna VSWR and return loss
- Temperature and power consumption
- Error rates and collision detection
- System uptime and availability

## Production Deployment

### Hardware Requirements
- **Zebra FX9600 Readers** - Fixed RFID readers
- **Network Infrastructure** - Gigabit Ethernet recommended
- **Server Specifications** - 16GB RAM, 8 cores minimum
- **Database Server** - PostgreSQL 13+ with SSD storage

### Network Configuration
```
Reader Network: 192.168.1.100-120/24
MQTT Broker: 192.168.1.10:1883
Application Server: 192.168.1.50:3004
WebSocket Server: 192.168.1.50:3005
```

### Scaling Considerations
- **Horizontal Scaling** - Multiple application instances
- **Database Partitioning** - Monthly event table partitioning
- **Load Balancing** - Reader connections across instances
- **Caching** - Redis for real-time data

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce `TAG_PROCESSING_BATCH_SIZE`
   - Increase `EVENT_PROCESSING_INTERVAL`
   - Enable database connection pooling

2. **Reader Connection Issues**
   - Check network connectivity to readers
   - Verify MQTT broker configuration
   - Review reader IP addresses and ports

3. **Event Processing Delays**
   - Monitor queue sizes via health endpoint
   - Check database performance
   - Verify adequate server resources

4. **Tag Collision Issues**
   - Adjust antenna power levels
   - Configure anti-collision algorithms
   - Optimize tag population settings

### Monitoring Commands
```bash
# Check event processing queue
curl http://localhost:3004/api/rfid/health | jq '.data.eventProcessor'

# Monitor reader status
curl http://localhost:3004/api/rfid/readers | jq '.data.statistics'

# View recent alerts
curl http://localhost:3004/api/rfid/alerts?severity=high

# Performance metrics
curl http://localhost:3004/api/rfid/performance
```

## Integration Notes

### With Main Application
1. **Database Integration** - Shared object tables
2. **Authentication** - JWT middleware integration
3. **WebSocket Namespace** - `/rfid` namespace
4. **Event Forwarding** - Cross-service event publishing

### With Phase 3 (Bulk Import)
- Import RFID tag assignments from CSV
- Bulk object creation with tag associations
- Import validation for duplicate tags

### With Phase 6 (Production)
- Performance optimization
- Security hardening
- Monitoring and alerting
- Backup and recovery

## Security Features

- **Reader Authentication** - Secure reader connections
- **Input Validation** - All API endpoints validated
- **Rate Limiting** - Protection against abuse
- **Audit Logging** - Complete event audit trail
- **Network Security** - VPN/firewall configuration

## API Rate Limits

- **General API**: 1000 requests/15 minutes per IP
- **Event Endpoints**: 500 requests/15 minutes per IP
- **Command Endpoints**: 100 requests/15 minutes per IP
- **WebSocket**: 1000 connections per server

## Next Steps

- [ ] Add machine learning for movement prediction
- [ ] Implement advanced collision resolution
- [ ] Create mobile app for handheld readers
- [ ] Add geofencing capabilities
- [ ] Implement predictive maintenance
- [ ] Create custom dashboard UI

## Support

For technical support or integration questions:
- Check logs in `./logs/` directory
- Review API documentation
- Run integration tests
- Monitor system health endpoints

Phase 5 provides a complete RFID hardware integration foundation ready for production deployment with comprehensive simulation capabilities for development and testing.