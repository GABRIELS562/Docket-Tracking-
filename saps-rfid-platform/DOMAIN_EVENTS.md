# Domain Events Architecture

## Overview

This document describes the domain event system for the SAPS RFID Evidence Tracking Platform. Domain events are immutable facts about things that happened in the system, enabling decoupling, audit trails, and asynchronous processing.

## Event Catalog

### Docket Lifecycle Events

#### 1. DocketRegisteredEvent
**When:** New evidence docket registered in the system
**Subscribers:** Notification Service, Statistics Service, Audit Service, Workflow Service
**Side Effects:** Confirmation email, dashboard update, audit log, quality check workflow

#### 2. DocketMovedEvent
**When:** Docket moves from one zone to another
**Subscribers:** Chain of Custody, Alert Service, Location History, Zone Occupancy, Dashboard
**Side Effects:** Custody record updated, zone alerts, occupancy counters updated, location logged

#### 3. DocketStatusChangedEvent
**When:** Docket status changes (REGISTERED → IN_EXAMINATION → ARCHIVED → DISPOSED)
**Subscribers:** Workflow Service, Notification Service, Dashboard, Audit, Reporting, Integration
**Side Effects:** Workflow triggered, case officer notified, dashboard updated, external systems synced

#### 4. DocketMarkedMissingEvent ⚠️ CRITICAL
**When:** Docket hasn't been detected for extended period (24-72 hours)
**Subscribers:** Alert Service, Notification, Incident Service, Audit, Search, Reporting, Integration
**Side Effects:** URGENT alerts, incident ticket, facility-wide scan, missing report, law enforcement notified

### Zone Events

#### 5. ZoneCreatedEvent
**When:** New zone created in facility
**Subscribers:** Dashboard Service, Statistics Service, Notification, Audit, Configuration, Integration
**Side Effects:** Zone on map, occupancy tracking initialized, policies applied, manager notified

#### 6. ZoneOccupancyChangedEvent
**When:** Zone occupancy count changes (docket added/removed)
**Subscribers:** Alert Service, Dashboard, Capacity Planning, Notification, Reporting, Auto-routing
**Side Effects:** Capacity alerts at 75%/90%/100%, dashboard updated, heat maps recalculated

### Reader Events

#### 7. ReaderRegisteredEvent
**When:** New RFID reader registered in system
**Subscribers:** Monitoring Service, Dashboard, Configuration, Notification, Audit, Statistics, Integration
**Side Effects:** Heartbeat monitoring started, reader on map, default config applied, network monitoring updated

#### 8. ReaderStatusChangedEvent
**When:** Reader status changes (ONLINE ↔ OFFLINE, ERROR, MAINTENANCE)
**Subscribers:** Alert Service, Monitoring Dashboard, Maintenance Service, Zone Service, Statistics, Notification
**Side Effects:** Alerts sent, maintenance ticket, zone marked "partially monitored", uptime stats updated

#### 9. TagDetectedEvent (High Frequency)
**When:** RFID reader detects a tag
**Subscribers:** Location Processor, Dashboard, Zone Occupancy, Audit, Performance Monitor, Alert Service
**Side Effects:** Location aggregation, real-time map update, read counter incremented, raw log to TimescaleDB
**Performance:** Can fire thousands/minute - handlers MUST be <10ms

## Event Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│                                                              │
│  ┌────────────────┐    ┌────────────────┐                  │
│  │ RegisterDocket │    │ ProcessTagRead │                  │
│  │   UseCase      │    │    UseCase     │                  │
│  └───────┬────────┘    └───────┬────────┘                  │
│          │                     │                            │
│          │ publish()           │ publish()                  │
│          ▼                     ▼                            │
│  ┌──────────────────────────────────────┐                  │
│  │         IEventBus (Port)              │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ (Hexagonal boundary)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │    InMemoryEventBus / RedisEventBus   │                  │
│  │    (Adapter - implements IEventBus)   │                  │
│  └──────────────┬───────────────────────┘                  │
│                 │                                            │
│        ┌────────┼─────────┬──────────┬──────────┐          │
│        │        │         │          │          │          │
│        ▼        ▼         ▼          ▼          ▼          │
│  ┌─────────┬─────────┬────────┬─────────┬──────────┐      │
│  │Notification│Statistics│Audit  │Workflow │Integration│    │
│  │ Handler │Handler  │Handler │ Handler │ Handler  │      │
│  └─────────┴─────────┴────────┴─────────┴──────────┘      │
│        │        │         │          │          │          │
│        ▼        ▼         ▼          ▼          ▼          │
│   ┌────────┬────────┬────────┬────────┬────────┐          │
│   │Email   │Redis   │Postgres│BG Queue│Webhook │          │
│   │Service │Cache   │DB      │Service │API     │          │
│   └────────┴────────┴────────┴────────┴────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Event Properties

All events inherit from `DomainEvent` base class:

```typescript
abstract class DomainEvent {
  readonly eventId: string;        // Unique ID: "DocketRegistered-1704197531234-a7f3c2d"
  readonly eventType: string;       // Event name: "DocketRegistered"
  readonly occurredAt: Date;        // Timestamp (UTC)
  readonly version: number;         // Schema version (for evolution)

  toJSON(): Record<string, unknown>; // JSON serialization
}
```

## Usage in Use Cases

### Publishing Single Event

```typescript
@injectable()
export class RegisterDocketUseCase {
  constructor(
    @inject('IDocketRepository') private docketRepo: IDocketRepository,
    @inject('IEventBus') private eventBus: IEventBus,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: RegisterDocketInput): Promise<Result<DocketDTO, Error>> {
    // 1. Business logic
    const docket = Docket.create({...}).unwrap();
    await this.docketRepo.save(docket);

    // 2. Publish event (fire-and-forget)
    const event = new DocketRegisteredEvent(
      docket.getId(),
      input.labNumber,
      input.rfidEpc,
      input.caseNumber,
      input.category,
      input.receivedBy
    );
    await this.eventBus.publish(event);

    // 3. Return immediately (handlers run asynchronously)
    return ok(DocketMapper.toDTO(docket));
  }
}
```

### Publishing Multiple Related Events

```typescript
@injectable()
export class MoveDocketUseCase {
  async execute(input: MoveDocketInput): Promise<Result<void, Error>> {
    // Business logic...

    // Publish related events atomically
    const events = [
      new DocketMovedEvent(
        docket.getId(),
        labNumber,
        fromZoneId,
        toZoneId,
        readerId,
        confidence,
        new Date()
      ),
      new ZoneOccupancyChangedEvent(
        toZoneId,
        toZoneName,
        previousOccupancy,
        currentOccupancy,
        capacity,
        'docket_added'
      ),
    ];

    await this.eventBus.publishBatch(events);

    return ok(undefined);
  }
}
```

## Handler Implementation

### Basic Handler Pattern

```typescript
@injectable()
export class DocketRegisteredNotificationHandler {
  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject('IEmailService') private emailService: IEmailService
  ) {}

  async handle(event: DocketRegisteredEvent): Promise<void> {
    try {
      await this.emailService.send({
        to: 'lab-manager@example.com',
        subject: `New Docket: ${event.labNumber}`,
        template: 'docket-registered',
        data: { ...event.toJSON() },
      });

      this.logger.info('Notification sent', { eventId: event.eventId });
    } catch (error) {
      // NEVER throw from handlers - just log
      this.logger.error('Handler failed', { error, eventId: event.eventId });
    }
  }
}
```

### Handler Best Practices

1. **Idempotency**: Handlers may be called multiple times
   ```typescript
   const cacheKey = `processed:${event.eventId}`;
   if (await cache.get(cacheKey)) return;
   // ... process event
   await cache.set(cacheKey, true, { ttl: 86400 });
   ```

2. **Error Handling**: Never throw - log and optionally retry
   ```typescript
   try {
     await doWork(event);
   } catch (error) {
     logger.error('Handler failed', { error });
     await retryQueue.add(event); // Optional retry
   }
   ```

3. **Performance**: Fast (<100ms) or use background jobs
   ```typescript
   // Fast: Update cache
   cache.set(`last-seen:${epc}`, timestamp);

   // Slow: Queue for background
   await jobQueue.add('process-location', { eventId });
   ```

4. **Testing**: Test in isolation with mocks
   ```typescript
   it('should send email', async () => {
     const mockEmail = { send: jest.fn() };
     const handler = new Handler(mockLogger, mockEmail);
     await handler.handle(event);
     expect(mockEmail.send).toHaveBeenCalled();
   });
   ```

## Event Bus Implementations

### In-Memory (Development/Testing)
```typescript
class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Function[]>();

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    handlers.forEach(h => h(event).catch(console.error));
  }
}
```

### Redis Pub/Sub (Production - Distributed)
```typescript
class RedisEventBus implements IEventBus {
  async publish(event: DomainEvent): Promise<void> {
    await redis.publish(
      `events:${event.eventType}`,
      JSON.stringify(event.toJSON())
    );
  }
}
```

### RabbitMQ (Production - Guaranteed Delivery)
```typescript
class RabbitMQEventBus implements IEventBus {
  async publish(event: DomainEvent): Promise<void> {
    await channel.publish(
      'domain-events',
      event.eventType,
      Buffer.from(JSON.stringify(event.toJSON())),
      { persistent: true }
    );
  }
}
```

## Testing Events

### Unit Testing Events
```typescript
describe('DocketRegisteredEvent', () => {
  it('should serialize to JSON correctly', () => {
    const event = new DocketRegisteredEvent(
      'docket-123',
      'FSL-2025-000123',
      'E280116060002004DECA48DA',
      'CAS-2025-0456',
      'FIREARM'
    );

    const json = event.toJSON();

    expect(json).toMatchObject({
      eventType: 'DocketRegistered',
      labNumber: 'FSL-2025-000123',
      rfidEpc: 'E280116060002004DECA48DA',
    });
  });
});
```

### Integration Testing Event Flow
```typescript
describe('Event Flow', () => {
  it('should publish event when docket registered', async () => {
    const mockEventBus = { publish: jest.fn() };
    const useCase = new RegisterDocketUseCase(
      mockRepo,
      mockEventBus,
      mockLogger
    );

    await useCase.execute(input);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'DocketRegistered' })
    );
  });
});
```

## Monitoring and Observability

### Event Metrics
- Total events published (by type)
- Event publishing latency
- Handler success/failure rates
- Handler execution time
- Dead letter queue size

### Logging
```typescript
logger.info('Event published', {
  eventId: event.eventId,
  eventType: event.eventType,
  occurredAt: event.occurredAt,
  // ... event-specific data
});
```

### Alerting
- Handler failures exceeding threshold
- Dead letter queue growing
- Event publishing failures
- Handler execution time > SLA

## Files Reference

### Domain Events
- Base: `src/domain/events/DomainEvent.ts`
- Docket: `src/domain/events/Docket*.ts`
- Zone: `src/domain/events/Zone*.ts`
- Reader: `src/domain/events/Reader*.ts` + `TagDetectedEvent.ts`
- Index: `src/domain/events/index.ts`

### Application Layer
- Interface: `src/application/interfaces/IEventBus.ts`
- Handlers: `src/application/event-handlers/`
- Handler Examples: `src/application/event-handlers/*.example.ts`
- Handler README: `src/application/event-handlers/README.md`

### Infrastructure Layer (To Be Implemented)
- In-Memory: `src/infrastructure/event-bus/InMemoryEventBus.ts`
- Redis: `src/infrastructure/event-bus/RedisEventBus.ts`
- RabbitMQ: `src/infrastructure/event-bus/RabbitMQEventBus.ts`

## Next Steps

1. **Implement Event Bus**: Choose implementation (Redis, RabbitMQ, etc.)
2. **Create Handlers**: Implement actual notification, statistics, audit handlers
3. **Set Up Monitoring**: Add metrics, logging, alerting
4. **Add Dead Letter Queue**: Handle failed events
5. **Implement Retry Logic**: Exponential backoff for transient failures
6. **Add Event Store**: Optional - store all events for event sourcing
