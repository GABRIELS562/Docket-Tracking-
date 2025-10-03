import { injectable, inject } from 'tsyringe';
import { Result, ok } from 'neverthrow';
import { IReaderRepository } from '../../interfaces/IReaderRepository';
import { ILogger } from '../../interfaces/ILogger';

/**
 * Get All Readers Use Case (STUB)
 * TODO: Implement actual reader retrieval logic
 */
@injectable()
export class GetAllReadersUseCase {
  constructor(
    @inject('IReaderRepository') private readerRepository: IReaderRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(): Promise<Result<any[], Error>> {
    this.logger.info('Getting all readers (stub)');

    // Stub implementation - returns empty readers list
    return ok([]);
  }
}
