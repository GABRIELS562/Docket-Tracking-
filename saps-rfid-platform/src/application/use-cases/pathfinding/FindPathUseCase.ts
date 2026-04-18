import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import {
  PathfindingService,
  PathResult,
  PathfindingZone,
  Point,
} from '../../../domain/services/PathfindingService';

import type { IZoneRepository } from '../../../domain/repositories/IZoneRepository';
import type { ILogger } from '../../interfaces/ILogger';

/**
 * Input for finding a path
 */
export interface FindPathInput {
  tenantId: string;
  from:
    | {
        x: number;
        y: number;
      }
    | {
        zoneId: string;
      };
  to:
    | {
        x: number;
        y: number;
      }
    | {
        zoneId: string;
      };
  avoidZones?: string[];
}

/**
 * Input for finding path through multiple zones
 */
export interface FindMultiZonePathInput {
  tenantId: string;
  zoneIds: string[];
}

/**
 * Path response DTO
 */
export interface PathDTO {
  segments: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    zoneId?: string;
    zoneName?: string;
    distance: number;
    estimatedTimeSeconds: number;
  }>;
  totalDistance: number;
  totalTimeSeconds: number;
  zonesTraversed: string[];
  smoothPath: Array<{ x: number; y: number }>;
  isOptimal: boolean;
}

/**
 * Zone connectivity DTO for graph visualization
 */
export interface ZoneGraphDTO {
  nodes: Array<{
    id: string;
    name: string;
    center: { x: number; y: number };
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    restricted: boolean;
  }>;
  edges: Array<{
    from: string;
    to: string;
    distance: number;
    estimatedTimeSeconds: number;
  }>;
}

/**
 * Find Path Use Case
 *
 * Provides pathfinding capabilities for warehouse navigation:
 * - Point-to-point pathfinding
 * - Zone-to-zone pathfinding
 * - Multi-zone route planning
 * - Zone connectivity graph
 *
 * Uses A* algorithm optimized for warehouse environments.
 */
@injectable()
export class FindPathUseCase {
  private pathfinder: PathfindingService;
  private initialized = false;

  // Warehouse grid configuration (100m x 100m warehouse)
  private readonly GRID_SIZE = 100;
  private readonly CELL_SIZE = 1; // 1 meter per cell

  // Default zone layout matching frontend 3D visualization
  private readonly DEFAULT_ZONES: PathfindingZone[] = [
    {
      id: 'receiving',
      name: 'Receiving',
      center: { x: 17, y: 17 },
      bounds: { minX: 3, maxX: 31, minY: 3, maxY: 31 },
      connections: ['storage-a', 'storage-c'],
      restricted: false,
    },
    {
      id: 'storage-a',
      name: 'Storage A',
      center: { x: 17, y: 50 },
      bounds: { minX: 3, maxX: 31, minY: 36, maxY: 64 },
      connections: ['receiving', 'storage-b', 'secure-storage'],
      restricted: false,
    },
    {
      id: 'storage-b',
      name: 'Storage B',
      center: { x: 17, y: 83 },
      bounds: { minX: 3, maxX: 31, minY: 69, maxY: 97 },
      connections: ['storage-a', 'storage-d'],
      restricted: false,
    },
    {
      id: 'storage-c',
      name: 'Storage C',
      center: { x: 50, y: 17 },
      bounds: { minX: 36, maxX: 64, minY: 3, maxY: 31 },
      connections: ['receiving', 'processing', 'secure-storage'],
      restricted: false,
    },
    {
      id: 'secure-storage',
      name: 'Secure Storage',
      center: { x: 50, y: 50 },
      bounds: { minX: 36, maxX: 64, minY: 36, maxY: 64 },
      connections: ['storage-a', 'storage-c', 'storage-d', 'shipping'],
      restricted: true,
    },
    {
      id: 'storage-d',
      name: 'Storage D',
      center: { x: 50, y: 83 },
      bounds: { minX: 36, maxX: 64, minY: 69, maxY: 97 },
      connections: ['storage-b', 'secure-storage', 'returns'],
      restricted: false,
    },
    {
      id: 'processing',
      name: 'Processing',
      center: { x: 83, y: 17 },
      bounds: { minX: 69, maxX: 97, minY: 3, maxY: 31 },
      connections: ['storage-c', 'shipping'],
      restricted: false,
    },
    {
      id: 'shipping',
      name: 'Shipping',
      center: { x: 83, y: 50 },
      bounds: { minX: 69, maxX: 97, minY: 36, maxY: 64 },
      connections: ['processing', 'secure-storage', 'returns'],
      restricted: false,
    },
    {
      id: 'returns',
      name: 'Returns',
      center: { x: 83, y: 83 },
      bounds: { minX: 69, maxX: 97, minY: 69, maxY: 97 },
      connections: ['storage-d', 'shipping'],
      restricted: false,
    },
  ];

  constructor(
    @inject('IZoneRepository') private zoneRepo: IZoneRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.pathfinder = new PathfindingService();
  }

  /**
   * Initialize pathfinding grid for a tenant
   */
  private async initialize(tenantId: string): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load zones from database
      const zonesResult = await this.zoneRepo.findAll(tenantId);

      let zones: PathfindingZone[];

      if (zonesResult.isOk() && zonesResult.value.length > 0) {
        // Convert database zones to pathfinding zones
        zones = zonesResult.value.map((zone) => {
          const coords = zone.getCoordinates();
          const defaultZone = this.DEFAULT_ZONES.find((z) => z.id === zone.getId());

          return {
            id: zone.getId(),
            name: zone.getName(),
            center: coords ? { x: coords.x, y: coords.y } : defaultZone?.center || { x: 50, y: 50 },
            bounds: defaultZone?.bounds || {
              minX: 0,
              maxX: 30,
              minY: 0,
              maxY: 30,
            },
            connections: defaultZone?.connections || [],
            restricted: zone.getZoneType() === 'examination',
          };
        });
      } else {
        // Use default zones
        zones = this.DEFAULT_ZONES;
      }

      // Add pillar obstacles (from warehouse layout)
      const obstacles: Point[] = [];
      for (let x = 10; x <= 90; x += 20) {
        for (let y = 10; y <= 90; y += 20) {
          // Skip center (secure storage)
          if (x === 50 && y === 50) continue;
          obstacles.push({ x, y });
        }
      }

      this.pathfinder.initializeGrid(
        this.GRID_SIZE,
        this.GRID_SIZE,
        zones,
        obstacles,
        this.CELL_SIZE
      );

      this.initialized = true;

      this.logger.info('Pathfinding grid initialized', {
        tenantId,
        gridSize: this.GRID_SIZE,
        zoneCount: zones.length,
        obstacleCount: obstacles.length,
      });
    } catch (error) {
      this.logger.error('Failed to initialize pathfinding', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find path between two points or zones
   */
  async execute(input: FindPathInput): Promise<Result<PathDTO, Error>> {
    const startTime = Date.now();

    try {
      await this.initialize(input.tenantId);

      let fromPoint: Point;
      let toPoint: Point;

      // Resolve 'from' position
      if ('zoneId' in input.from) {
        const fromInput = input.from as { zoneId: string };
        const zone = this.DEFAULT_ZONES.find((z) => z.id === fromInput.zoneId);
        if (!zone) {
          return err(new Error(`Zone ${fromInput.zoneId} not found`));
        }
        fromPoint = zone.center;
      } else {
        fromPoint = input.from;
      }

      // Resolve 'to' position
      if ('zoneId' in input.to) {
        const toInput = input.to as { zoneId: string };
        const zone = this.DEFAULT_ZONES.find((z) => z.id === toInput.zoneId);
        if (!zone) {
          return err(new Error(`Zone ${toInput.zoneId} not found`));
        }
        toPoint = zone.center;
      } else {
        toPoint = input.to;
      }

      // Find path
      const pathResult = this.pathfinder.findPath(fromPoint, toPoint, 'euclidean');

      if (pathResult.isErr()) {
        return err(pathResult.error);
      }

      const path = pathResult.value;

      this.logger.debug('Path found', {
        tenantId: input.tenantId,
        from: fromPoint,
        to: toPoint,
        segments: path.segments.length,
        distance: path.totalDistance,
        durationMs: Date.now() - startTime,
      });

      return ok(this.toDTO(path));
    } catch (error) {
      this.logger.error('Pathfinding failed', {
        tenantId: input.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Find path through multiple zones
   */
  async executeMultiZone(input: FindMultiZonePathInput): Promise<Result<PathDTO, Error>> {
    const startTime = Date.now();

    try {
      await this.initialize(input.tenantId);

      const pathResult = this.pathfinder.findMultiZonePath(input.zoneIds);

      if (pathResult.isErr()) {
        return err(pathResult.error);
      }

      const path = pathResult.value;

      this.logger.debug('Multi-zone path found', {
        tenantId: input.tenantId,
        zones: input.zoneIds,
        segments: path.segments.length,
        distance: path.totalDistance,
        durationMs: Date.now() - startTime,
      });

      return ok(this.toDTO(path));
    } catch (error) {
      this.logger.error('Multi-zone pathfinding failed', {
        tenantId: input.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Get zone connectivity graph
   */
  async getZoneGraph(tenantId: string): Promise<Result<ZoneGraphDTO, Error>> {
    try {
      await this.initialize(tenantId);

      const zones = this.pathfinder.getZones();
      const nodes = zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        center: zone.center,
        bounds: zone.bounds,
        restricted: zone.restricted,
      }));

      // Calculate edges with distances
      const edges: ZoneGraphDTO['edges'] = [];
      const processedPairs = new Set<string>();

      for (const zone of zones) {
        for (const connectedId of zone.connections) {
          const pairKey = [zone.id, connectedId].sort().join('-');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const connectedZone = zones.find((z) => z.id === connectedId);
          if (!connectedZone) continue;

          const distance = Math.sqrt(
            Math.pow(zone.center.x - connectedZone.center.x, 2) +
              Math.pow(zone.center.y - connectedZone.center.y, 2)
          );

          edges.push({
            from: zone.id,
            to: connectedId,
            distance: Math.round(distance * 100) / 100,
            estimatedTimeSeconds: Math.round((distance / 1.4) * 100) / 100,
          });
        }
      }

      return ok({ nodes, edges });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Convert internal path result to DTO
   */
  private toDTO(path: PathResult): PathDTO {
    return {
      segments: path.segments.map((s) => ({
        from: s.from,
        to: s.to,
        zoneId: s.zoneId,
        zoneName: s.zoneName,
        distance: Math.round(s.distance * 100) / 100,
        estimatedTimeSeconds: Math.round(s.estimatedTimeSeconds * 100) / 100,
      })),
      totalDistance: Math.round(path.totalDistance * 100) / 100,
      totalTimeSeconds: Math.round(path.totalTimeSeconds * 100) / 100,
      zonesTraversed: path.zonesTraversed,
      smoothPath: path.smoothPath.map((p) => ({
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
      })),
      isOptimal: path.isOptimal,
    };
  }
}
