/**
 * Domain Events - Central Export
 *
 * @description
 * This is the single import point for all domain events.
 * Domain events are immutable facts about things that happened in the system.
 *
 * Usage:
 * ```typescript
 * import { DocketRegisteredEvent, DocketMovedEvent } from '@/domain/events';
 *
 * const event = new DocketRegisteredEvent(
 *   'docket-123',
 *   'FSL-2025-000123',
 *   'E28011606000204DECA48DA',
 *   'CAS-2025-0456',
 *   'FIREARM'
 * );
 * await eventBus.publish(event);
 * ```
 */

// Base Event
export { DomainEvent } from './DomainEvent';

// Docket Lifecycle Events
export { DocketRegisteredEvent } from './DocketRegisteredEvent';
export { DocketMovedEvent } from './DocketMovedEvent';
export { DocketMarkedMissingEvent } from './DocketMarkedMissingEvent';
export { DocketStatusChangedEvent } from './DocketStatusChangedEvent';

// Zone Events
export { ZoneCreatedEvent } from './ZoneCreatedEvent';
export { ZoneOccupancyChangedEvent } from './ZoneOccupancyChangedEvent';

// Reader Events
export { ReaderRegisteredEvent } from './ReaderRegisteredEvent';
export { ReaderStatusChangedEvent } from './ReaderStatusChangedEvent';
export { TagDetectedEvent } from './TagDetectedEvent';
