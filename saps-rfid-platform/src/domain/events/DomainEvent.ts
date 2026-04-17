/**
 * Base class for all domain events
 *
 * @description
 * Domain events are immutable facts about things that happened in the system.
 * They represent significant occurrences within the domain that other parts
 * of the system might care about.
 *
 * **Why Domain Events?**
 * - **Decoupling**: Components don't need to know about each other directly
 * - **Audit Trail**: Every significant event is recorded for compliance
 * - **Async Processing**: Events can be handled in the background
 * - **Event Sourcing**: Events can be replayed to rebuild state
 * - **Integration**: Events can be published to external systems (webhooks, message queues)
 *
 * **Naming Convention**:
 * - Events are named in the past tense (ItemRegistered, not RegisterItem)
 * - Events describe what happened, not what should happen
 * - Events are facts, not commands
 *
 * **Event Properties**:
 * - All events have: eventId, eventType, occurredAt, version
 * - All events are immutable (readonly properties)
 * - All events can be serialized to JSON
 *
 * @example
 * ```typescript
 * class ItemRegisteredEvent extends DomainEvent {
 *   constructor(
 *     public readonly itemId: string,
 *     public readonly itemNumber: string,
 *     public readonly rfidEpc: string
 *   ) {
 *     super('ItemRegistered');
 *   }
 *
 *   protected getPayload(): Record<string, unknown> {
 *     return {
 *       itemId: this.itemId,
 *       itemNumber: this.itemNumber,
 *       rfidEpc: this.rfidEpc,
 *     };
 *   }
 * }
 *
 * // Usage in a use case:
 * const event = new ItemRegisteredEvent(item.getId(), itemNumber, epc);
 * await eventBus.publish(event);
 * ```
 */
export abstract class DomainEvent {
  /**
   * Unique identifier for this event instance
   * Format: {eventType}-{timestamp}-{random}
   * @example "ItemRegistered-1704197531234-a7f3c2d"
   */
  public readonly eventId: string;

  /**
   * When the event occurred (UTC)
   * Set automatically on construction
   */
  public readonly occurredAt: Date;

  /**
   * Version of the event schema (for event evolution)
   * Increment when event structure changes to support versioned handlers
   * @default 1
   */
  public readonly version: number;

  constructor(
    /**
     * Type/name of the event (e.g., 'ItemRegistered')
     * Used for routing to event handlers
     */
    public readonly eventType: string,
    version: number = 1
  ) {
    this.eventId = this.generateEventId();
    this.occurredAt = new Date();
    this.version = version;
  }

  /**
   * Generates a unique event ID
   * Combines event type, timestamp, and random string for uniqueness
   */
  private generateEventId(): string {
    return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Returns a JSON representation of the event
   *
   * @description
   * Serializes the event for:
   * - Storage in event store
   * - Publishing to message queue
   * - Sending via webhooks
   * - Audit logging
   *
   * @returns JSON object with all event data
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      ...this.getPayload(),
    };
  }

  /**
   * Returns the event-specific payload
   *
   * @description
   * Override this in subclasses to include event-specific data.
   * All data should be primitives or serializable objects.
   * Convert Date objects to ISO 8601 strings.
   *
   * @returns Object containing event payload
   */
  protected getPayload(): Record<string, unknown> {
    return {};
  }
}
