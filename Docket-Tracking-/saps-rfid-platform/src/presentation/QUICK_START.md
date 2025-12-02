# Quick Start Guide - Presentation Layer

Get the SAPS RFID Platform API up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- TypeScript 5+ configured
- Dependencies installed (`npm install`)

## Step 1: Install Required Dependencies

```bash
npm install express cors helmet compression morgan
npm install socket.io
npm install express-rate-limit
npm install zod
npm install tsyringe reflect-metadata
npm install neverthrow

# Dev dependencies
npm install -D @types/express @types/cors @types/compression @types/morgan
```

## Step 2: Configure Dependency Injection

Create `src/config/container.ts`:

```typescript
import 'reflect-metadata';
import { container } from 'tsyringe';
import { ConsoleLogger } from '../infrastructure/logging/ConsoleLogger';
import { InMemoryEventBus } from '../infrastructure/events/InMemoryEventBus';
import { PostgresConnection } from '../infrastructure/database/PostgresConnection';
import { LLRPGateway } from '../infrastructure/rfid/LLRPGateway';

// Register logger
container.register('ILogger', {
  useClass: ConsoleLogger,
});

// Register event bus
container.register('IEventBus', {
  useClass: InMemoryEventBus,
});

// Register server config
container.register('ServerConfig', {
  useValue: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
});

// Register database
container.register(PostgresConnection, {
  useValue: new PostgresConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || 'saps_rfid',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  }),
});

// Register RFID gateway
container.register(LLRPGateway, {
  useValue: new LLRPGateway(
    container.resolve('ILogger'),
    container.resolve('IEventBus')
  ),
});

export { container };
```

## Step 3: Create Main Application File

Create `src/index.ts`:

```typescript
import 'reflect-metadata';
import { container } from './config/container';
import { Server } from './presentation/http/Server';
import { SocketServer } from './presentation/websocket/SocketServer';
import { ILogger } from './application/interfaces/ILogger';

async function main() {
  const logger = container.resolve<ILogger>('ILogger');

  try {
    // Start HTTP server
    logger.info('Starting HTTP server...');
    const server = container.resolve(Server);
    await server.start();

    // Start WebSocket server
    logger.info('Starting WebSocket server...');
    const wsServer = container.resolve(SocketServer);
    const httpServer = server.getHttpServer();
    if (httpServer) {
      await wsServer.start(httpServer);
    }

    logger.info('Application started successfully', {
      http: 'http://localhost:3000',
      websocket: 'ws://localhost:3000',
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      await wsServer.stop();
      await server.stop();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

main();
```

## Step 4: Create Environment File

Create `.env`:

```bash
# Server
NODE_ENV=development
PORT=3000

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saps_rfid
DB_USER=postgres
DB_PASSWORD=your_password

# Logging
LOG_LEVEL=debug
```

## Step 5: Update package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  }
}
```

## Step 6: Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production build and run
npm run build
npm start
```

## Step 7: Test the API

### Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 12.5
}
```

### Test Item Creation

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "itemNumber": "12345/25",
    "referenceId": "25/34/25",
    "rfidEpc": "E280116060002004DECA48DA"
  }'
```

### Test Item Search

```bash
curl "http://localhost:3000/api/items?limit=10"
```

### Test WebSocket Connection

Create `test-websocket.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>WebSocket Test</h1>
  <div id="status">Connecting...</div>
  <div id="events"></div>

  <script>
    const socket = io('http://localhost:3000');

    socket.on('connected', (data) => {
      document.getElementById('status').textContent = 'Connected: ' + data.socketId;

      // Subscribe to zones
      socket.emit('subscribe:zones', [1, 2, 3]);
    });

    socket.on('subscribed', (data) => {
      console.log('Subscribed:', data);
    });

    socket.on('tag:detected', (data) => {
      const div = document.getElementById('events');
      div.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>' + div.innerHTML;
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  </script>
</body>
</html>
```

Open `test-websocket.html` in browser and watch for events.

## Common Issues

### Issue: Port already in use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Issue: Database connection failed

1. Check PostgreSQL is running:
   ```bash
   psql -U postgres -h localhost
   ```

2. Verify credentials in `.env`

3. Check database exists:
   ```sql
   CREATE DATABASE saps_rfid;
   ```

### Issue: CORS errors

Add your frontend URL to `CORS_ORIGINS` in `.env`:
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Testing with Postman

Import this collection:

```json
{
  "info": {
    "name": "SAPS RFID Platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Create Item",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/items",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"itemNumber\": \"12345/25\",\n  \"referenceId\": \"25/34/25\",\n  \"rfidEpc\": \"E280116060002004DECA48DA\"\n}"
        }
      }
    },
    {
      "name": "Search Items",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/items?limit=10"
      }
    },
    {
      "name": "Get Zones",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/zones"
      }
    },
    {
      "name": "Get Readers",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/readers"
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

## Next Steps

1. **Add Authentication**: Implement JWT middleware
2. **API Documentation**: Set up Swagger/OpenAPI
3. **Monitoring**: Add Prometheus metrics
4. **Load Testing**: Use k6 or Artillery
5. **Deployment**: Docker containerization

## Troubleshooting

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

Check logs for:
- Database connection status
- WebSocket connections
- Request/response details
- Error stack traces

## Support

For issues or questions:
- Check logs with `LOG_LEVEL=debug`
- Review API documentation in `README.md`
- Test with included examples
- Check health endpoint: `/health/detailed`

---

**Ready to build!** 🚀

Your API is now running at http://localhost:3000
WebSocket server is at ws://localhost:3000
