# Event Handlers

This directory contains event handler implementations that subscribe to domain events and perform side effects.

## Overview

Event handlers are subscribers that react to domain events published by use cases. They enable:
- **Decoupling**: Use cases don't need to know about notifications, statistics, etc.
- **Async Processing**: Side effects happen in the background
- **Scalability**: Handlers can be distributed across multiple workers
- **Flexibility**: Add new functionality without modifying existing code

## Handler Types

### 1. Notification Handlers
Send notifications when events occur (email, SMS, push notifications)
- `DocketRegisteredNotificationHandler`: Sends confirmation email when docket registered
- `DocketMarkedMissingNotificationHandler`: Sends URGENT alerts when docket missing
- `ZoneOccupancyAlertHandler`: Sends alerts when zones near capacity

### 2. Statistics Handlers
Update real-time statistics and dashboards
- `DocketStatisticsHandler`: Updates docket counts and categories
- `ZoneOccupancyStatisticsHandler`: Updates occupancy charts
- `ReaderPerformanceHandler`: Updates reader uptime and success rates

### 3. Audit Handlers
Log events for compliance and chain-of-custody
- `AuditLogHandler`: Logs all events to audit trail
- `ChainOfCustodyHandler`: Updates chain-of-custody records

### 4. Integration Handlers
Sync data to external systems
- `CaseManagementSyncHandler`: Syncs to external case management system
- `BuildingManagementSyncHandler`: Syncs zone data to building management
- `WebhookHandler`: Sends events to configured webhooks

### 5. Workflow Handlers
Trigger automated workflows
- `QualityCheckWorkflowHandler`: Triggers QA workflow when docket registered
- `MissingDocketWorkflowHandler`: Initiates search when docket marked missing

## Handler Pattern

```typescript
import { injectable, inject } from 'tsyringe';
import type { ILogger } from '../interfaces/ILogger';
import { DocketRegisteredEvent } from '../../domain/events/DocketRegisteredEvent';

/**
 * Example Event Handler
 *
 * Handles: DocketRegisteredEvent
 * Purpose: Send notification email when docket is registered
 */
@injectable()
export class DocketRegisteredNotificationHandler {
  constructor(
    @inject('ILogger') private readonly logger: ILogger,
    @inject('IEmailService') private readonly emailService: IEmailService,
    @inject('INotificationConfig') private readonly config: INotificationConfig
  ) {}

  /**
   * Handles DocketRegisteredEvent
   */
  async handle(event: DocketRegisteredEvent): Promise<void> {
    try {
      this.logger.debug('Processing DocketRegisteredEvent', {
        eventId: event.eventId,
        labNumber: event.labNumber,
      });

      // Don't send notifications in test mode
      if (this.config.isTestMode) {
        this.logger.debug('Skipping notification in test mode');
        return;
      }

      // Send email to lab manager
      await this.emailService.send({
        to: this.config.labManagerEmail,
        subject: `New Docket Registered: ${event.labNumber}`,
        template: 'docket-registered',
        data: {
          labNumber: event.labNumber,
          caseNumber: event.caseNumber,
          category: event.category,
          registeredBy: event.registeredBy,
        },
      });

      this.logger.info('Notification sent for docket registration', {
        labNumber: event.labNumber,
      });
    } catch (error) {
      // IMPORTANT: Don't throw - just log the error
      // Handler errors should not affect the use case
      this.logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: event.eventId,
        labNumber: event.labNumber,
      });
    }
  }
}
```

## Handler Best Practices

### 1. **Idempotency**
Handlers may be called multiple times for the same event (due to retries). Make handlers idempotent:

```typescript
async handle(event: DocketRegisteredEvent): Promise<void> {
  // Check if already processed
  const alreadyProcessed = await this.cache.get(`processed:${event.eventId}`);
  if (alreadyProcessed) {
    this.logger.debug('Event already processed', { eventId: event.eventId });
    return;
  }

  // Process event
  await this.doWork(event);

  // Mark as processed
  await this.cache.set(`processed:${event.eventId}`, true, { ttl: 86400 });
}
```

### 2. **Error Handling**
Never throw errors from handlers - they should be resilient:

```typescript
async handle(event: DocketMovedEvent): Promise<void> {
  try {
    await this.updateDashboard(event);
  } catch (error) {
    // Log error but don't throw
    this.logger.error('Dashboard update failed', {
      error: error instanceof Error ? error.message : 'Unknown',
      eventId: event.eventId,
    });

    // Optionally: Queue for retry
    await this.retryQueue.add(event);
  }
}
```

### 3. **Performance**
Keep handlers fast (<100ms) or use background jobs:

```typescript
async handle(event: TagDetectedEvent): Promise<void> {
  // Fast: Update in-memory cache
  this.cache.set(`last-seen:${event.rfidEpc}`, event.timestamp);

  // Slow operations: Queue for background processing
  await this.backgroundJobQueue.add('update-location-history', {
    eventId: event.eventId,
    rfidEpc: event.rfidEpc,
    zoneId: event.zoneId,
  });
}
```

### 4. **Testing**
Test handlers in isolation:

```typescript
describe('DocketRegisteredNotificationHandler', () => {
  it('should send email when docket registered', async () => {
    const mockEmail = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const handler = new DocketRegisteredNotificationHandler(
      mockLogger,
      mockEmail,
      mockConfig
    );

    const event = new DocketRegisteredEvent(
      'docket-123',
      'FSL-2025-000123',
      'E28011606000204DECA48DA',
      'CAS-2025-0456',
      'FIREARM'
    );

    await handler.handle(event);

    expect(mockEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('FSL-2025-000123'),
      })
    );
  });
});
```

## Registration

Handlers are registered in the infrastructure layer:

```typescript
// src/infrastructure/event-bus/InMemoryEventBus.ts
export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Register notification handlers
    this.subscribe('DocketRegistered', async (event) => {
      const handler = container.resolve(DocketRegisteredNotificationHandler);
      await handler.handle(event as DocketRegisteredEvent);
    });

    this.subscribe('DocketMarkedMissing', async (event) => {
      const handler = container.resolve(DocketMarkedMissingNotificationHandler);
      await handler.handle(event as DocketMarkedMissingEvent);
    });

    // Register statistics handlers
    this.subscribe('DocketRegistered', async (event) => {
      const handler = container.resolve(DocketStatisticsHandler);
      await handler.handle(event as DocketRegisteredEvent);
    });

    // Register audit handlers
    this.subscribe('*', async (event) => {
      const handler = container.resolve(AuditLogHandler);
      await handler.handle(event);
    });
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    const allHandlers = [...eventHandlers, ...wildcardHandlers];

    // Execute all handlers (don't wait for completion)
    allHandlers.forEach((handler) => {
      handler(event).catch((error) => {
        console.error('Handler error:', error);
      });
    });
  }

  private subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
}
```

## Event Flow Example

```
┌─────────────────────┐
│ RegisterDocketUseCase│
└──────────┬──────────┘
           │
           │ 1. Save docket to DB
           ▼
┌─────────────────────┐
│  Docket Repository  │
└──────────┬──────────┘
           │
           │ 2. Publish DocketRegisteredEvent
           ▼
┌─────────────────────┐
│     Event Bus       │
└──────────┬──────────┘
           │
           ├─────────────────────────────────┐
           │                                 │
           ▼                                 ▼
┌──────────────────────┐        ┌─────────────────────┐
│ NotificationHandler  │        │ StatisticsHandler   │
└──────────┬───────────┘        └─────────┬───────────┘
           │                              │
           │ 3a. Send email               │ 3b. Update stats
           ▼                              ▼
┌──────────────────────┐        ┌─────────────────────┐
│   Email Service      │        │  Statistics DB      │
└──────────────────────┘        └─────────────────────┘
```

## See Also
- Domain Events: `src/domain/events/`
- Event Bus Interface: `src/application/interfaces/IEventBus.ts`
- Event Bus Implementation: `src/infrastructure/event-bus/`
