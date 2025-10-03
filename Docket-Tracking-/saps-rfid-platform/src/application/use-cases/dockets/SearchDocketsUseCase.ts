import { injectable, inject } from 'tsyringe';
import { Result, ok } from 'neverthrow';
import { IDocketRepository } from '../../interfaces/IDocketRepository';
import { ILogger } from '../../interfaces/ILogger';

interface SearchDocketsInput {
  query?: string;
  status?: string;
  zoneId?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SearchDocketsOutput {
  dockets: any[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Search Dockets Use Case (STUB)
 * TODO: Implement actual search logic
 */
@injectable()
export class SearchDocketsUseCase {
  constructor(
    @inject('IDocketRepository') private docketRepository: IDocketRepository,
    @inject('ILogger') private logger: ILogger
  ) {}

  async execute(input: SearchDocketsInput): Promise<Result<SearchDocketsOutput, Error>> {
    this.logger.info('Searching dockets (stub)', { input });

    // Stub implementation - returns empty results
    return ok({
      dockets: [],
      total: 0,
      limit: input.limit || 10,
      offset: input.offset || 0,
      hasMore: false,
    });
  }
}
