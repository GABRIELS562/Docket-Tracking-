/**
 * Domain Events - Central Export
 *
 * @description
 * This is the single import point for all domain events.
 * Domain events are immutable facts about things that happened in the system.
 *
 * Usage:
 * ```typescript
 * import { ItemRegisteredEvent, ItemMovedEvent } from '@/domain/events';
 *
 * const event = new ItemRegisteredEvent(
 *   'item-123',
 *   'INV-2025-000123',
 *   'E280116060002004DECA48DA',
 *   'ORD-2025-0456',
 *   'ELECTRONIC'
 * );
 * await eventBus.publish(event);
 * ```
 */

// Base Event
export { DomainEvent } from './DomainEvent';

// Item Lifecycle Events
export { ItemRegisteredEvent } from './ItemRegisteredEvent';
export { ItemMovedEvent } from './ItemMovedEvent';
export { ItemMarkedMissingEvent } from './ItemMarkedMissingEvent';
export { ItemStatusChangedEvent } from './ItemStatusChangedEvent';

// Zone Events
export { ZoneCreatedEvent } from './ZoneCreatedEvent';
export { ZoneOccupancyChangedEvent } from './ZoneOccupancyChangedEvent';

// Reader Events
export { ReaderRegisteredEvent } from './ReaderRegisteredEvent';
export { ReaderStatusChangedEvent } from './ReaderStatusChangedEvent';
export { TagDetectedEvent } from './TagDetectedEvent';
