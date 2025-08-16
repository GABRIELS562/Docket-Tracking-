/**
 * RFID Hardware Interface Layer
 * Handles communication with physical RFID readers via MQTT/TCP
 */

import mqtt from 'mqtt';
import net from 'net';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export interface RfidReaderConfig {
  id: string;
  name: string;
  type: 'fixed' | 'handheld' | 'gate';
  protocol: 'mqtt' | 'tcp' | 'serial';
  host: string;
  port: number;
  location: {
    zone_id: number;
    x: number;
    y: number;
    z: number;
  };
  antenna_power: number; // dBm
  read_range: number; // meters
  enabled: boolean;
}

export interface RfidTag {
  epc: string; // Electronic Product Code
  tid: string; // Tag ID
  rssi: number; // Received Signal Strength Indicator
  phase: number; // Phase angle
  doppler: number; // Doppler shift (for movement detection)
  antenna: number; // Which antenna detected it
  timestamp: number;
}

export interface RfidReadEvent {
  reader_id: string;
  tag: RfidTag;
  location: {
    zone_id: number;
    estimated_position?: { x: number; y: number; z: number };
  };
  event_type: 'detected' | 'moved' | 'lost';
}

export class RfidHardwareInterface extends EventEmitter {
  private readers: Map<string, RfidReaderConfig> = new Map();
  private connections: Map<string, any> = new Map();
  private mqttClient: mqtt.MqttClient | null = null;
  private tagLastSeen: Map<string, number> = new Map();
  private tagPositionHistory: Map<string, Array<{x: number, y: number, rssi: number, timestamp: number}>> = new Map();
  
  constructor() {
    super();
    this.initializeMqtt();
  }

  /**
   * Initialize MQTT connection for readers using MQTT protocol
   */
  private initializeMqtt(): void {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;

    this.mqttClient = mqtt.connect(brokerUrl, {
      username,
      password,
      reconnectPeriod: 5000,
      connectTimeout: 30000
    });

    this.mqttClient.on('connect', () => {
      logger.info('Connected to MQTT broker for RFID readers');
      this.mqttClient?.subscribe('rfid/+/events');
      this.mqttClient?.subscribe('rfid/+/status');
    });

    this.mqttClient.on('message', (topic, message) => {
      this.handleMqttMessage(topic, message);
    });

    this.mqttClient.on('error', (error) => {
      logger.error('MQTT connection error:', error);
    });
  }

  /**
   * Connect to a physical RFID reader
   */
  async connectReader(config: RfidReaderConfig): Promise<boolean> {
    try {
      this.readers.set(config.id, config);

      switch (config.protocol) {
        case 'mqtt':
          // Already connected via central MQTT broker
          this.mqttClient?.publish(`rfid/${config.id}/config`, JSON.stringify({
            antenna_power: config.antenna_power,
            enabled: config.enabled
          }));
          break;

        case 'tcp':
          const tcpConnection = await this.connectTcpReader(config);
          this.connections.set(config.id, tcpConnection);
          break;

        case 'serial':
          // Serial connection for handheld readers
          const serialConnection = await this.connectSerialReader(config);
          this.connections.set(config.id, serialConnection);
          break;
      }

      logger.info(`Connected to RFID reader: ${config.name} (${config.id})`);
      return true;
    } catch (error) {
      logger.error(`Failed to connect to reader ${config.id}:`, error);
      return false;
    }
  }

  /**
   * Connect to reader via TCP (Impinj Speedway, Zebra FX9600)
   */
  private async connectTcpReader(config: RfidReaderConfig): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      
      socket.connect(config.port, config.host, () => {
        logger.info(`TCP connection established to reader ${config.id}`);
        
        // Send initialization commands (LLRP protocol)
        this.sendLlrpCommand(socket, 'SET_READER_CONFIG', {
          antenna_power: config.antenna_power,
          mode: 'continuous'
        });

        resolve(socket);
      });

      socket.on('data', (data) => {
        this.parseLlrpResponse(config.id, data);
      });

      socket.on('error', (error) => {
        logger.error(`TCP error for reader ${config.id}:`, error);
        reject(error);
      });

      socket.setTimeout(5000);
    });
  }

  /**
   * Connect to handheld reader via serial port
   */
  private async connectSerialReader(config: RfidReaderConfig): Promise<any> {
    // Implementation would use serialport library
    // For now, returning mock connection
    return {
      id: config.id,
      type: 'serial',
      connected: true
    };
  }

  /**
   * Handle MQTT messages from readers
   */
  private handleMqttMessage(topic: string, message: Buffer): void {
    const parts = topic.split('/');
    if (parts.length < 3) return;

    const readerId = parts[1];
    const messageType = parts[2];

    try {
      const data = JSON.parse(message.toString());

      switch (messageType) {
        case 'events':
          this.processRfidRead(readerId, data);
          break;
        case 'status':
          this.updateReaderStatus(readerId, data);
          break;
      }
    } catch (error) {
      logger.error('Error parsing MQTT message:', error);
    }
  }

  /**
   * Process RFID tag read event
   */
  private processRfidRead(readerId: string, data: any): void {
    const reader = this.readers.get(readerId);
    if (!reader) return;

    const tag: RfidTag = {
      epc: data.epc,
      tid: data.tid || data.epc,
      rssi: data.rssi,
      phase: data.phase || 0,
      doppler: data.doppler || 0,
      antenna: data.antenna || 1,
      timestamp: Date.now()
    };

    // Determine event type
    const lastSeen = this.tagLastSeen.get(tag.epc);
    const now = Date.now();
    let eventType: 'detected' | 'moved' | 'lost' = 'detected';

    if (lastSeen) {
      if (now - lastSeen > 30000) {
        eventType = 'detected'; // Re-detected after being lost
      } else if (Math.abs(tag.doppler) > 0.5) {
        eventType = 'moved';
      }
    }

    this.tagLastSeen.set(tag.epc, now);

    // Store position history for triangulation
    this.updateTagPositionHistory(tag.epc, reader.location.x, reader.location.y, tag.rssi);

    // Emit read event
    const event: RfidReadEvent = {
      reader_id: readerId,
      tag,
      location: {
        zone_id: reader.location.zone_id,
        estimated_position: this.triangulatePosition(tag.epc)
      },
      event_type: eventType
    };

    this.emit('tag-read', event);
  }

  /**
   * Update tag position history for triangulation
   */
  private updateTagPositionHistory(epc: string, x: number, y: number, rssi: number): void {
    if (!this.tagPositionHistory.has(epc)) {
      this.tagPositionHistory.set(epc, []);
    }

    const history = this.tagPositionHistory.get(epc)!;
    history.push({ x, y, rssi, timestamp: Date.now() });

    // Keep only last 10 readings for triangulation
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Triangulate tag position based on multiple reader detections
   */
  triangulatePosition(epc: string): { x: number; y: number; z: number } | undefined {
    const history = this.tagPositionHistory.get(epc);
    if (!history || history.length < 3) return undefined;

    // Get recent readings from different readers (last 2 seconds)
    const recentReadings = history.filter(h => Date.now() - h.timestamp < 2000);
    if (recentReadings.length < 3) return undefined;

    // Simple weighted centroid based on RSSI
    // In production, use more sophisticated algorithms like trilateration
    let weightedX = 0, weightedY = 0, totalWeight = 0;

    recentReadings.forEach(reading => {
      // Convert RSSI to distance estimate (simplified)
      const distance = Math.pow(10, (reading.rssi + 30) / -20);
      const weight = 1 / distance;

      weightedX += reading.x * weight;
      weightedY += reading.y * weight;
      totalWeight += weight;
    });

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
      z: 0 // Assume ground level for now
    };
  }

  /**
   * Send LLRP command to reader
   */
  private sendLlrpCommand(socket: net.Socket, command: string, params: any): void {
    // LLRP (Low Level Reader Protocol) implementation
    // This would construct proper LLRP messages
    const message = {
      messageType: command,
      messageId: Date.now(),
      parameters: params
    };

    socket.write(JSON.stringify(message));
  }

  /**
   * Parse LLRP response from reader
   */
  private parseLlrpResponse(readerId: string, data: Buffer): void {
    try {
      // Parse LLRP binary protocol
      // For now, treating as JSON for simplicity
      const response = JSON.parse(data.toString());
      
      if (response.tags) {
        response.tags.forEach((tag: any) => {
          this.processRfidRead(readerId, tag);
        });
      }
    } catch (error) {
      // Handle binary LLRP protocol
      this.parseBinaryLlrp(readerId, data);
    }
  }

  /**
   * Parse binary LLRP messages
   */
  private parseBinaryLlrp(readerId: string, data: Buffer): void {
    // Implementation of binary LLRP protocol parser
    // This would extract tag reads from binary data
    logger.debug(`Received binary data from reader ${readerId}: ${data.length} bytes`);
  }

  /**
   * Update reader status
   */
  private updateReaderStatus(readerId: string, status: any): void {
    const reader = this.readers.get(readerId);
    if (reader) {
      this.emit('reader-status', {
        reader_id: readerId,
        status: status.online ? 'online' : 'offline',
        antenna_status: status.antennas,
        temperature: status.temperature,
        uptime: status.uptime
      });
    }
  }

  /**
   * Start inventory scan on specific reader
   */
  async startInventory(readerId: string): Promise<void> {
    const reader = this.readers.get(readerId);
    if (!reader) throw new Error(`Reader ${readerId} not found`);

    switch (reader.protocol) {
      case 'mqtt':
        this.mqttClient?.publish(`rfid/${readerId}/command`, JSON.stringify({
          command: 'START_INVENTORY',
          mode: 'continuous'
        }));
        break;

      case 'tcp':
        const socket = this.connections.get(readerId);
        if (socket) {
          this.sendLlrpCommand(socket, 'START_ROSPEC', {});
        }
        break;
    }
  }

  /**
   * Stop inventory scan
   */
  async stopInventory(readerId: string): Promise<void> {
    const reader = this.readers.get(readerId);
    if (!reader) throw new Error(`Reader ${readerId} not found`);

    switch (reader.protocol) {
      case 'mqtt':
        this.mqttClient?.publish(`rfid/${readerId}/command`, JSON.stringify({
          command: 'STOP_INVENTORY'
        }));
        break;

      case 'tcp':
        const socket = this.connections.get(readerId);
        if (socket) {
          this.sendLlrpCommand(socket, 'STOP_ROSPEC', {});
        }
        break;
    }
  }

  /**
   * Set reader antenna power
   */
  async setAntennaPower(readerId: string, power: number): Promise<void> {
    const reader = this.readers.get(readerId);
    if (!reader) throw new Error(`Reader ${readerId} not found`);

    reader.antenna_power = power;

    switch (reader.protocol) {
      case 'mqtt':
        this.mqttClient?.publish(`rfid/${readerId}/config`, JSON.stringify({
          antenna_power: power
        }));
        break;

      case 'tcp':
        const socket = this.connections.get(readerId);
        if (socket) {
          this.sendLlrpCommand(socket, 'SET_READER_CONFIG', {
            antenna_power: power
          });
        }
        break;
    }
  }

  /**
   * Get all connected readers
   */
  getReaders(): RfidReaderConfig[] {
    return Array.from(this.readers.values());
  }

  /**
   * Disconnect all readers
   */
  async disconnect(): Promise<void> {
    // Close MQTT connection
    if (this.mqttClient) {
      this.mqttClient.end();
    }

    // Close TCP connections
    for (const [id, connection] of this.connections) {
      if (connection.destroy) {
        connection.destroy();
      }
    }

    this.readers.clear();
    this.connections.clear();
    this.tagLastSeen.clear();
    this.tagPositionHistory.clear();
  }
}