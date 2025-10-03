import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';
import { IDocketRepository } from '../../interfaces/IDocketRepository';
import { ILogger } from '../../interfaces/ILogger';
import { NotFoundError } from '../../../shared/errors/NotFoundError';

interface GetDocketDetailsInput {
  labNumber: string;
}

/**
 * Get Docket Details Use Case (STUB)
 * TODO: Implement actual retrieval logic
 */
@injectable()
export class GetDocketDetailsUseCase {
  constructor(
    @inject('IDocketRepository') private docketRepository: IDocketRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: GetDocketDetailsInput): Promise<Result<any, Error>> {
    this.logger.info('Getting docket details (stub)', { labNumber: input.labNumber });

    // Stub implementation - returns not found
    return err(new NotFoundError(`Docket ${input.labNumber} not found (stub)`));
  }
}
