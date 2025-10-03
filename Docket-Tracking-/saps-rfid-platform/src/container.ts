import 'reflect-metadata';
import { container } from 'tsyringe';
import { config } from './config';

// Interfaces
import { ILogger } from './application/interfaces/ILogger';
import { IEventBus } from './application/interfaces/IEventBus';
import { IDocketRepository } from './application/interfaces/IDocketRepository';
import { IZoneRepository } from './application/interfaces/IZoneRepository';
import { IReaderRepository } from './application/interfaces/IReaderRepository';
import { ILocationHistoryRepository } from './application/interfaces/ILocationHistoryRepository';

// Infrastructure - Logging
import { WinstonLogger } from './infrastructure/logging/WinstonLogger';

// Infrastructure - Events
import { EventEmitterBus } from './infrastructure/events/EventEmitterBus';

// Infrastructure - Metrics
import { PrometheusMetrics } from './infrastructure/metrics/PrometheusMetrics';

// Infrastructure - Database
import { PostgresConnection } from './infrastructure/database/PostgresConnection';

// Infrastructure - RFID
import { LLRPGateway } from './infrastructure/rfid/LLRPGateway';

// Infrastructure - Repositories
import { PostgresDocketRepository } from './infrastructure/database/repositories/PostgresDocketRepository';
import { PostgresZoneRepository } from './infrastructure/database/repositories/PostgresZoneRepository';
import { PostgresReaderRepository } from './infrastructure/database/repositories/PostgresReaderRepository';
import { PostgresLocationHistoryRepository } from './infrastructure/database/repositories/PostgresLocationHistoryRepository';

// Application Services
import { RegisterDocketUseCase } from './application/use-cases/RegisterDocketUseCase';
import { SearchDocketsUseCase } from './application/use-cases/SearchDocketsUseCase';
import { GetDocketByLabNumberUseCase } from './application/use-cases/GetDocketByLabNumberUseCase';
import { GetLocationHistoryUseCase } from './application/use-cases/GetLocationHistoryUseCase';
import { GetAllZonesUseCase } from './application/use-cases/GetAllZonesUseCase';
import { GetZoneDocketsUseCase } from './application/use-cases/GetZoneDocketsUseCase';
import { GetAllReadersUseCase } from './application/use-cases/GetAllReadersUseCase';
import { ProcessTagReadUseCase } from './application/use-cases/ProcessTagReadUseCase';

// Presentation
import { Server } from './presentation/http/Server';
import { SocketServer } from './presentation/websocket/SocketServer';

/**
 * Dependency Injection Container Configuration
 *
 * Registers all services, repositories, and infrastructure components
 * Uses tsyringe for dependency injection
 */

/**
 * Register infrastructure services
 */
function registerInfrastructure(): void {
  // Logger
  container.registerSingleton<ILogger>('ILogger', WinstonLogger);

  // Event Bus
  container.registerSingleton<IEventBus>('IEventBus', EventEmitterBus);

  // Metrics
  container.registerSingleton(PrometheusMetrics);

  // Database Connection
  container.registerSingleton(PostgresConnection);

  // RFID Gateway
  container.registerSingleton(LLRPGateway);
}

/**
 * Register repositories
 */
function registerRepositories(): void {
  container.registerSingleton<IDocketRepository>(
    'IDocketRepository',
    PostgresDocketRepository
  );

  container.registerSingleton<IZoneRepository>(
    'IZoneRepository',
    PostgresZoneRepository
  );

  container.registerSingleton<IReaderRepository>(
    'IReaderRepository',
    PostgresReaderRepository
  );

  container.registerSingleton<ILocationHistoryRepository>(
    'ILocationHistoryRepository',
    PostgresLocationHistoryRepository
  );
}

/**
 * Register application use cases
 */
function registerUseCases(): void {
  // Docket use cases
  container.registerSingleton(RegisterDocketUseCase);
  container.registerSingleton(SearchDocketsUseCase);
  container.registerSingleton(GetDocketByLabNumberUseCase);
  container.registerSingleton(GetLocationHistoryUseCase);

  // Zone use cases
  container.registerSingleton(GetAllZonesUseCase);
  container.registerSingleton(GetZoneDocketsUseCase);

  // Reader use cases
  container.registerSingleton(GetAllReadersUseCase);

  // Tag processing
  container.registerSingleton(ProcessTagReadUseCase);
}

/**
 * Register presentation layer
 */
function registerPresentation(): void {
  // Server configuration
  container.register('ServerConfig', {
    useValue: {
      port: config.server.port,
      corsOrigins: config.server.corsOrigins,
    },
  });

  // HTTP Server
  container.registerSingleton(Server);

  // WebSocket Server
  container.registerSingleton(SocketServer);
}

/**
 * Initialize dependency injection container
 *
 * Call this once at application startup
 */
export function initializeContainer(): void {
  registerInfrastructure();
  registerRepositories();
  registerUseCases();
  registerPresentation();
}

// Export configured container
export { container };
