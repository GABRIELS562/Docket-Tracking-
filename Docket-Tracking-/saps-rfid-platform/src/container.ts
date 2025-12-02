import 'reflect-metadata';
import { container } from 'tsyringe';
import { config } from './config';

// Interfaces
import { ILogger } from './application/interfaces/ILogger';
import { IEventBus } from './application/interfaces/IEventBus';
import { IItemRepository } from './domain/repositories/IItemRepository';
import { IZoneRepository } from './domain/repositories/IZoneRepository';
import { IReaderRepository } from './domain/repositories/IReaderRepository';
import { ILocationHistoryRepository } from './domain/repositories/ILocationHistoryRepository';

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
import { RFIDSimulator } from './infrastructure/rfid/RFIDSimulator';

// Infrastructure - Repositories
import { PostgresItemRepository } from './infrastructure/database/repositories/PostgresItemRepository';
import { PostgresZoneRepository } from './infrastructure/database/repositories/PostgresZoneRepository';
import { PostgresReaderRepository } from './infrastructure/database/repositories/PostgresReaderRepository';
import { TimescaleLocationHistoryRepository } from './infrastructure/database/repositories/TimescaleLocationHistoryRepository';

// Application Services - Items
import { RegisterItemUseCase } from './application/use-cases/items/RegisterItemUseCase';
import { SearchItemsUseCase } from './application/use-cases/items/SearchItemsUseCase';
import { GetItemDetailsUseCase } from './application/use-cases/items/GetItemDetailsUseCase';
import { GetItemHistoryUseCase } from './application/use-cases/items/GetItemHistoryUseCase';
import { GetZoneItemsUseCase } from './application/use-cases/items/GetZoneItemsUseCase';

// Application Services - Zones
import { GetAllZonesUseCase } from './application/use-cases/zones/GetAllZonesUseCase';

// Application Services - Readers
import { GetAllReadersUseCase } from './application/use-cases/readers/GetAllReadersUseCase';

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
  container.registerSingleton('IMetricsCollector', PrometheusMetrics);

  // Database Connection
  container.registerSingleton<PostgresConnection>('PostgresConnection', PostgresConnection);

  // RFID Gateway
  container.registerSingleton(LLRPGateway);

  // RFID Simulator (for demo/testing)
  container.registerSingleton(RFIDSimulator);
}

/**
 * Register repositories
 */
function registerRepositories(): void {
  // Item Repository
  container.registerSingleton<IItemRepository>(
    'IItemRepository',
    PostgresItemRepository
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
    TimescaleLocationHistoryRepository
  );
}

/**
 * Register application use cases
 */
function registerUseCases(): void {
  // Item use cases
  container.registerSingleton(RegisterItemUseCase);
  container.registerSingleton(SearchItemsUseCase);
  container.registerSingleton(GetItemDetailsUseCase);
  container.registerSingleton(GetItemHistoryUseCase);
  container.registerSingleton(GetZoneItemsUseCase);

  // Zone use cases
  container.registerSingleton(GetAllZonesUseCase);

  // Reader use cases
  container.registerSingleton(GetAllReadersUseCase);
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
