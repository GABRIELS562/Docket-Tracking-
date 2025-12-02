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
import { ITenantRepository } from './domain/repositories/ITenantRepository';
import { ITenantUserRepository } from './domain/repositories/ITenantUserRepository';

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
import { PostgresTenantRepository } from './infrastructure/database/repositories/PostgresTenantRepository';
import { PostgresTenantUserRepository } from './infrastructure/database/repositories/PostgresTenantUserRepository';

// Infrastructure - Cache (will be enabled when Redis is configured)
// import { TenantScopedCache } from './infrastructure/cache/TenantScopedCache';

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

// Application Services - Tenants
import { TenantProvisioningService } from './application/services/TenantProvisioningService';

// Presentation - Middleware
import { AuthMiddlewareFactory } from './presentation/http/middleware/authMiddleware';

// Presentation - Controllers
import { TenantController } from './presentation/http/controllers/TenantController';
import { AuthController } from './presentation/http/controllers/AuthController';

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

  // Tenant Repositories
  container.registerSingleton<ITenantRepository>(
    'ITenantRepository',
    PostgresTenantRepository
  );

  container.registerSingleton<ITenantUserRepository>(
    'ITenantUserRepository',
    PostgresTenantUserRepository
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
 * Register tenant and authentication services
 */
function registerTenantServices(): void {
  // JWT Configuration
  const jwtSecret = config.jwt?.secret || process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
  container.register('JwtConfig', {
    useValue: {
      secret: jwtSecret,
      expiresIn: config.jwt?.expiresIn || '24h',
      refreshExpiresIn: config.jwt?.refreshExpiresIn || '7d',
    },
  });

  // Auth Config for AuthMiddlewareFactory
  container.register('AuthConfig', {
    useValue: {
      jwtSecret,
      jwtIssuer: config.jwt?.issuer || 'rfid-inventory-platform',
      jwtAudience: config.jwt?.audience || 'rfid-inventory-api',
    },
  });

  // Tenant Provisioning Service
  container.registerSingleton(TenantProvisioningService);

  // Auth Middleware Factory
  container.registerSingleton(AuthMiddlewareFactory);

  // Controllers
  container.registerSingleton(TenantController);
  container.registerSingleton(AuthController);

  // Tenant-Scoped Cache (requires Redis)
  // Note: Redis client must be registered separately if using cache
  // container.registerSingleton(TenantScopedCache);
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
  registerTenantServices();
  registerPresentation();
}

// Export configured container
export { container };
