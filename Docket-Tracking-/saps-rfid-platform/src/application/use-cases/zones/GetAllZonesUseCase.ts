import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';
import type { Zone } from '../../../domain/entities/Zone';

/**
 * Input for getting all zones
 */
export interface GetAllZonesInput {
  /**
   * Tenant ID for multi-tenant isolation (REQUIRED)
   */
  readonly tenantId: string;

  /**
   * Whether to return only active zones (default: false)
   */
  readonly activeOnly?: boolean;
}

/**
 * Zone DTO for API response
 */
export interface ZoneDTO {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly type: string;
  readonly parentZoneId: string | null;
  readonly capacity: number | null;
  readonly currentOccupancy: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Use Case: Get All Zones
 *
 * @description
 * Retrieves all zones for a tenant with optional active filter.
 *
 * @example
 * ```typescript
 * const useCase = container.resolve(GetAllZonesUseCase);
 *
 * const result = await useCase.execute({
 *   tenantId: 'tenant-uuid',
 *   activeOnly: true
 * });
 *
 * if (result.isOk()) {
 *   console.log(`Found ${result.value.length} zones`);
 * }
 * ```
 */
@injectable()
export class GetAllZonesUseCase {
  constructor(
    @inject('IZoneRepository') private readonly zoneRepository: IZoneRepository,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  async execute(input: GetAllZonesInput): Promise<Result<ZoneDTO[], Error>> {
    try {
      this.logger.debug('Getting all zones', { tenantId: input.tenantId, activeOnly: input.activeOnly });

      let zonesResult;
      if (input.activeOnly) {
        zonesResult = await this.zoneRepository.findAllActive(input.tenantId);
      } else {
        zonesResult = await this.zoneRepository.findAll(input.tenantId);
      }

      if (zonesResult.isErr()) {
        this.logger.error('Failed to fetch zones', {
          tenantId: input.tenantId,
          error: zonesResult.error.message,
        });
        return err(zonesResult.error);
      }

      const zones = zonesResult.value;
      const zoneDTOs: ZoneDTO[] = zones.map((zone: Zone) => ({
        id: zone.getId(),
        name: zone.getName(),
        code: zone.getCode(),
        type: zone.getType(),
        parentZoneId: zone.getParentZoneId(),
        capacity: zone.getCapacity(),
        currentOccupancy: zone.getCurrentOccupancy(),
        isActive: zone.isActive(),
        createdAt: zone.getCreatedAt().toISOString(),
        updatedAt: zone.getUpdatedAt().toISOString(),
      }));

      this.logger.info('Zones retrieved', {
        tenantId: input.tenantId,
        count: zoneDTOs.length,
        activeOnly: input.activeOnly,
      });

      return ok(zoneDTOs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error in GetAllZonesUseCase', { error: message });
      return err(new Error(`Failed to get zones: ${message}`));
    }
  }
}
