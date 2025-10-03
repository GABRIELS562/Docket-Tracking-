import { EventEmitter } from 'events';
import { injectable, inject } from 'tsyringe';
import { IEventBus } from '../../application/interfaces/IEventBus';
import { DomainEvent } from '../../domain/events/DomainEvent';
import { ILogger } from '../../application/interfaces/ILogger';

/**
 * Event Bus Implementation using Node.js EventEmitter
 *
 * Provides in-process pub/sub for domain events
 *
 * Features:
 * - Type-safe event publishing
 * - Async event handlers
 * - Error handling for handlers
 * - Event logging
 * - Multiple subscribers per event
 *
 * Note: For distributed systems, consider using Redis Pub/Sub or RabbitMQ
 */
@injectable()
export class EventEmitterBus implements IEventBus {
  private emitter: EventEmitter;
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>>;

  constructor(@inject('ILogger') private logger: ILogger) {
    this.emitter = new EventEmitter();
    this.handlers = new Map();

    // Increase max listeners to prevent warnings
    this.emitter.setMaxListeners(100);
  }

  /**
   * Publish a domain event
   *
   * @param event - Domain event to publish
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.eventType;

    this.logger.debug('Publishing event', {
      eventType: eventName,
      eventId: event.eventId,
      aggregateId: event.aggregateId,
    });

    // Get handlers for this event type
    const handlers = this.handlers.get(eventName) || [];

    // Execute all handlers concurrently
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error('Event handler failed', {
          eventType: eventName,
          eventId: event.eventId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't throw - allow other handlers to execute
      }
    });

    await Promise.all(promises);

    this.logger.debug('Event published', {
      eventType: eventName,
      eventId: event.eventId,
      handlerCount: handlers.length,
    });
  }

  /**
   * Subscribe to a domain event
   *
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function
   */
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    this.logger.debug('Subscribing to event', { eventType });

    // Get existing handlers or create new array
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);

    this.logger.info('Subscribed to event', {
      eventType,
      handlerCount: handlers.length,
    });
  }

  /**
   * Unsubscribe from a domain event
   *
   * @param eventType - Type of event to unsubscribe from
   * @param handler - Handler function to remove
   */
  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      return;
    }

    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.logger.debug('Unsubscribed from event', {
        eventType,
        remainingHandlers: handlers.length,
      });

      if (handlers.length === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Get number of handlers for an event type
   *
   * @param eventType - Event type
   * @returns Number of handlers
   */
  getHandlerCount(eventType: string): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.length : 0;
  }

  /**
   * Get all registered event types
   *
   * @returns Array of event type names
   */
  getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all event handlers
   *
   * Useful for testing
   */
  clearAll(): void {
    this.handlers.clear();
    this.emitter.removeAllListeners();
    this.logger.debug('Cleared all event handlers');
  }
}
