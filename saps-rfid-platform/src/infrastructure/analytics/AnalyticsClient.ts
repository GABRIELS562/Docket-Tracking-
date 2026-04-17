/**
 * Analytics Engine Client
 *
 * TypeScript client for communicating with the Python Spatial Analytics Engine.
 * Provides typed interfaces and error handling for REST API calls.
 *
 * Phase 5: Open3D Integration
 */

import { injectable, inject } from 'tsyringe';

import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * Item position for analysis
 */
export interface AnalyticsItemPosition {
  itemId: string;
  epc: string;
  x: number;
  y: number;
  z: number;
  zoneId: string;
  lastSeen?: Date;
  rssi?: number;
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  clusteringEps?: number;
  clusteringMinSamples?: number;
  overcrowdingThreshold?: number;
}

/**
 * Cluster data from analysis
 */
export interface ClusterData {
  clusterId: number;
  centroid: { x: number; y: number; z: number };
  size: number;
  radius: number;
  density: number;
  itemIds: string[];
  zoneDistribution: Record<string, number>;
}

/**
 * Zone density data
 */
export interface ZoneDensityData {
  zoneId: string;
  zoneName: string;
  itemCount: number;
  capacity: number;
  utilization: number;
  density: number;
  isOvercrowded: boolean;
  priority: string;
  itemsToRelocate: number;
}

/**
 * Hotspot data
 */
export interface HotspotData {
  clusterId: number;
  center: { x: number; y: number; z: number };
  itemCount: number;
  radius: number;
  density: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  type: 'redistribute' | 'investigate' | 'layout_optimization';
  priority: 'high' | 'medium' | 'low';
  sourceZone?: string;
  targetZones?: string[];
  itemsToMove?: number;
  location?: { x: number; y: number; z: number };
  itemCount?: number;
  reason: string;
  impact: string;
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  timestamp: string;
  totalItems: number;
  clusters: ClusterData[];
  zoneDensities: ZoneDensityData[];
  hotspots: HotspotData[];
  overcrowdedZones: string[];
  optimizationSuggestions: OptimizationSuggestion[];
  processingTimeMs: number;
}

/**
 * Three.js export format
 */
export interface ThreeJSExport {
  timestamp: string;
  summary: {
    totalItems: number;
    totalClusters: number;
    hotspotCount: number;
    overcrowdedZones: string[];
    processingTimeMs: number;
  };
  clusters: ThreeJSMesh[];
  hotspots: ThreeJSHotspot[];
  zoneDensities: ThreeJSZoneDensity[];
  suggestions: OptimizationSuggestion[];
  visualization: {
    colorSchemes: {
      zones: Record<string, ColorRGB>;
      severity: Record<string, ColorRGB>;
      heatmapGradient: GradientStop[];
    };
  };
}

interface ThreeJSMesh {
  type: string;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: ColorRGB;
  opacity: number;
  metadata: Record<string, unknown>;
}

interface ThreeJSHotspot {
  type: string;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: ColorRGB;
  severity: string;
  animation: {
    type: string;
    frequency: number;
    amplitude: number;
  };
  metadata: Record<string, unknown>;
}

interface ThreeJSZoneDensity {
  zoneId: string;
  zoneName: string;
  color: ColorRGB;
  utilization: number;
  itemCount: number;
  capacity: number;
  isOvercrowded: boolean;
  priority: string;
  overlay: {
    type: string;
    opacity: number;
  };
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
  hex?: string;
}

interface GradientStop {
  stop: number;
  color: ColorRGB;
}

/**
 * Heatmap cell data
 */
export interface HeatmapCell {
  position: { x: number; y: number; z: number };
  density: number;
  itemCount: number;
}

/**
 * Heatmap export
 */
export interface HeatmapExport {
  type: string;
  geometry: string;
  cells: Array<HeatmapCell & { color: ColorRGB; scale: { x: number; y: number; z: number } }>;
  metadata: {
    cellCount: number;
    cellSize: number;
    maxDensity: number;
  };
}

/**
 * Health status
 */
export interface AnalyticsHealth {
  status: string;
  version: string;
  open3dAvailable: boolean;
  uptimeSeconds: number;
}

/**
 * Client configuration
 */
export interface AnalyticsClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: AnalyticsClientConfig = {
  baseUrl: process.env.ANALYTICS_URL || 'http://localhost:8001',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
};

/**
 * Analytics Engine Client
 *
 * Communicates with the Python Spatial Analytics Engine via REST API.
 */
@injectable()
export class AnalyticsClient {
  private config: AnalyticsClientConfig;
  private lastHealthCheck: AnalyticsHealth | null = null;
  private healthCheckTime: number = 0;

  constructor(@inject('ILogger') private logger: ILogger) {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Configure the client
   */
  configure(config: Partial<AnalyticsClientConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Analytics client configured', { config: this.config });
  }

  /**
   * Check if the analytics engine is healthy
   */
  async healthCheck(): Promise<AnalyticsHealth> {
    // Cache health check for 30 seconds
    const now = Date.now();
    if (this.lastHealthCheck && now - this.healthCheckTime < 30000) {
      return this.lastHealthCheck;
    }

    const response = await this.request<AnalyticsHealth>('GET', '/health');
    this.lastHealthCheck = response;
    this.healthCheckTime = now;
    return response;
  }

  /**
   * Perform spatial analysis on item positions
   */
  async analyze(
    items: AnalyticsItemPosition[],
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    return await this.request<AnalysisResult>('POST', '/api/analyze', {
      items: items.map(this.formatItemPosition),
      options,
    });
  }

  /**
   * Perform analysis and get Three.js-compatible format
   */
  async analyzeForThreeJS(
    items: AnalyticsItemPosition[],
    options?: AnalysisOptions
  ): Promise<ThreeJSExport> {
    return await this.request<ThreeJSExport>('POST', '/api/analyze/threejs', {
      items: items.map(this.formatItemPosition),
      options,
    });
  }

  /**
   * Find clusters in item positions
   */
  async findClusters(
    items: AnalyticsItemPosition[],
    eps?: number,
    minSamples?: number
  ): Promise<{ clusters: ClusterData[]; statistics: Record<string, unknown> }> {
    return await this.request('POST', '/api/clusters', {
      items: items.map(this.formatItemPosition),
      options: { eps, minSamples },
    });
  }

  /**
   * Analyze zone density
   */
  async analyzeDensity(
    items: AnalyticsItemPosition[],
    overcrowdingThreshold?: number
  ): Promise<{
    zoneDensities: ZoneDensityData[];
    statistics: Record<string, unknown>;
    redistributionPlan: Array<Record<string, unknown>>;
  }> {
    return await this.request('POST', '/api/density', {
      items: items.map(this.formatItemPosition),
      options: { overcrowdingThreshold },
    });
  }

  /**
   * Generate density heatmap
   */
  async generateHeatmap(
    items: AnalyticsItemPosition[],
    gridSize: number = 5.0
  ): Promise<HeatmapExport> {
    const url = `/api/heatmap?grid_size=${gridSize}`;
    return await this.request<HeatmapExport>('POST', url, {
      items: items.map(this.formatItemPosition),
    });
  }

  /**
   * Get zone configurations
   */
  async getZones(): Promise<{
    zones: Array<{
      zoneId: string;
      name: string;
      minBounds: { x: number; y: number; z: number };
      maxBounds: { x: number; y: number; z: number };
      capacity: number;
      priority: string;
      center: { x: number; y: number; z: number };
      volume: number;
    }>;
  }> {
    return await this.request('GET', '/api/zones');
  }

  /**
   * Start async analysis
   */
  async analyzeAsync(
    items: AnalyticsItemPosition[],
    taskId: string,
    options?: AnalysisOptions
  ): Promise<{ taskId: string; status: string }> {
    return await this.request('POST', `/api/analyze/async?task_id=${taskId}`, {
      items: items.map(this.formatItemPosition),
      options,
    });
  }

  /**
   * Get async analysis status
   */
  async getAnalysisStatus(
    taskId: string
  ): Promise<{ status: string; result?: AnalysisResult; error?: string }> {
    return await this.request('GET', `/api/analyze/status/${taskId}`);
  }

  /**
   * Format item position for API
   */
  private formatItemPosition(item: AnalyticsItemPosition): Record<string, unknown> {
    return {
      itemId: item.itemId,
      epc: item.epc,
      x: item.x,
      y: item.y,
      z: item.z,
      zoneId: item.zoneId,
      lastSeen: item.lastSeen?.toISOString(),
      rssi: item.rssi ?? -50,
    };
  }

  /**
   * Make HTTP request with retries
   */
  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          signal: controller.signal,
        };

        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Analytics API error: ${response.status} ${response.statusText} - ${errorBody}`
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof Error && error.name === 'AbortError') {
          this.logger.warn('Analytics request timeout', {
            url,
            attempt: attempt + 1,
            timeout: this.config.timeout,
          });
        } else {
          this.logger.warn('Analytics request failed', {
            url,
            attempt: attempt + 1,
            error: lastError.message,
          });
        }

        if (attempt < this.config.retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retryDelay * (attempt + 1))
          );
        }
      }
    }

    this.logger.error('Analytics request failed after retries', {
      url,
      retries: this.config.retries,
      error: lastError?.message,
    });

    throw lastError || new Error('Unknown error');
  }
}
