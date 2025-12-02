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
- `ItemRegisteredNotificationHandler`: Sends confirmation email when item registered
- `ItemMarkedMissingNotificationHandler`: Sends URGENT alerts when item missing
- `ZoneOccupancyAlertHandler`: Sends alerts when zones near capacity

### 2. Statistics Handlers
Update real-time statistics and dashboards
- `ItemStatisticsHandler`: Updates item counts and categories
- `ZoneOccupancyStatisticsHandler`: Updates occupancy charts
- `ReaderPerformanceHandler`: Updates reader uptime and success rates

### 3. Audit Handlers
Log events for compliance and chain-of-custody
- `AuditLogHandler`: Logs all events to audit trail
- `ChainOfCustodyHandler`: Updates chain-of-custody records

### 4. Integration Handlers
Sync data to external systems
- `InventoryManagementSyncHandler`: Syncs to external inventory management system
- `BuildingManagementSyncHandler`: Syncs zone data to building management
- `WebhookHandler`: Sends events to configured webhooks

### 5. Workflow Handlers
Trigger automated workflows
- `QualityCheckWorkflowHandler`: Triggers QA workflow when item registered
- `MissingItemWorkflowHandler`: Initiates search when item marked missing

## Handler Pattern

```typescript
import { injectable, inject } from 'tsyringe';
import type { ILogger } from '../interfaces/ILogger';
import { ItemRegisteredEvent } from '../../domain/events/ItemRegisteredEvent';

/**
 * Example Event Handler
 *
 * Handles: ItemRegisteredEvent
 * Purpose: Send notification email when item is registered
 */
@injectable()
export class ItemRegisteredNotificationHandler {
  constructor(
    @inject('ILogger') private readonly logger: ILogger,
    @inject('IEmailService') private readonly emailService: IEmailService,
    @inject('INotificationConfig') private readonly config: INotificationConfig
  ) {}

  /**
   * Handles ItemRegisteredEvent
   */
  async handle(event: ItemRegisteredEvent): Promise<void> {
    try {
      this.logger.debug('Processing ItemRegisteredEvent', {
        eventId: event.eventId,
        itemNumber: event.itemNumber,
      });

      // Don't send notifications in test mode
      if (this.config.isTestMode) {
        this.logger.debug('Skipping notification in test mode');
        return;
      }

      // Send email to manager
      await this.emailService.send({
        to: this.config.managerEmail,
        subject: `New Item Registered: ${event.itemNumber}`,
        template: 'item-registered',
        data: {
          itemNumber: event.itemNumber,
          referenceId: event.referenceId,
          category: event.category,
          registeredBy: event.registeredBy,
        },
      });

      this.logger.info('Notification sent for item registration', {
        itemNumber: event.itemNumber,
      });
    } catch (error) {
      // IMPORTANT: Don't throw - just log the error
      // Handler errors should not affect the use case
      this.logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: event.eventId,
        itemNumber: event.itemNumber,
      });
    }
  }
}
```

## Handler Best Practices

### 1. **Idempotency**
Handlers may be called multiple times for the same event (due to retries). Make handlers idempotent:

```typescript
async handle(event: ItemRegisteredEvent): Promise<void> {
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
async handle(event: ItemMovedEvent): Promise<void> {
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
describe('ItemRegisteredNotificationHandler', () => {
  it('should send email when item registered', async () => {
    const mockEmail = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const handler = new ItemRegisteredNotificationHandler(
      mockLogger,
      mockEmail,
      mockConfig
    );

    const event = new ItemRegisteredEvent(
      'item-123',
      '12345/25',
      'E280116060002004DECA48DA',
      '25/34/25',
      'equipment'
    );

    await handler.handle(event);

    expect(mockEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('12345/25'),
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
    this.subscribe('ItemRegistered', async (event) => {
      const handler = container.resolve(ItemRegisteredNotificationHandler);
      await handler.handle(event as ItemRegisteredEvent);
    });

    this.subscribe('ItemMarkedMissing', async (event) => {
      const handler = container.resolve(ItemMarkedMissingNotificationHandler);
      await handler.handle(event as ItemMarkedMissingEvent);
    });

    // Register statistics handlers
    this.subscribe('ItemRegistered', async (event) => {
      const handler = container.resolve(ItemStatisticsHandler);
      await handler.handle(event as ItemRegisteredEvent);
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
│ RegisterItemUseCase │
└──────────┬──────────┘
           │
           │ 1. Save item to DB
           ▼
┌─────────────────────┐
│   Item Repository   │
└──────────┬──────────┘
           │
           │ 2. Publish ItemRegisteredEvent
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
