import { injectable, inject } from 'tsyringe';
import { Result, ok } from 'neverthrow';
import { IZoneRepository } from '../../interfaces/IZoneRepository';
import { ILogger } from '../../interfaces/ILogger';

/**
 * Get All Zones Use Case (STUB)
 * TODO: Implement actual zone retrieval logic
 */
@injectable()
export class GetAllZonesUseCase {
  constructor(
    @inject('IZoneRepository') private zoneRepository: IZoneRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(): Promise<Result<any[], Error>> {
    this.logger.info('Getting all zones (stub)');

    // Stub implementation - returns empty zones list
    return ok([]);
  }
}
