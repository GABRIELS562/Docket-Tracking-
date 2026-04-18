# ADR-001: Winston for Structured Logging

## Status
Accepted

## Context

The platform requires production-grade logging that:
- Supports structured JSON output for log aggregation systems (ELK, CloudWatch, etc.)
- Provides log levels (error, warn, info, debug)
- Supports tenant-scoped log context for multi-tenant isolation
- Can rotate logs and write to multiple transports (console, file, remote)
- Has minimal performance overhead in high-throughput RFID event processing

The platform processes thousands of tag read events per second, making logging performance critical.

## Decision

We will use **Winston** as the primary logging framework with the following configuration:

### Implementation
```typescript
// src/infrastructure/logging/WinstonLogger.ts
@injectable()
export class WinstonLogger implements ILogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      ]
    });
  }
}
```

### Log Format
All logs follow this JSON structure:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Tag detected",
  "tenantId": "tenant-123",
  "correlationId": "req-456",
  "context": {
    "readerId": "reader-001",
    "epc": "E200001234567890"
  }
}
```

### Interface
```typescript
interface ILogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): ILogger;
}
```

## Consequences

### Positive
- **Structured output**: JSON format integrates with any log aggregation system
- **Performance**: Winston is battle-tested at high volume
- **Flexibility**: Multiple transports for different environments
- **Tenant isolation**: Child loggers include tenant context automatically
- **Type safety**: ILogger interface allows easy mocking in tests

### Negative
- **Dependency**: Adds Winston as a runtime dependency (~1MB)
- **Configuration**: Requires setup for each deployment environment
- **Learning curve**: Team must understand Winston's transport/format system

## Alternatives Considered

### 1. Pino
- **Pros**: Faster than Winston, smaller footprint
- **Cons**: Less mature ecosystem, fewer transports out-of-box
- **Decision**: Winston's maturity and transport ecosystem outweighed raw speed

### 2. Bunyan
- **Pros**: Clean API, good CLI tools
- **Cons**: Less actively maintained, smaller community
- **Decision**: Winston has broader adoption and better TypeScript support

### 3. console.log with custom wrapper
- **Pros**: Zero dependencies
- **Cons**: No structured output, no log levels, no file rotation
- **Decision**: Insufficient for production requirements

## References
- Winston documentation: https://github.com/winstonjs/winston
- Constitution Article IX (Logging requirements)
