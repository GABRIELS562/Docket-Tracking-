import { Result, ok, err } from 'neverthrow';
import { Docket, type DocketCategory } from '../../domain/entities/Docket';
import { LabNumber } from '../../domain/value-objects/LabNumber';
import { RfidEpc } from '../../domain/value-objects/RfidEpc';
import { CaseNumber } from '../../domain/value-objects/CaseNumber';
import type { DocketDTO, CreateDocketDTO } from '../dto/DocketDTO';

/**
 * Docket Mapper
 *
 * @description
 * Bidirectional mapper between Docket domain entities and DTOs.
 * Mappers are stateless utility classes with static methods only.
 *
 * Mapping Strategy:
 * - Entity → DTO: Extract all primitive values from value objects, convert dates to ISO 8601 strings
 * - DTO → Entity: Validate and reconstruct value objects, parse ISO 8601 strings to Date objects
 * - Never expose domain objects directly in DTOs
 * - Handle null/undefined gracefully
 * - Return Result<T, Error> for DTO → Entity conversion (may fail validation)
 */
export class DocketMapper {
  /**
   * Converts a Docket entity to a DTO
   *
   * @param docket - The docket domain entity
   * @returns Docket DTO for API response
   *
   * @example
   * ```typescript
   * const docket = Docket.create({ ... }).unwrap();
   * const dto = DocketMapper.toDTO(docket);
   * // dto can be safely serialized to JSON
   * ```
   */
  static toDTO(docket: Docket): DocketDTO {
    const currentZone = docket.getCurrentZone();

    return {
      id: docket.getId(),
      labNumber: docket.getLabNumber().getValue(),
      caseNumber: docket.getCaseNumber().getValue(),
      exhibitNumber: docket.getExhibitNumber(),
      description: docket.getDescription(),
      category: docket.getCategory(),
      rfidEpc: docket.getRfidEpc().getValue(),
      currentZone: currentZone ? {
        id: currentZone.id,
        name: currentZone.name,
        code: currentZone.code,
      } : null,
      status: docket.getStatus(),
      lastSeenReaderId: docket.getLastSeenReaderId(),
      lastSeenAt: docket.getLastSeenAt()?.toISOString() ?? null,
      locationConfidence: docket.getLocationConfidence(),
      receivedBy: docket.getReceivedBy(),
      receivedAt: docket.getReceivedAt()?.toISOString() ?? null,
      createdAt: docket.getCreatedAt().toISOString(),
      updatedAt: docket.getUpdatedAt().toISOString(),
      metadata: docket.getMetadata(),
    };
  }

  /**
   * Converts an array of Docket entities to DTOs
   *
   * @param dockets - Array of docket domain entities
   * @returns Array of Docket DTOs
   */
  static toDTOArray(dockets: Docket[]): DocketDTO[] {
    return dockets.map((docket) => DocketMapper.toDTO(docket));
  }

  /**
   * Converts a CreateDocketDTO to a Docket entity
   *
   * @param dto - The create docket DTO from API request
   * @param generatedId - Generated unique ID for the docket
   * @returns Result with Docket entity or validation error
   *
   * @example
   * ```typescript
   * const result = DocketMapper.fromCreateDTO(dto, 'docket-123-abc');
   * if (result.isOk()) {
   *   const docket = result.value;
   *   // Save docket to repository
   * }
   * ```
   */
  static fromCreateDTO(
    dto: CreateDocketDTO,
    generatedId: string
  ): Result<Docket, Error> {
    // Create value objects (validates format)
    const labNumberResult = LabNumber.create(dto.labNumber);
    if (labNumberResult.isErr()) {
      return err(labNumberResult.error);
    }

    const caseNumberResult = CaseNumber.create(dto.caseNumber);
    if (caseNumberResult.isErr()) {
      return err(caseNumberResult.error);
    }

    const epcResult = RfidEpc.create(dto.rfidEpc);
    if (epcResult.isErr()) {
      return err(epcResult.error);
    }

    // Create docket entity
    return Docket.create({
      id: generatedId,
      labNumber: labNumberResult.value,
      caseNumber: caseNumberResult.value,
      exhibitNumber: dto.exhibitNumber,
      description: dto.description,
      category: dto.category as DocketCategory,
      rfidEpc: epcResult.value,
      receivedBy: dto.receivedBy,
      metadata: dto.metadata,
    });
  }
}
