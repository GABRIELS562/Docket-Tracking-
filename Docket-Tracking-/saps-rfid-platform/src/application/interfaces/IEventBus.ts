import type { DomainEvent } from '../../domain/events/DomainEvent';

/**
 * Event Bus Interface (Port)
 *
 * @description
 * Defines the contract for event publishing and subscription in the application.
 * This is a **PORT** in Hexagonal Architecture - the interface that domain/application
 * layers depend on, with implementation provided by the infrastructure layer.
 *
 * **Purpose:**
 * - Enable publish/subscribe pattern for decoupling components
 * - Support asynchronous processing of side effects
 * - Enable event-driven architecture
 * - Facilitate integration with external systems
 * - Provide audit trail through event logging
 *
 * **Implementation Options:**
 * - **In-Memory Event Bus**: Simple, fast, for development/testing and single-instance apps
 * - **Redis Pub/Sub**: Fast distributed pub/sub for multi-instance applications
 * - **RabbitMQ**: Message queue with guaranteed delivery, dead-letter queues, and routing
 * - **AWS SNS/SQS**: Fully managed AWS event service with high availability
 * - **Google Cloud Pub/Sub**: Fully managed GCP event streaming
 * - **Azure Service Bus**: Fully managed Azure messaging
 * - **Apache Kafka**: High-throughput distributed event streaming for big data
 *
 * **Event Flow:**
 * 1. Use case performs business logic
 * 2. Use case publishes event via `eventBus.publish(event)`
 * 3. Event bus routes event to all registered subscribers
 * 4. Each subscriber's handler is invoked asynchronously
 * 5. Handlers perform side effects (notifications, stats updates, etc.)
 * 6. Handler errors are logged but don't affect the original use case
 *
 * **Best Practices:**
 * - Publish events AFTER successful database transaction
 * - Don't wait for handler completion (fire-and-forget)
 * - Handlers must be idempotent (may be called multiple times)
 * - Handlers should be fast (<100ms) or use background jobs
 * - Use publishBatch() for related events that must be ordered
 *
 * @example
 * ```typescript
 * // In a use case:
 * @injectable()
 * class RegisterItemUseCase {
 *   constructor(
 *     @inject('IItemRepository') private itemRepo: IItemRepository,
 *     @inject('IEventBus') private eventBus: IEventBus,
 *     @inject('ILogger') private logger: ILogger
 *   ) {}
 *
 *   async execute(input: RegisterItemInput): Promise<Result<ItemDTO, Error>> {
 *     // 1. Business logic
 *     const item = Item.create({...});
 *     await this.itemRepo.save(item);
 *
 *     // 2. Publish event (fire-and-forget)
 *     const event = new ItemRegisteredEvent(
 *       item.getId(),
 *       input.labNumber,
 *       input.rfidEpc,
 *       input.caseNumber,
 *       input.category,
 *       input.receivedBy
 *     );
 *     await this.eventBus.publish(event);
 *
 *     // 3. Return result (don't wait for handlers)
 *     return ok(ItemMapper.toDTO(item));
 *   }
 * }
 * ```
 */
export interface IEventBus {
  /**
   * Publishes a single domain event to all subscribers
   *
   * @param event - The domain event to publish
   * @returns Promise that resolves when event is published to the bus (NOT when handlers complete)
   *
   * @description
   * This method publishes an event to all registered handlers for that event type.
   * The promise resolves as soon as the event is published to the bus, **not** when
   * all handlers have finished processing (fire-and-forget semantics).
   *
   * **Error Handling:**
   * - Publishing errors (bus unavailable) will **reject** the promise
   * - Handler errors are **logged** but don't affect the publisher
   * - Failed handlers may be retried (implementation-dependent)
   * - Consider using dead-letter queues for failed events
   *
   * **Performance Considerations:**
   * - Handlers execute **asynchronously** (don't block the use case)
   * - For high-frequency events (TagDetectedEvent), handlers must be optimized (<10ms)
   * - For slow operations, handlers should queue background jobs
   * - Consider event batching for better throughput
   *
   * **Ordering Guarantees:**
   * - Events from the same use case are NOT guaranteed to be ordered
   * - Use publishBatch() if ordering matters
   * - Consider adding sequence numbers to events if needed
   *
   * @example
   * ```typescript
   * const event = new ItemRegisteredEvent(
   *   'item-123-abc',
   *   'FSL-2025-000123',
   *   'E280116060002004DECA48DA',
   *   'CAS-2025-0456',
   *   'FIREARM',
   *   'Officer Smith'
   * );
   *
   * await eventBus.publish(event);
   * // Event published, handlers will run asynchronously
   * // Use case can continue without waiting
   * ```
   *
   * @throws Error if event bus is unavailable or publishing fails
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple events as an atomic batch
   *
   * @param events - Array of domain events to publish (in order)
   * @returns Promise that resolves when all events are published
   *
   * @description
   * Use this method to publish multiple related events atomically.
   * Either **all** events are published or **none** are (implementation-dependent).
   *
   * **When to use:**
   * - Publishing multiple events from a single use case
   * - Ensuring event ordering for related events (e.g., ItemMoved + ZoneOccupancyChanged)
   * - Better performance than multiple publish() calls (single round-trip)
   * - When events must be processed together
   *
   * **Atomicity:**
   * - **In-memory**: All events published together in same tick
   * - **Message queue**: Transaction or batch API ensures atomicity
   * - **Pub/Sub**: May not guarantee atomicity (check implementation)
   * - If one event fails to publish, all may be rolled back
   *
   * **Ordering:**
   * - Events are published in array order
   * - Subscribers receive events in the same order
   * - Useful for maintaining consistency
   *
   * @example
   * ```typescript
   * // Publish related events atomically
   * const events = [
   *   new ItemMovedEvent(
   *     'item-123',
   *     'FSL-2025-000123',
   *     'zone-examination-001',
   *     'zone-storage-001',
   *     'reader-storage-001',
   *     0.95,
   *     new Date()
   *   ),
   *   new ZoneOccupancyChangedEvent(
   *     'zone-storage-001',
   *     'Evidence Storage A',
   *     341,
   *     342,
   *     500,
   *     'item_added'
   *   ),
   * ];
   *
   * await eventBus.publishBatch(events);
   * // Both events published atomically
   * ```
   *
   * @throws Error if event bus is unavailable or batch publishing fails
   */
  publishBatch(events: DomainEvent[]): Promise<void>;
}
