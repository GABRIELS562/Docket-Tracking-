/**
 * Application Layer Mappers - Central Export
 *
 * @description
 * This is the single import point for all mappers.
 * Mappers provide bidirectional conversion between domain entities and DTOs.
 *
 * All mappers:
 * - Are stateless utility classes with static methods
 * - Support entity → DTO conversion (always succeeds)
 * - Support DTO → entity conversion (returns Result<Entity, Error>)
 * - Handle validation during DTO → entity conversion
 *
 * Usage:
 * ```typescript
 * import { DocketMapper, ZoneMapper } from '@/application/mappers';
 *
 * // Entity to DTO (for API responses)
 * const dto = DocketMapper.toDTO(docket);
 *
 * // DTO to Entity (for API requests)
 * const result = DocketMapper.fromCreateDTO(createDTO, generatedId);
 * if (result.isOk()) {
 *   const docket = result.value;
 * }
 * ```
 */

export { DocketMapper } from './DocketMapper';
export { ZoneMapper } from './ZoneMapper';
export { ReaderMapper } from './ReaderMapper';
export { LocationHistoryMapper } from './LocationHistoryMapper';
