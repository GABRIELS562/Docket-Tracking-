import net from 'net';
import mqtt from 'mqtt';
import { EventEmitter } from 'eventemitter3';
import { 
  RfidReader, 
  RfidEvent, 
  ReaderConfiguration,
  ReaderHealthMetrics,
  ZebraFX9600Command,
  ZebraFX9600Response,
  MqttConfig,
  TcpConfig,
  ConnectionInfo,
  ReaderConnectionStatus
} from '../interfaces/RfidTypes';
import { DatabaseService } from './DatabaseService';
import RfidEventProcessor from './RfidEventProcessor';
import { logger } from '../utils/logger';

export class ZebraReaderService extends EventEmitter {
  private readers: Map<string, RfidReader> = new Map();
  private connections: Map<string, net.Socket> = new Map();
  private mqttClients: Map<string, mqtt.MqttClient> = new Map();
  private connectionStatus: Map<string, ConnectionInfo> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.startHealthMonitoring();
  }

  async initialize(): Promise<void> {
    await this.loadReadersFromDatabase();
    await this.connectAllReaders();
    logger.info('Zebra Reader Service initialized');
  }

  private async loadReadersFromDatabase(): Promise<void> {
    const result = await DatabaseService.query(
      'SELECT * FROM rfid_readers WHERE reader_type = $1 AND active = true',
      ['FX9600']
    );

    for (const row of result.rows) {
      const reader: RfidReader = {
        id: row.id,
        readerId: row.reader_id,
        readerName: row.reader_name,
        readerType: row.reader_type,
        ipAddress: row.ip_address,
        port: row.port,
        locationId: row.location_id,
        zone: row.zone,
        antennaCount: row.antenna_count,
        maxPower: row.max_power,
        frequencyRegion: row.frequency_region,
        status: row.status,
        lastPing: row.last_ping,
        lastEvent: row.last_event,
        firmwareVersion: row.firmware_version,
        configuration: row.configuration || {},
        healthMetrics: row.health_metrics || {},
        active: row.active
      };

      this.readers.set(reader.readerId, reader);
      this.connectionStatus.set(reader.readerId, {
        readerId: reader.readerId,
        status: 'disconnected',
        reconnectAttempts: 0
      });
    }

    logger.info(`Loaded ${this.readers.size} FX9600 readers from database`);
  }

  private async connectAllReaders(): Promise<void> {
    const connectionPromises = Array.from(this.readers.values()).map(reader => 
      this.connectReader(reader.readerId)
    );

    await Promise.allSettled(connectionPromises);
  }

  async connectReader(readerId: string): Promise<void> {
    const reader = this.readers.get(readerId);
    if (!reader) {
      throw new Error(`Reader ${readerId} not found`);
    }

    try {
      this.updateConnectionStatus(readerId, 'connecting');
      
      if (process.env.MQTT_ENABLE === 'true') {
        await this.connectMqtt(reader);
      } else {
        await this.connectTcp(reader);
      }

      await this.configureReader(reader);
      await this.startInventory(readerId);
      
      this.updateConnectionStatus(readerId, 'connected');
      await this.updateReaderStatus(readerId, 'online');
      
      logger.info(`Successfully connected to reader ${readerId}`);
      this.emit('reader_connected', { readerId, reader });

    } catch (error) {
      logger.error(`Failed to connect to reader ${readerId}:`, error);
      this.updateConnectionStatus(readerId, 'error', error instanceof Error ? error.message : String(error));
      await this.updateReaderStatus(readerId, 'error');
      
      this.scheduleReconnect(readerId);
    }
  }

  private async connectTcp(reader: RfidReader): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = parseInt(process.env.TCP_TIMEOUT || '5000');

      socket.setTimeout(timeout);

      socket.connect(reader.port, reader.ipAddress, () => {
        logger.info(`TCP connection established to ${reader.readerId} at ${reader.ipAddress}:${reader.port}`);
        this.setupTcpEventHandlers(reader.readerId, socket);
        resolve();
      });

      socket.on('error', (error) => {
        logger.error(`TCP connection error for ${reader.readerId}:`, error);
        reject(error);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Connection timeout for reader ${reader.readerId}`));
      });

      this.connections.set(reader.readerId, socket);
    });
  }

  private async connectMqtt(reader: RfidReader): Promise<void> {
    return new Promise((resolve, reject) => {
      const config: MqttConfig = {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clientId: `${process.env.MQTT_CLIENT_ID || 'rfid-service'}-${reader.readerId}`,
        keepAlive: parseInt(process.env.MQTT_KEEP_ALIVE || '60')
      };

      const client = mqtt.connect(config.brokerUrl, {
        clientId: config.clientId,
        username: config.username,
        password: config.password,
        keepalive: config.keepAlive,
        clean: true,
        reconnectPeriod: 10000
      });

      client.on('connect', () => {
        logger.info(`MQTT connection established for reader ${reader.readerId}`);
        this.setupMqttEventHandlers(reader.readerId, client);
        this.subscribeMqttTopics(reader.readerId, client);
        resolve();
      });

      client.on('error', (error) => {
        logger.error(`MQTT connection error for ${reader.readerId}:`, error);
        reject(error);
      });

      this.mqttClients.set(reader.readerId, client);
    });
  }

  private setupTcpEventHandlers(readerId: string, socket: net.Socket): void {
    socket.on('data', (data) => {
      this.handleReaderData(readerId, data);
    });

    socket.on('close', () => {
      logger.warn(`TCP connection closed for reader ${readerId}`);
      this.updateConnectionStatus(readerId, 'disconnected');
      this.scheduleReconnect(readerId);
    });

    socket.on('error', (error) => {
      logger.error(`TCP socket error for reader ${readerId}:`, error);
      this.updateConnectionStatus(readerId, 'error', error.message);
    });
  }

  private setupMqttEventHandlers(readerId: string, client: mqtt.MqttClient): void {
    client.on('message', (topic, message) => {
      this.handleMqttMessage(readerId, topic, message);
    });

    client.on('close', () => {
      logger.warn(`MQTT connection closed for reader ${readerId}`);
      this.updateConnectionStatus(readerId, 'disconnected');
    });

    client.on('error', (error) => {
      logger.error(`MQTT client error for reader ${readerId}:`, error);
      this.updateConnectionStatus(readerId, 'error', error.message);
    });

    client.on('reconnect', () => {
      logger.info(`MQTT client reconnecting for reader ${readerId}`);
      this.updateConnectionStatus(readerId, 'connecting');
    });
  }

  private subscribeMqttTopics(readerId: string, client: mqtt.MqttClient): void {
    const topics = [
      `zebra/rfid/${readerId}/events`,
      `zebra/rfid/${readerId}/status`,
      `zebra/rfid/${readerId}/health`,
      `zebra/rfid/${readerId}/responses`
    ];

    topics.forEach(topic => {
      client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error(`Failed to subscribe to ${topic}:`, error);
        } else {
          logger.debug(`Subscribed to MQTT topic: ${topic}`);
        }
      });
    });
  }

  private handleMqttMessage(readerId: string, topic: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      
      if (topic.includes('/events')) {
        this.processTagReadEvent(readerId, data);
      } else if (topic.includes('/status')) {
        this.processStatusUpdate(readerId, data);
      } else if (topic.includes('/health')) {
        this.processHealthUpdate(readerId, data);
      } else if (topic.includes('/responses')) {
        this.processCommandResponse(readerId, data);
      }
    } catch (error) {
      logger.error(`Failed to parse MQTT message from ${readerId}:`, error);
    }
  }

  private handleReaderData(readerId: string, data: Buffer): void {
    try {
      const message = data.toString().trim();
      const jsonData = JSON.parse(message);
      
      if (jsonData.type === 'tag_read') {
        this.processTagReadEvent(readerId, jsonData);
      } else if (jsonData.type === 'status') {
        this.processStatusUpdate(readerId, jsonData);
      } else if (jsonData.type === 'health') {
        this.processHealthUpdate(readerId, jsonData);
      }
    } catch (error) {
      logger.error(`Failed to parse TCP data from ${readerId}:`, error);
    }
  }

  private async processTagReadEvent(readerId: string, data: any): Promise<void> {
    try {
      const reader = this.readers.get(readerId);
      if (!reader) return;

      const event: RfidEvent = {
        tagId: data.tagId || data.epc,
        epcCode: data.epc,
        readerId,
        antennaNumber: data.antenna,
        signalStrength: data.rssi || data.peakRssi,
        phase: data.phase,
        frequency: data.frequency,
        eventType: 'read',
        timestamp: new Date(data.timestamp || Date.now()),
        metadata: {
          readCount: data.readCount || 1,
          firstSeenTime: data.firstSeenTime,
          lastSeenTime: data.lastSeenTime,
          doppler: data.doppler,
          tid: data.tid,
          userData: data.userData
        }
      };

      await RfidEventProcessor.processEvent(event);
      await this.updateReaderLastEvent(readerId);

      this.emit('tag_read', { readerId, event });

    } catch (error) {
      logger.error(`Failed to process tag read event from ${readerId}:`, error);
    }
  }

  private async processStatusUpdate(readerId: string, data: any): Promise<void> {
    const status = data.status || 'unknown';
    await this.updateReaderStatus(readerId, status);
    
    this.emit('reader_status_changed', { readerId, status, data });
  }

  private async processHealthUpdate(readerId: string, data: any): Promise<void> {
    const healthMetrics: ReaderHealthMetrics = {
      cpuUsage: data.cpuUsage,
      memoryUsage: data.memoryUsage,
      temperature: data.temperature,
      tagReadRate: data.tagReadRate,
      errorCount: data.errorCount,
      uptime: data.uptime,
      networkLatency: data.networkLatency,
      powerConsumption: data.powerConsumption,
      antennaStatus: data.antennaStatus,
      lastUpdate: new Date()
    };

    await DatabaseService.query(
      'SELECT update_reader_health($1, $2, $3, $4::jsonb)',
      [readerId, 'online', data.responseTime || null, JSON.stringify(healthMetrics)]
    );

    this.emit('reader_health_updated', { readerId, healthMetrics });
  }

  private processCommandResponse(readerId: string, data: any): void {
    this.emit('command_response', { readerId, response: data });
  }

  async configureReader(reader: RfidReader): Promise<void> {
    const config: ReaderConfiguration = reader.configuration || {
      powerLevel: reader.maxPower,
      sensitivity: -70,
      tagPopulation: 32,
      sessionFlag: 1,
      antennaConfig: []
    };

    // Configure antennas
    for (let antenna = 1; antenna <= reader.antennaCount; antenna++) {
      await this.sendCommand(reader.readerId, {
        command: 'set_antenna_config',
        parameters: {
          antenna,
          enabled: true,
          powerLevel: config.powerLevel,
          sensitivity: config.sensitivity
        }
      });
    }

    // Set inventory parameters
    await this.sendCommand(reader.readerId, {
      command: 'set_inventory_config',
      parameters: {
        tagPopulation: config.tagPopulation,
        sessionFlag: config.sessionFlag,
        inventoryMode: 'real_time'
      }
    });

    logger.info(`Reader ${reader.readerId} configured successfully`);
  }

  async startInventory(readerId: string): Promise<void> {
    await this.sendCommand(readerId, {
      command: 'start_inventory',
      parameters: {
        duration: 0, // Continuous
        reportTrigger: 'immediate'
      }
    });

    logger.info(`Started inventory on reader ${readerId}`);
  }

  async stopInventory(readerId: string): Promise<void> {
    await this.sendCommand(readerId, {
      command: 'stop_inventory'
    });

    logger.info(`Stopped inventory on reader ${readerId}`);
  }

  async sendCommand(readerId: string, command: ZebraFX9600Command): Promise<ZebraFX9600Response> {
    const connection = this.connections.get(readerId);
    const mqttClient = this.mqttClients.get(readerId);

    if (!connection && !mqttClient) {
      throw new Error(`No connection available for reader ${readerId}`);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Command timeout for reader ${readerId}`));
      }, 10000);

      const responseHandler = (data: any) => {
        clearTimeout(timeoutId);
        resolve(data.response);
      };

      this.once(`command_response_${readerId}`, responseHandler);

      try {
        const message = JSON.stringify({
          ...command,
          sequenceId: Date.now(),
          timestamp: new Date()
        });

        if (mqttClient) {
          mqttClient.publish(`zebra/rfid/${readerId}/commands`, message);
        } else if (connection) {
          connection.write(message + '\n');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        this.off(`command_response_${readerId}`, responseHandler);
        reject(error);
      }
    });
  }

  private updateConnectionStatus(
    readerId: string, 
    status: ReaderConnectionStatus, 
    errorMessage?: string
  ): void {
    const currentStatus = this.connectionStatus.get(readerId);
    if (!currentStatus) return;

    const now = new Date();
    
    this.connectionStatus.set(readerId, {
      ...currentStatus,
      status,
      errorMessage,
      ...(status === 'connected' && { lastConnected: now }),
      ...(status === 'disconnected' && { lastDisconnected: now }),
      ...(status === 'error' && { reconnectAttempts: currentStatus.reconnectAttempts + 1 })
    });

    this.emit('connection_status_changed', { readerId, status, errorMessage });
  }

  private async updateReaderStatus(readerId: string, status: string): Promise<void> {
    await DatabaseService.query(
      'UPDATE rfid_readers SET status = $1, last_ping = NOW() WHERE reader_id = $2',
      [status, readerId]
    );

    const reader = this.readers.get(readerId);
    if (reader) {
      reader.status = status as any;
      reader.lastPing = new Date();
    }
  }

  private async updateReaderLastEvent(readerId: string): Promise<void> {
    await DatabaseService.query(
      'UPDATE rfid_readers SET last_event = NOW() WHERE reader_id = $1',
      [readerId]
    );

    const reader = this.readers.get(readerId);
    if (reader) {
      reader.lastEvent = new Date();
    }
  }

  private scheduleReconnect(readerId: string): void {
    const existingInterval = this.reconnectIntervals.get(readerId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const reconnectInterval = parseInt(process.env.TCP_RECONNECT_INTERVAL || '10000');
    
    const interval = setInterval(async () => {
      const connectionInfo = this.connectionStatus.get(readerId);
      if (connectionInfo && connectionInfo.status !== 'connected' && connectionInfo.reconnectAttempts < 10) {
        logger.info(`Attempting to reconnect to reader ${readerId}`);
        try {
          await this.connectReader(readerId);
          this.reconnectIntervals.delete(readerId);
          clearInterval(interval);
        } catch (error) {
          logger.error(`Reconnection attempt failed for ${readerId}:`, error);
        }
      } else {
        this.reconnectIntervals.delete(readerId);
        clearInterval(interval);
      }
    }, reconnectInterval);

    this.reconnectIntervals.set(readerId, interval);
  }

  private startHealthMonitoring(): void {
    const interval = parseInt(process.env.READER_HEALTH_CHECK_INTERVAL || '30000');
    
    this.healthCheckInterval = setInterval(async () => {
      for (const readerId of this.readers.keys()) {
        await this.performHealthCheck(readerId);
      }
    }, interval);
  }

  private async performHealthCheck(readerId: string): Promise<void> {
    try {
      const startTime = Date.now();
      await this.sendCommand(readerId, { command: 'get_status' });
      const responseTime = Date.now() - startTime;

      await DatabaseService.query(
        'UPDATE rfid_readers SET last_ping = NOW() WHERE reader_id = $1',
        [readerId]
      );

      this.emit('health_check_completed', { readerId, responseTime });

    } catch (error) {
      logger.warn(`Health check failed for reader ${readerId}:`, error);
      await this.updateReaderStatus(readerId, 'offline');
      this.emit('health_check_failed', { readerId, error });
    }
  }

  async disconnectReader(readerId: string): Promise<void> {
    const connection = this.connections.get(readerId);
    const mqttClient = this.mqttClients.get(readerId);

    if (connection) {
      connection.destroy();
      this.connections.delete(readerId);
    }

    if (mqttClient) {
      mqttClient.end();
      this.mqttClients.delete(readerId);
    }

    this.updateConnectionStatus(readerId, 'disconnected');
    await this.updateReaderStatus(readerId, 'offline');

    logger.info(`Disconnected from reader ${readerId}`);
    this.emit('reader_disconnected', { readerId });
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const interval of this.reconnectIntervals.values()) {
      clearInterval(interval);
    }

    const disconnectPromises = Array.from(this.readers.keys()).map(readerId =>
      this.disconnectReader(readerId)
    );

    await Promise.allSettled(disconnectPromises);
    logger.info('Zebra Reader Service shut down');
  }

  getReaderStatus(readerId?: string) {
    if (readerId) {
      return {
        reader: this.readers.get(readerId),
        connection: this.connectionStatus.get(readerId)
      };
    }

    return {
      readers: Array.from(this.readers.values()),
      connections: Array.from(this.connectionStatus.values())
    };
  }

  getConnectedReaders(): string[] {
    return Array.from(this.connectionStatus.entries())
      .filter(([_, status]) => status.status === 'connected')
      .map(([readerId, _]) => readerId);
  }
}

export default new ZebraReaderService();