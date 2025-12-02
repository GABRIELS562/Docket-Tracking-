import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import type { IReaderRepository } from '../../../domain/repositories/IReaderRepository';
import type { ILogger } from '../../interfaces/ILogger';
import type { Reader } from '../../../domain/entities/Reader';

/**
 * Input for getting all readers
 */
export interface GetAllReadersInput {
  /**
   * Tenant ID for multi-tenant isolation (REQUIRED)
   */
  readonly tenantId: string;

  /**
   * Whether to return only active readers (default: false)
   */
  readonly activeOnly?: boolean;

  /**
   * Whether to return only online readers (default: false)
   */
  readonly onlineOnly?: boolean;
}

/**
 * Reader DTO for API response
 */
export interface ReaderDTO {
  readonly id: string;
  readonly name: string;
  readonly ipAddress: string;
  readonly port: number;
  readonly zoneId: string;
  readonly status: string;
  readonly antennaCount: number;
  readonly readerModel: string | null;
  readonly firmwareVersion: string | null;
  readonly lastConnectedAt: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Use Case: Get All Readers
 *
 * @description
 * Retrieves all RFID readers for a tenant with optional filters.
 *
 * @example
 * ```typescript
 * const useCase = container.resolve(GetAllReadersUseCase);
 *
 * const result = await useCase.execute({
 *   tenantId: 'tenant-uuid',
 *   activeOnly: true,
 *   onlineOnly: true
 * });
 *
 * if (result.isOk()) {
 *   console.log(`Found ${result.value.length} readers`);
 * }
 * ```
 */
@injectable()
export class GetAllReadersUseCase {
  constructor(
    @inject('IReaderRepository') private readonly readerRepository: IReaderRepository,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  async execute(input: GetAllReadersInput): Promise<Result<ReaderDTO[], Error>> {
    try {
      this.logger.debug('Getting all readers', {
        tenantId: input.tenantId,
        activeOnly: input.activeOnly,
        onlineOnly: input.onlineOnly,
      });

      let readersResult;
      if (input.onlineOnly) {
        readersResult = await this.readerRepository.findAllOnline(input.tenantId);
      } else if (input.activeOnly) {
        readersResult = await this.readerRepository.findAllActive(input.tenantId);
      } else {
        readersResult = await this.readerRepository.findAll(input.tenantId);
      }

      if (readersResult.isErr()) {
        this.logger.error('Failed to fetch readers', {
          tenantId: input.tenantId,
          error: readersResult.error.message,
        });
        return err(readersResult.error);
      }

      const readers = readersResult.value;
      const readerDTOs: ReaderDTO[] = readers.map((reader: Reader) => ({
        id: reader.getId(),
        name: reader.getName(),
        ipAddress: reader.getIpAddress().getValue(),
        port: reader.getPort(),
        zoneId: reader.getZoneId(),
        status: reader.getStatus(),
        antennaCount: reader.getAntennaCount(),
        readerModel: reader.getReaderModel(),
        firmwareVersion: reader.getFirmwareVersion(),
        lastConnectedAt: reader.getLastConnectedAt()?.toISOString() ?? null,
        isActive: reader.isActive(),
        createdAt: reader.getCreatedAt().toISOString(),
        updatedAt: reader.getUpdatedAt().toISOString(),
      }));

      this.logger.info('Readers retrieved', {
        tenantId: input.tenantId,
        count: readerDTOs.length,
        activeOnly: input.activeOnly,
        onlineOnly: input.onlineOnly,
      });

      return ok(readerDTOs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error in GetAllReadersUseCase', { error: message });
      return err(new Error(`Failed to get readers: ${message}`));
    }
  }
}
