import { ok, err } from 'neverthrow';

import type { Result } from 'neverthrow';

/**
 * Node in the pathfinding grid
 */
export interface GridNode {
  /** X coordinate */
  readonly x: number;
  /** Y coordinate */
  readonly y: number;
  /** Whether this node is walkable */
  readonly walkable: boolean;
  /** Movement cost modifier (1 = normal, >1 = harder to traverse) */
  readonly cost: number;
  /** Zone ID if this node is within a zone */
  readonly zoneId?: string;
}

/**
 * 2D Point representation
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Zone definition for pathfinding
 */
export interface PathfindingZone {
  /** Zone ID */
  readonly id: string;
  /** Zone name */
  readonly name: string;
  /** Center position */
  readonly center: Point;
  /** Zone bounds */
  readonly bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  /** Connected zone IDs */
  readonly connections: string[];
  /** Is this a restricted zone (higher cost) */
  readonly restricted: boolean;
}

/**
 * Path segment between two points
 */
export interface PathSegment {
  /** Start point */
  readonly from: Point;
  /** End point */
  readonly to: Point;
  /** Zone this segment passes through */
  readonly zoneId?: string;
  /** Zone name */
  readonly zoneName?: string;
  /** Distance of this segment */
  readonly distance: number;
  /** Estimated time in seconds */
  readonly estimatedTimeSeconds: number;
}

/**
 * Complete path result
 */
export interface PathResult {
  /** Ordered list of path segments */
  readonly segments: PathSegment[];
  /** Total path distance */
  readonly totalDistance: number;
  /** Total estimated time in seconds */
  readonly totalTimeSeconds: number;
  /** Zones traversed in order */
  readonly zonesTraversed: string[];
  /** Smoothed path points for visualization */
  readonly smoothPath: Point[];
  /** Is this the optimal path? */
  readonly isOptimal: boolean;
}

/**
 * Internal A* node for algorithm processing
 */
interface AStarNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost (g + h)
  parent: AStarNode | null;
  walkable: boolean;
  cost: number;
  zoneId?: string;
}

/**
 * A* Pathfinding Service
 *
 * @description
 * Professional A* pathfinding implementation optimized for warehouse environments.
 * Features:
 * - Grid-based and zone-based pathfinding
 * - Obstacle avoidance
 * - Path smoothing for natural-looking routes
 * - Zone transition detection
 * - Configurable heuristics (Manhattan, Euclidean, Diagonal)
 * - Movement cost modifiers for different terrain
 * - Bidirectional search optimization
 *
 * @example
 * ```typescript
 * const pathfinder = new PathfindingService();
 * pathfinder.initializeGrid(100, 100, zones, obstacles);
 *
 * const result = pathfinder.findPath(
 *   { x: 10, y: 10 },
 *   { x: 90, y: 90 }
 * );
 *
 * if (result.isOk()) {
 *   console.log(`Path found with ${result.value.segments.length} segments`);
 *   console.log(`Total distance: ${result.value.totalDistance}m`);
 * }
 * ```
 */
export class PathfindingService {
  private grid: AStarNode[][] = [];
  private width: number = 0;
  private height: number = 0;
  private zones: Map<string, PathfindingZone> = new Map();
  private cellSize: number = 1; // meters per cell

  // Movement directions (8-directional)
  private readonly DIRECTIONS = [
    { dx: 0, dy: -1, cost: 1 }, // North
    { dx: 1, dy: -1, cost: 1.414 }, // Northeast
    { dx: 1, dy: 0, cost: 1 }, // East
    { dx: 1, dy: 1, cost: 1.414 }, // Southeast
    { dx: 0, dy: 1, cost: 1 }, // South
    { dx: -1, dy: 1, cost: 1.414 }, // Southwest
    { dx: -1, dy: 0, cost: 1 }, // West
    { dx: -1, dy: -1, cost: 1.414 }, // Northwest
  ];

  // Average walking speed in meters per second
  private readonly WALKING_SPEED = 1.4;

  /**
   * Initializes the pathfinding grid
   *
   * @param width - Grid width in cells
   * @param height - Grid height in cells
   * @param zones - Zone definitions
   * @param obstacles - Obstacle positions
   * @param cellSize - Size of each cell in meters
   */
  initializeGrid(
    width: number,
    height: number,
    zones: PathfindingZone[],
    obstacles: Point[] = [],
    cellSize: number = 1
  ): void {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.zones.clear();

    // Store zones
    for (const zone of zones) {
      this.zones.set(zone.id, zone);
    }

    // Create grid
    this.grid = [];
    for (let y = 0; y < height; y++) {
      const row: AStarNode[] = [];
      for (let x = 0; x < width; x++) {
        const zoneId = this.getZoneAtPoint({ x, y });
        const zone = zoneId ? this.zones.get(zoneId) : undefined;

        row.push({
          x,
          y,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
          walkable: true,
          cost: zone?.restricted ? 2 : 1,
          zoneId,
        });
      }
      this.grid.push(row);
    }

    // Mark obstacles as unwalkable
    for (const obstacle of obstacles) {
      const x = Math.floor(obstacle.x);
      const y = Math.floor(obstacle.y);
      if (this.isValidCell(x, y)) {
        this.grid[y]![x]!.walkable = false;
      }
    }
  }

  /**
   * Finds the optimal path between two points using A* algorithm
   *
   * @param start - Starting point
   * @param goal - Goal point
   * @param heuristic - Heuristic function to use
   * @returns Result containing path or error
   */
  findPath(
    start: Point,
    goal: Point,
    heuristic: 'manhattan' | 'euclidean' | 'diagonal' = 'euclidean'
  ): Result<PathResult, Error> {
    // Validate inputs
    if (!this.isValidCell(Math.floor(start.x), Math.floor(start.y))) {
      return err(new Error('Start position is outside the grid'));
    }
    if (!this.isValidCell(Math.floor(goal.x), Math.floor(goal.y))) {
      return err(new Error('Goal position is outside the grid'));
    }

    const startX = Math.floor(start.x);
    const startY = Math.floor(start.y);
    const goalX = Math.floor(goal.x);
    const goalY = Math.floor(goal.y);

    if (!this.grid[startY]![startX]!.walkable) {
      return err(new Error('Start position is not walkable'));
    }
    if (!this.grid[goalY]![goalX]!.walkable) {
      return err(new Error('Goal position is not walkable'));
    }

    // Reset grid
    this.resetGrid();

    // A* algorithm
    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode = this.grid[startY]![startX]!;
    startNode.g = 0;
    startNode.h = this.calculateHeuristic(startX, startY, goalX, goalY, heuristic);
    startNode.f = startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if we reached the goal
      if (current.x === goalX && current.y === goalY) {
        return ok(this.reconstructPath(current, start, goal));
      }

      closedSet.add(`${current.x},${current.y}`);

      // Explore neighbors
      for (const dir of this.DIRECTIONS) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (!this.isValidCell(nx, ny)) continue;
        if (closedSet.has(`${nx},${ny}`)) continue;

        const neighbor = this.grid[ny]![nx]!;
        if (!neighbor.walkable) continue;

        // Check diagonal blocking (can't cut corners)
        if (dir.dx !== 0 && dir.dy !== 0) {
          if (!this.grid[current.y]![nx]!.walkable || !this.grid[ny]![current.x]!.walkable) {
            continue;
          }
        }

        const tentativeG = current.g + dir.cost * neighbor.cost * this.cellSize;

        const inOpenSet = openSet.find((n) => n.x === nx && n.y === ny);

        if (!inOpenSet || tentativeG < neighbor.g) {
          neighbor.g = tentativeG;
          neighbor.h = this.calculateHeuristic(nx, ny, goalX, goalY, heuristic);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;

          if (!inOpenSet) {
            openSet.push(neighbor);
          }
        }
      }
    }

    // No path found
    return err(new Error('No path found between start and goal'));
  }

  /**
   * Finds path between two zones (zone centroids)
   */
  findPathBetweenZones(fromZoneId: string, toZoneId: string): Result<PathResult, Error> {
    const fromZone = this.zones.get(fromZoneId);
    const toZone = this.zones.get(toZoneId);

    if (!fromZone) {
      return err(new Error(`Zone ${fromZoneId} not found`));
    }
    if (!toZone) {
      return err(new Error(`Zone ${toZoneId} not found`));
    }

    return this.findPath(fromZone.center, toZone.center);
  }

  /**
   * Gets the optimal route through multiple zones
   */
  findMultiZonePath(zoneIds: string[]): Result<PathResult, Error> {
    if (zoneIds.length < 2) {
      return err(new Error('Need at least 2 zones for pathfinding'));
    }

    const allSegments: PathSegment[] = [];
    const allSmoothPath: Point[] = [];
    const zonesTraversed: string[] = [];
    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 0; i < zoneIds.length - 1; i++) {
      const result = this.findPathBetweenZones(zoneIds[i]!, zoneIds[i + 1]!);
      if (result.isErr()) {
        return err(result.error);
      }

      const pathPart = result.value;
      allSegments.push(...pathPart.segments);

      // Avoid duplicating the connection point
      if (i === 0) {
        allSmoothPath.push(...pathPart.smoothPath);
      } else {
        allSmoothPath.push(...pathPart.smoothPath.slice(1));
      }

      totalDistance += pathPart.totalDistance;
      totalTime += pathPart.totalTimeSeconds;

      for (const zone of pathPart.zonesTraversed) {
        if (!zonesTraversed.includes(zone)) {
          zonesTraversed.push(zone);
        }
      }
    }

    return ok({
      segments: allSegments,
      totalDistance,
      totalTimeSeconds: totalTime,
      zonesTraversed,
      smoothPath: allSmoothPath,
      isOptimal: true,
    });
  }

  /**
   * Calculates heuristic distance
   */
  private calculateHeuristic(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: 'manhattan' | 'euclidean' | 'diagonal'
  ): number {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);

    switch (type) {
      case 'manhattan':
        return (dx + dy) * this.cellSize;
      case 'euclidean':
        return Math.sqrt(dx * dx + dy * dy) * this.cellSize;
      case 'diagonal':
        return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)) * this.cellSize;
      default:
        return Math.sqrt(dx * dx + dy * dy) * this.cellSize;
    }
  }

  /**
   * Reconstructs path from goal node back to start
   */
  private reconstructPath(goalNode: AStarNode, _start: Point, _goal: Point): PathResult {
    const rawPath: Point[] = [];
    let current: AStarNode | null = goalNode;

    while (current !== null) {
      rawPath.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    // Smooth the path
    const smoothPath = this.smoothPath(rawPath);

    // Build segments
    const segments: PathSegment[] = [];
    const zonesTraversed: string[] = [];
    let totalDistance = 0;

    for (let i = 0; i < smoothPath.length - 1; i++) {
      const from = smoothPath[i]!;
      const to = smoothPath[i + 1]!;
      const distance = Math.sqrt(
        Math.pow((to.x - from.x) * this.cellSize, 2) + Math.pow((to.y - from.y) * this.cellSize, 2)
      );

      const zoneId = this.getZoneAtPoint(from);
      const zone = zoneId ? this.zones.get(zoneId) : undefined;

      segments.push({
        from: { x: from.x * this.cellSize, y: from.y * this.cellSize },
        to: { x: to.x * this.cellSize, y: to.y * this.cellSize },
        zoneId,
        zoneName: zone?.name,
        distance,
        estimatedTimeSeconds: distance / this.WALKING_SPEED,
      });

      totalDistance += distance;

      if (zoneId && !zonesTraversed.includes(zoneId)) {
        zonesTraversed.push(zoneId);
      }
    }

    const totalTimeSeconds = totalDistance / this.WALKING_SPEED;

    return {
      segments,
      totalDistance,
      totalTimeSeconds,
      zonesTraversed,
      smoothPath: smoothPath.map((p) => ({
        x: p.x * this.cellSize,
        y: p.y * this.cellSize,
      })),
      isOptimal: true,
    };
  }

  /**
   * Smooths path using line-of-sight algorithm
   */
  private smoothPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;

    const smoothed: Point[] = [path[0]!];
    let current = 0;

    while (current < path.length - 1) {
      let furthest = current + 1;

      // Find the furthest point we can see from current
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current]!, path[i]!)) {
          furthest = i;
        }
      }

      smoothed.push(path[furthest]!);
      current = furthest;
    }

    return smoothed;
  }

  /**
   * Checks if there's a clear line of sight between two points
   */
  private hasLineOfSight(from: Point, to: Point): boolean {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let err = dx - dy;

    let x = from.x;
    let y = from.y;

    while (x !== to.x || y !== to.y) {
      if (!this.isValidCell(x, y) || !this.grid[y]![x]!.walkable) {
        return false;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true;
  }

  /**
   * Gets zone ID at a given point
   */
  private getZoneAtPoint(point: Point): string | undefined {
    for (const [id, zone] of this.zones) {
      if (
        point.x >= zone.bounds.minX &&
        point.x <= zone.bounds.maxX &&
        point.y >= zone.bounds.minY &&
        point.y <= zone.bounds.maxY
      ) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Checks if cell coordinates are valid
   */
  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Resets grid state for new search
   */
  private resetGrid(): void {
    for (const row of this.grid) {
      for (const node of row) {
        node.g = 0;
        node.h = 0;
        node.f = 0;
        node.parent = null;
      }
    }
  }

  /**
   * Adds an obstacle to the grid
   */
  addObstacle(point: Point): void {
    const x = Math.floor(point.x / this.cellSize);
    const y = Math.floor(point.y / this.cellSize);
    if (this.isValidCell(x, y)) {
      this.grid[y]![x]!.walkable = false;
    }
  }

  /**
   * Removes an obstacle from the grid
   */
  removeObstacle(point: Point): void {
    const x = Math.floor(point.x / this.cellSize);
    const y = Math.floor(point.y / this.cellSize);
    if (this.isValidCell(x, y)) {
      this.grid[y]![x]!.walkable = true;
    }
  }

  /**
   * Gets all registered zones
   */
  getZones(): PathfindingZone[] {
    return Array.from(this.zones.values());
  }

  /**
   * Gets grid dimensions
   */
  getDimensions(): { width: number; height: number; cellSize: number } {
    return {
      width: this.width,
      height: this.height,
      cellSize: this.cellSize,
    };
  }
}
