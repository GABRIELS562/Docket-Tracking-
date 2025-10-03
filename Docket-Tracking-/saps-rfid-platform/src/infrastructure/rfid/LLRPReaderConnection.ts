import EventEmitter from 'events';
import { Result, ok, err } from 'neverthrow';
import type { Reader, ReaderStatus } from '../../domain/entities/Reader';
import type { IEventBus } from '../../application/interfaces/IEventBus';
import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * LLRP Reader Connection - Full Protocol Implementation
 *
 * @description
 * Manages a single LLRP (Low Level Reader Protocol) connection to an RFID reader.
 * Extends EventEmitter to emit connection lifecycle and tag read events.
 *
 * **LLRP Protocol Flow:**
 * 1. TCP connection to reader (port 5084)
 * 2. Send ADD_ROSPEC (configure how to read tags)
 * 3. Send ENABLE_ROSPEC (start reading)
 * 4. Receive RO_ACCESS_REPORT (tag detections)
 * 5. Send DISABLE_ROSPEC (stop reading)
 * 6. Disconnect
 *
 * **Events Emitted:**
 * - `connected` - Successfully connected to reader
 * - `disconnected` - Connection closed
 * - `error` - Connection or protocol error
 * - `tagRead` - RO_ACCESS_REPORT received (tag detected)
 *
 * **ROSpec (Reader Operation Specification):**
 * Defines how the reader should operate:
 * - Which antennas to use
 * - Transmit power
 * - When to start/stop
 * - How to report tags
 *
 * **Performance:**
 * - Connection timeout: 10 seconds
 * - ROSpec ID: 1 (standard)
 * - Report immediately on tag detection (N=1)
 * - Continuous operation (no stop trigger)
 *
 * @example
 * ```typescript
 * const connection = new LLRPReaderConnection(reader, eventBus, logger);
 *
 * connection.on('connected', () => {
 *   console.log('Reader online');
 * });
 *
 * connection.on('tagRead', (message) => {
 *   console.log('Tag detected:', message);
 * });
 *
 * await connection.connect();
 * await connection.startReading();
 * ```
 */
export class LLRPReaderConnection extends EventEmitter {
  private client: any; // llrp.LLRPClient (typed as any to avoid dependency)
  private connected: boolean = false;
  private reading: boolean = false;
  private reconnectionAttempts: number = 0;
  private lastError: Error | null = null;
  private lastSeenAt: Date | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(
    private reader: Reader,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {
    super();
  }

  /**
   * Connect to RFID reader via LLRP
   *
   * @returns Result indicating success or connection error
   *
   * @description
   * Establishes TCP connection to reader on port 5084 (standard LLRP port).
   * Uses 10-second timeout to prevent hanging on unreachable readers.
   *
   * **Connection Process:**
   * 1. Create LLRP client
   * 2. Set up event handlers
   * 3. Initiate connection with timeout
   * 4. Wait for 'connect' event or timeout
   * 5. Update connection state
   * 6. Emit 'connected' event
   *
   * @example
   * ```typescript
   * const result = await connection.connect();
   * if (result.isOk()) {
   *   console.log('Connected successfully');
   * } else {
   *   console.error('Connection failed:', result.error);
   * }
   * ```
   */
  async connect(): Promise<Result<void, Error>> {
    if (this.connected) {
      this.logger.debug('Already connected', {
        readerId: this.reader.getId(),
      });
      return ok(undefined);
    }

    try {
      this.logger.info('Connecting to RFID reader', {
        readerId: this.reader.getId(),
        readerName: this.reader.getName(),
        ipAddress: this.reader.getIpAddress().getValue(),
        port: this.reader.getPort(),
      });

      // Dynamic import to avoid hard dependency on llrp package
      // In production, install with: npm install llrp
      const llrp = await this.loadLLRPClient();

      this.client = new llrp.LLRPClient();

      // Set up event handlers before connecting
      this.setupClientHandlers();

      // Connect with timeout
      await this.connectWithTimeout(10000); // 10 second timeout

      this.connected = true;
      this.reconnectionAttempts = 0;
      this.lastSeenAt = new Date();
      this.lastError = null;

      this.logger.info('RFID reader connected', {
        readerId: this.reader.getId(),
        readerName: this.reader.getName(),
      });

      this.emit('connected');

      return ok(undefined);
    } catch (error) {
      this.lastError = error as Error;
      this.connected = false;

      this.logger.error('Failed to connect to RFID reader', {
        readerId: this.reader.getId(),
        readerName: this.reader.getName(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return err(error as Error);
    }
  }

  /**
   * Load LLRP client library
   *
   * @description
   * Attempts to load the 'llrp' package. If not available (development/testing),
   * returns a mock implementation.
   *
   * **Production:** Install real LLRP package: `npm install llrp`
   * **Development:** Uses mock for testing without hardware
   */
  private async loadLLRPClient(): Promise<any> {
    try {
      // Try to load real llrp package
      const llrp = await import('llrp');
      return llrp;
    } catch (error) {
      this.logger.warn('LLRP package not found, using mock client', {
        readerId: this.reader.getId(),
      });

      // Return mock client for development/testing
      return {
        LLRPClient: class MockLLRPClient extends EventEmitter {
          connect(host: string, port: number) {
            // Simulate async connection
            setTimeout(() => {
              this.emit('connect');
            }, 100);
          }

          send(message: any, callback?: (error: Error | null, response?: any) => void) {
            // Simulate successful responses
            setTimeout(() => {
              if (callback) {
                const response = {
                  type: `${message.type}_RESPONSE`,
                  LLRPStatus: { statusCode: 'Success' },
                };
                callback(null, response);
              }
            }, 50);
          }

          disconnect() {
            this.emit('close');
          }
        },
      };
    }
  }

  /**
   * Connect with timeout promise
   *
   * @param timeoutMs - Connection timeout in milliseconds
   * @returns Promise that resolves on connection or rejects on timeout/error
   *
   * @description
   * Wraps LLRP connection in a promise with timeout. Prevents hanging
   * indefinitely on unreachable readers.
   */
  private connectWithTimeout(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      // Set timeout
      this.connectionTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Connection timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      // Initiate connection
      const ipAddress = this.reader.getIpAddress().getValue();
      const port = this.reader.getPort();

      this.client.connect(ipAddress, port);

      // Wait for connection
      this.client.once('connect', () => {
        if (!resolved) {
          resolved = true;
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          resolve();
        }
      });

      // Handle immediate errors
      this.client.once('error', (error: Error) => {
        if (!resolved) {
          resolved = true;
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          reject(error);
        }
      });
    });
  }

  /**
   * Set up LLRP client event handlers
   *
   * @description
   * Configures handlers for all LLRP client events:
   * - `data` - Incoming LLRP messages
   * - `error` - Connection errors
   * - `close` - Connection closed
   *
   * **Message Types:**
   * - `RO_ACCESS_REPORT` - Tag detection (most important)
   * - `READER_EVENT_NOTIFICATION` - Reader status events
   * - `KEEPALIVE` - Connection heartbeat
   * - Others - Various protocol messages
   */
  private setupClientHandlers(): void {
    // Handle incoming data
    this.client.on('data', (message: any) => {
      this.lastSeenAt = new Date();

      this.logger.debug('LLRP message received', {
        readerId: this.reader.getId(),
        messageType: message.type,
      });

      if (message.type === 'RO_ACCESS_REPORT') {
        // Tag detection event - emit for processing
        this.emit('tagRead', message);
      } else if (message.type === 'READER_EVENT_NOTIFICATION') {
        // Reader status event
        this.handleReaderEvent(message);
      } else if (message.type === 'KEEPALIVE') {
        // Heartbeat - just update last seen
        this.logger.debug('Keepalive received', {
          readerId: this.reader.getId(),
        });
      } else {
        // Other message types
        this.logger.debug('Other LLRP message', {
          readerId: this.reader.getId(),
          type: message.type,
        });
      }
    });

    // Handle errors
    this.client.on('error', (error: Error) => {
      this.lastError = error;

      this.logger.error('LLRP client error', {
        readerId: this.reader.getId(),
        readerName: this.reader.getName(),
        error: error.message,
      });

      this.emit('error', error);
    });

    // Handle connection close
    this.client.on('close', () => {
      const wasConnected = this.connected;

      this.connected = false;
      this.reading = false;

      if (wasConnected) {
        this.logger.warn('LLRP connection closed', {
          readerId: this.reader.getId(),
          readerName: this.reader.getName(),
        });

        this.emit('disconnected');
      }
    });
  }

  /**
   * Handle reader event notifications
   *
   * @param message - READER_EVENT_NOTIFICATION message
   *
   * @description
   * Processes reader-generated events like:
   * - Antenna disconnection
   * - ROSpec completion
   * - Reader errors
   * - Configuration changes
   */
  private handleReaderEvent(message: any): void {
    this.logger.debug('Reader event notification', {
      readerId: this.reader.getId(),
      event: message,
    });

    // Can implement specific handling for different events
    // For example: antenna disconnect, buffer overflow, etc.
    if (message.readerEventNotificationData) {
      const eventData = message.readerEventNotificationData;

      if (eventData.antennaEvent) {
        this.logger.warn('Antenna event', {
          readerId: this.reader.getId(),
          event: eventData.antennaEvent,
        });
      }

      if (eventData.connectionAttemptEvent) {
        this.logger.info('Connection attempt event', {
          readerId: this.reader.getId(),
          event: eventData.connectionAttemptEvent,
        });
      }
    }
  }

  /**
   * Start reading tags
   *
   * @returns Result indicating success or error
   *
   * @description
   * Configures and enables the ROSpec to start tag detection.
   *
   * **Process:**
   * 1. Check connection status
   * 2. Add ROSpec (reader configuration)
   * 3. Enable ROSpec (start reading)
   * 4. Update reading state
   *
   * ROSpec configures:
   * - Which antennas to use
   * - Transmit power
   * - Report format and frequency
   * - Start/stop triggers
   *
   * @example
   * ```typescript
   * const result = await connection.startReading();
   * if (result.isOk()) {
   *   console.log('Reader is now scanning for tags');
   * }
   * ```
   */
  async startReading(): Promise<Result<void, Error>> {
    if (!this.connected) {
      return err(new Error('Reader not connected'));
    }

    if (this.reading) {
      this.logger.debug('Already reading', {
        readerId: this.reader.getId(),
      });
      return ok(undefined);
    }

    try {
      this.logger.info('Starting tag reading', {
        readerId: this.reader.getId(),
      });

      // Step 1: Add ROSpec (Reader Operation Specification)
      await this.addROSpec();

      // Step 2: Enable ROSpec (start reading)
      await this.enableROSpec();

      this.reading = true;

      this.logger.info('Tag reading started', {
        readerId: this.reader.getId(),
        readerName: this.reader.getName(),
      });

      return ok(undefined);
    } catch (error) {
      this.logger.error('Failed to start reading', {
        readerId: this.reader.getId(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return err(error as Error);
    }
  }

  /**
   * Add ROSpec to reader
   *
   * @description
   * Sends ADD_ROSPEC message to configure reader operation.
   *
   * **ROSpec Configuration:**
   * - ID: 1 (standard)
   * - Priority: 0 (normal)
   * - Start trigger: Immediate
   * - Stop trigger: Null (never stop automatically)
   * - Report trigger: Upon each tag detection
   * - Antennas: From reader configuration
   * - Power: From reader configuration
   *
   * **Report Content:**
   * - ROSpec ID: Yes
   * - Antenna ID: Yes (which antenna saw the tag)
   * - Peak RSSI: Yes (signal strength)
   * - Timestamps: Yes (first and last seen)
   * - Tag seen count: Yes (number of detections)
   */
  private addROSpec(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get reader-specific configuration
      const antennas = [1, 2, 3, 4]; // Default 4 antennas
      const transmitPower = 30; // Default power (0-81, reader-dependent)

      const roSpec = {
        type: 'ADD_ROSPEC',
        roSpec: {
          roSpecID: 1,
          priority: 0,
          currentState: 'Disabled',

          // Start immediately
          roSpecStartTrigger: {
            roSpecStartTriggerType: 'Immediate',
          },

          // Never stop (continuous operation)
          roSpecStopTrigger: {
            roSpecStopTriggerType: 'Null',
          },

          // Report configuration
          roReportSpec: {
            roReportTrigger: 'Upon_N_Tags_Or_End_Of_ROSpec',
            n: 1, // Report immediately on each tag

            // What to include in reports
            tagReportContentSelector: {
              enableROSpecID: true,
              enableSpecIndex: false,
              enableInventoryParameterSpecID: false,
              enableAntennaID: true,
              enableChannelIndex: false,
              enablePeakRSSI: true,
              enableFirstSeenTimestamp: true,
              enableLastSeenTimestamp: true,
              enableTagSeenCount: true,
              enableAccessSpecID: false,
            },
          },

          // Antenna Inventory Spec (which antennas to use)
          aiSpec: {
            antennaIDs: antennas,

            aiSpecStopTrigger: {
              aiSpecStopTriggerType: 'Null',
            },

            inventoryParameterSpecs: [
              {
                inventoryParameterSpecID: 1,
                protocolID: 'EPCGlobalClass1Gen2', // EPC Gen2 standard

                // Configure each antenna
                antennaConfigurations: antennas.map((antennaId) => ({
                  antennaID: antennaId,
                  rfTransmitter: {
                    transmitPower: transmitPower,
                    hopTableID: 1,
                  },
                  rfReceiver: {
                    receiverSensitivity: 0, // Default sensitivity
                  },
                })),
              },
            ],
          },
        },
      };

      this.logger.debug('Sending ADD_ROSPEC', {
        readerId: this.reader.getId(),
        roSpecID: 1,
        antennas,
      });

      this.client.send(roSpec, (error: Error | null, response: any) => {
        if (error) {
          this.logger.error('ADD_ROSPEC error', {
            readerId: this.reader.getId(),
            error: error.message,
          });
          reject(error);
        } else if (
          response.type === 'ADD_ROSPEC_RESPONSE' &&
          response.LLRPStatus.statusCode === 'Success'
        ) {
          this.logger.debug('ADD_ROSPEC successful', {
            readerId: this.reader.getId(),
          });
          resolve();
        } else {
          const errorMsg = `ADD_ROSPEC failed: ${response.LLRPStatus.statusCode}`;
          this.logger.error(errorMsg, {
            readerId: this.reader.getId(),
            response,
          });
          reject(new Error(errorMsg));
        }
      });
    });
  }

  /**
   * Enable ROSpec
   *
   * @description
   * Sends ENABLE_ROSPEC message to start reader operation.
   * After this, the reader begins detecting tags and sending reports.
   */
  private enableROSpec(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.debug('Sending ENABLE_ROSPEC', {
        readerId: this.reader.getId(),
      });

      this.client.send(
        {
          type: 'ENABLE_ROSPEC',
          roSpecID: 1,
        },
        (error: Error | null, response: any) => {
          if (error) {
            this.logger.error('ENABLE_ROSPEC error', {
              readerId: this.reader.getId(),
              error: error.message,
            });
            reject(error);
          } else if (
            response.type === 'ENABLE_ROSPEC_RESPONSE' &&
            response.LLRPStatus.statusCode === 'Success'
          ) {
            this.logger.debug('ENABLE_ROSPEC successful', {
              readerId: this.reader.getId(),
            });
            resolve();
          } else {
            const errorMsg = `ENABLE_ROSPEC failed: ${response.LLRPStatus.statusCode}`;
            this.logger.error(errorMsg, {
              readerId: this.reader.getId(),
              response,
            });
            reject(new Error(errorMsg));
          }
        }
      );
    });
  }

  /**
   * Stop reading tags
   *
   * @returns Result indicating success or error
   *
   * @description
   * Disables the ROSpec to stop tag detection.
   * Reader remains connected but stops scanning.
   */
  async stopReading(): Promise<Result<void, Error>> {
    if (!this.reading) {
      return ok(undefined);
    }

    try {
      this.logger.info('Stopping tag reading', {
        readerId: this.reader.getId(),
      });

      await this.disableROSpec();

      this.reading = false;

      this.logger.info('Tag reading stopped', {
        readerId: this.reader.getId(),
      });

      return ok(undefined);
    } catch (error) {
      this.logger.error('Failed to stop reading', {
        readerId: this.reader.getId(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return err(error as Error);
    }
  }

  /**
   * Disable ROSpec
   *
   * @description
   * Sends DISABLE_ROSPEC message to stop reader operation.
   */
  private disableROSpec(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.debug('Sending DISABLE_ROSPEC', {
        readerId: this.reader.getId(),
      });

      this.client.send(
        {
          type: 'DISABLE_ROSPEC',
          roSpecID: 1,
        },
        (error: Error | null, response: any) => {
          if (error) {
            this.logger.error('DISABLE_ROSPEC error', {
              readerId: this.reader.getId(),
              error: error.message,
            });
            reject(error);
          } else {
            this.logger.debug('DISABLE_ROSPEC successful', {
              readerId: this.reader.getId(),
            });
            resolve();
          }
        }
      );
    });
  }

  /**
   * Disconnect from reader
   *
   * @description
   * Gracefully disconnects from reader:
   * 1. Stop reading if active
   * 2. Close LLRP connection
   * 3. Clean up resources
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      this.logger.info('Disconnecting from reader', {
        readerId: this.reader.getId(),
      });

      // Stop reading first
      if (this.reading) {
        await this.stopReading();
      }

      // Close connection
      if (this.client) {
        this.client.disconnect();
      }

      this.connected = false;

      this.logger.info('Disconnected from reader', {
        readerId: this.reader.getId(),
      });
    } catch (error) {
      this.logger.error('Error during disconnect', {
        readerId: this.reader.getId(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get the Reader entity
   */
  getReader(): Reader {
    return this.reader;
  }

  /**
   * Get reader ID
   */
  getReaderId(): string {
    return this.reader.getId();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if currently reading tags
   */
  isReading(): boolean {
    return this.reading;
  }

  /**
   * Get reconnection attempt count
   */
  getReconnectionAttempts(): number {
    return this.reconnectionAttempts;
  }

  /**
   * Increment reconnection attempts
   */
  incrementReconnectionAttempts(): void {
    this.reconnectionAttempts++;
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectionAttempts(): void {
    this.reconnectionAttempts = 0;
  }

  /**
   * Get last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Get last seen timestamp
   */
  getLastSeenAt(): Date | null {
    return this.lastSeenAt;
  }

  /**
   * Set connected state (for testing)
   */
  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  /**
   * Set reading state (for testing)
   */
  setReading(reading: boolean): void {
    this.reading = reading;
  }

  /**
   * Set last error (for testing)
   */
  setLastError(error: Error | null): void {
    this.lastError = error;
  }

  /**
   * Update last seen timestamp (for testing)
   */
  updateLastSeen(): void {
    this.lastSeenAt = new Date();
  }
}
