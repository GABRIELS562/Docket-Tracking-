import 'reflect-metadata';
import 'dotenv/config';
import { initializeConfig } from './config';
import { initializeContainer, container } from './container';
import { RFIDSimulator } from './infrastructure/rfid/RFIDSimulator';
import { Server } from './presentation/http/Server';
import { SocketServer } from './presentation/websocket/SocketServer';

import type { ILogger } from './application/interfaces/ILogger';
import type { PostgresConnection } from './infrastructure/database/PostgresConnection';
import type { LLRPGateway } from './infrastructure/rfid/LLRPGateway';

/**
 * RFID Inventory Platform - Application Entry Point
 *
 * Initializes and starts all services:
 * 1. Configuration validation
 * 2. Dependency injection
 * 3. Database connection
 * 4. RFID gateway
 * 5. HTTP server
 * 6. WebSocket server
 *
 * Implements graceful shutdown on SIGTERM/SIGINT
 */

let logger: ILogger;
let server: Server;
let wsServer: SocketServer;
let database: PostgresConnection;
let rfidGateway: LLRPGateway;
let rfidSimulator: RFIDSimulator;

/**
 * Main application startup
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting RFID Inventory Platform...');

    // Step 1: Validate environment configuration
    console.log('📋 Validating configuration...');
    initializeConfig();

    // Step 2: Initialize dependency injection container
    console.log('🔧 Initializing container...');
    initializeContainer();

    // Get logger
    logger = container.resolve<ILogger>('ILogger');
    logger.info('Application starting', {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
    });

    // Step 3: Connect to database
    logger.info('Connecting to database...');
    database = container.resolve<PostgresConnection>('PostgresConnection');
    const dbInitResult = await database.initialize();
    if (dbInitResult.isErr()) {
      throw dbInitResult.error;
    }
    logger.info('Database connected successfully');

    // Step 4: Initialize RFID Simulator (Demo Mode)
    // For production with physical readers, replace with LLRPGateway
    logger.info('🎮 Starting RFID Simulator (Demo Mode)...');
    rfidSimulator = container.resolve(RFIDSimulator);
    rfidSimulator.start();
    logger.info('RFID Simulator started - generating realistic tag events');

    // For physical RFID readers, uncomment below and comment out simulator:
    // logger.info('Initializing RFID gateway...');
    // rfidGateway = container.resolve(LLRPGateway);
    // await rfidGateway.connect();
    // logger.info('RFID gateway initialized');

    // Step 5: Start HTTP server
    logger.info('Starting HTTP server...');
    server = container.resolve(Server);
    await server.start();
    logger.info('HTTP server started', { port: server.getPort() });

    // Step 6: Start WebSocket server
    logger.info('Starting WebSocket server...');
    wsServer = container.resolve(SocketServer);
    const httpServer = server.getHttpServer();
    if (httpServer) {
      await wsServer.start(httpServer);
      logger.info('WebSocket server started');
    }

    logger.info('✅ Application started successfully', {
      httpUrl: `http://localhost:${server.getPort()}`,
      wsUrl: `ws://localhost:${server.getPort()}`,
      healthCheck: `http://localhost:${server.getPort()}/health`,
      metricsUrl: `http://localhost:${server.getPort()}/metrics`,
    });

    console.log('\n✅ RFID Inventory Platform is running!\n');
    console.log(`   HTTP API:    http://localhost:${server.getPort()}`);
    console.log(`   WebSocket:   ws://localhost:${server.getPort()}`);
    console.log(`   Health:      http://localhost:${server.getPort()}/health`);
    console.log(`   Metrics:     http://localhost:${server.getPort()}/metrics`);
    console.log('');
    console.log('   🎮 DEMO MODE: RFID Simulator is generating tag events');
    console.log('   📦 Simulated items are moving between warehouse zones');
    console.log('\nPress Ctrl+C to stop\n');
  } catch (error) {
    if (logger) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } else {
      console.error('Failed to start application:', error);
    }
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 *
 * Closes all connections cleanly
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down gracefully...`);

  if (logger) {
    logger.info('Shutdown initiated', { signal });
  }

  try {
    // Stop accepting new connections
    if (wsServer) {
      console.log('Closing WebSocket connections...');
      await wsServer.stop();
      if (logger) logger.info('WebSocket server stopped');
    }

    if (server) {
      console.log('Stopping HTTP server...');
      await server.stop();
      if (logger) logger.info('HTTP server stopped');
    }

    // Stop RFID Simulator
    if (rfidSimulator) {
      console.log('Stopping RFID Simulator...');
      rfidSimulator.stop();
      if (logger) logger.info('RFID Simulator stopped');
    }

    // Shutdown RFID gateway (if using physical readers)
    if (rfidGateway) {
      console.log('Shutting down RFID gateway...');
      await rfidGateway.shutdown();
      if (logger) logger.info('RFID gateway shutdown complete');
    }

    // Close database connections
    if (database) {
      console.log('Closing database connections...');
      await database.close();
      if (logger) logger.info('Database disconnected');
    }

    if (logger) {
      logger.info('Shutdown complete');
    }

    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    if (logger) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    } else {
      console.error('Error during shutdown:', error);
    }
    process.exit(1);
  }
}

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  if (logger) {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  if (logger) {
    logger.error('Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  }
  process.exit(1);
});

/**
 * Graceful shutdown signals
 */
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start application
main();
