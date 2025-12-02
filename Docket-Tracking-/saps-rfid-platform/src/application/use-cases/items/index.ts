/**
 * Item Use Cases - Central Export
 *
 * @description
 * This is the single import point for all item-related use cases.
 * Use cases encapsulate business logic and orchestrate domain operations.
 *
 * Usage:
 * ```typescript
 * import {
 *   RegisterItemUseCase,
 *   SearchItemsUseCase,
 *   GetItemDetailsUseCase,
 *   GetItemHistoryUseCase,
 *   GetZoneItemsUseCase
 * } from '@/application/use-cases/items';
 *
 * const registerItem = container.resolve(RegisterItemUseCase);
 * const result = await registerItem.execute({ ... });
 * ```
 */

// Registration
export { RegisterItemUseCase } from './RegisterItemUseCase';
export type { RegisterItemInput } from './RegisterItemUseCase';

// Search
export { SearchItemsUseCase } from './SearchItemsUseCase';
export type { SearchItemsInput } from './SearchItemsUseCase';

// Details
export { GetItemDetailsUseCase } from './GetItemDetailsUseCase';
export type { GetItemDetailsInput } from './GetItemDetailsUseCase';

// History
export { GetItemHistoryUseCase } from './GetItemHistoryUseCase';
export type {
  GetItemHistoryInput,
  GetItemHistoryOutput,
  ItemHistoryEntryDTO
} from './GetItemHistoryUseCase';

// Zone Items
export { GetZoneItemsUseCase } from './GetZoneItemsUseCase';
export type {
  GetZoneItemsInput,
  GetZoneItemsOutput
} from './GetZoneItemsUseCase';
