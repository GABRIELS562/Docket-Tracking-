import { injectable, inject } from 'tsyringe';
import { Result, ok } from 'neverthrow';
import { ILocationHistoryRepository } from '../../interfaces/ILocationHistoryRepository';
import { ILogger } from '../../interfaces/ILogger';

interface GetDocketHistoryInput {
  labNumber: string;
  hours?: number;
}

/**
 * Get Docket History Use Case (STUB)
 * TODO: Implement actual history retrieval logic
 */
@injectable()
export class GetDocketHistoryUseCase {
  constructor(
    @inject('ILocationHistoryRepository') private locationHistoryRepository: ILocationHistoryRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: GetDocketHistoryInput): Promise<Result<any[], Error>> {
    this.logger.info('Getting docket history (stub)', {
      labNumber: input.labNumber,
      hours: input.hours || 24,
    });

    // Stub implementation - returns empty history
    return ok([]);
  }
}
