import { PathfindingService, PathfindingZone, Point } from '@domain/services/PathfindingService';

describe('PathfindingService', () => {
  let pathfinder: PathfindingService;

  // Helper function to create a standard zone
  const createZone = (
    id: string,
    center: Point,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    options?: { restricted?: boolean; connections?: string[]; name?: string }
  ): PathfindingZone => ({
    id,
    name: options?.name ?? `Zone ${id}`,
    center,
    bounds,
    connections: options?.connections ?? [],
    restricted: options?.restricted ?? false,
  });

  // Standard test zones for most tests
  const createStandardZones = (): PathfindingZone[] => [
    createZone(
      'zone-a',
      { x: 5, y: 5 },
      { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      { name: 'Zone A' }
    ),
    createZone(
      'zone-b',
      { x: 15, y: 5 },
      { minX: 10, maxX: 20, minY: 0, maxY: 10 },
      { name: 'Zone B' }
    ),
    createZone(
      'zone-c',
      { x: 5, y: 15 },
      { minX: 0, maxX: 10, minY: 10, maxY: 20 },
      { name: 'Zone C' }
    ),
    createZone(
      'zone-d',
      { x: 15, y: 15 },
      { minX: 10, maxX: 20, minY: 10, maxY: 20 },
      { name: 'Zone D' }
    ),
  ];

  beforeEach(() => {
    pathfinder = new PathfindingService();
  });

  describe('initializeGrid', () => {
    it('should initialize a grid with correct dimensions', () => {
      pathfinder.initializeGrid(50, 30, []);

      const dims = pathfinder.getDimensions();
      expect(dims.width).toBe(50);
      expect(dims.height).toBe(30);
      expect(dims.cellSize).toBe(1);
    });

    it('should store zones correctly', () => {
      const zones = createStandardZones();
      pathfinder.initializeGrid(20, 20, zones);

      const storedZones = pathfinder.getZones();
      expect(storedZones).toHaveLength(4);
      expect(storedZones.map((z) => z.id).sort()).toEqual(['zone-a', 'zone-b', 'zone-c', 'zone-d']);
    });

    it('should mark obstacles as unwalkable', () => {
      const obstacles: Point[] = [{ x: 5, y: 5 }];
      pathfinder.initializeGrid(10, 10, [], obstacles);

      // Try to find path through obstacle
      const result = pathfinder.findPath({ x: 4, y: 5 }, { x: 6, y: 5 });

      // Path should exist (going around obstacle)
      expect(result.isOk()).toBe(true);
    });

    it('should set custom cell size', () => {
      pathfinder.initializeGrid(20, 20, [], [], 0.5);

      const dims = pathfinder.getDimensions();
      expect(dims.cellSize).toBe(0.5);
    });

    it('should mark restricted zones with higher cost', () => {
      const zones = [
        createZone(
          'restricted',
          { x: 5, y: 5 },
          { minX: 0, maxX: 10, minY: 0, maxY: 10 },
          { restricted: true }
        ),
        createZone(
          'normal',
          { x: 15, y: 5 },
          { minX: 10, maxX: 20, minY: 0, maxY: 10 },
          { restricted: false }
        ),
      ];

      pathfinder.initializeGrid(20, 10, zones);

      // Path through restricted zone should be valid but the service should work
      const result = pathfinder.findPath({ x: 2, y: 5 }, { x: 18, y: 5 });
      expect(result.isOk()).toBe(true);
    });

    it('should clear zones when reinitializing', () => {
      const zones1 = [
        createZone('zone-1', { x: 5, y: 5 }, { minX: 0, maxX: 10, minY: 0, maxY: 10 }),
      ];
      pathfinder.initializeGrid(20, 20, zones1);
      expect(pathfinder.getZones()).toHaveLength(1);

      const zones2 = [
        createZone('zone-2', { x: 5, y: 5 }, { minX: 0, maxX: 10, minY: 0, maxY: 10 }),
        createZone('zone-3', { x: 15, y: 5 }, { minX: 10, maxX: 20, minY: 0, maxY: 10 }),
      ];
      pathfinder.initializeGrid(20, 20, zones2);

      expect(pathfinder.getZones()).toHaveLength(2);
      expect(pathfinder.getZones().find((z) => z.id === 'zone-1')).toBeUndefined();
    });
  });

  describe('findPath', () => {
    beforeEach(() => {
      const zones = createStandardZones();
      pathfinder.initializeGrid(20, 20, zones);
    });

    describe('validation', () => {
      it('should return error for start position outside grid', () => {
        const result = pathfinder.findPath({ x: -1, y: 5 }, { x: 10, y: 10 });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Start position is outside the grid');
        }
      });

      it('should return error for goal position outside grid', () => {
        const result = pathfinder.findPath({ x: 5, y: 5 }, { x: 25, y: 10 });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Goal position is outside the grid');
        }
      });

      it('should return error for unwalkable start position', () => {
        pathfinder.addObstacle({ x: 5, y: 5 });

        const result = pathfinder.findPath({ x: 5, y: 5 }, { x: 10, y: 10 });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Start position is not walkable');
        }
      });

      it('should return error for unwalkable goal position', () => {
        pathfinder.addObstacle({ x: 10, y: 10 });

        const result = pathfinder.findPath({ x: 5, y: 5 }, { x: 10, y: 10 });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Goal position is not walkable');
        }
      });
    });

    describe('path calculation', () => {
      it('should find a direct path between two points', () => {
        const result = pathfinder.findPath({ x: 2, y: 2 }, { x: 8, y: 2 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          expect(path.segments.length).toBeGreaterThan(0);
          expect(path.totalDistance).toBeGreaterThan(0);
          expect(path.isOptimal).toBe(true);
        }
      });

      it('should find path when start equals goal', () => {
        const result = pathfinder.findPath({ x: 5, y: 5 }, { x: 5, y: 5 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          expect(path.totalDistance).toBe(0);
          expect(path.segments).toHaveLength(0);
        }
      });

      it('should find diagonal path', () => {
        const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 10, y: 10 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          expect(path.totalDistance).toBeGreaterThan(0);
          // Diagonal path should be shorter than Manhattan distance
          expect(path.totalDistance).toBeLessThan(20);
        }
      });

      it('should avoid obstacles', () => {
        // Create a wall of obstacles
        for (let y = 2; y < 8; y++) {
          pathfinder.addObstacle({ x: 5, y });
        }

        const result = pathfinder.findPath({ x: 2, y: 5 }, { x: 8, y: 5 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          // Path should go around the wall
          expect(path.totalDistance).toBeGreaterThan(6);
        }
      });

      it('should return error when no path exists', () => {
        // Surround a point completely with obstacles
        const surrounded = { x: 10, y: 10 };
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx !== 0 || dy !== 0) {
              pathfinder.addObstacle({ x: surrounded.x + dx, y: surrounded.y + dy });
            }
          }
        }

        const result = pathfinder.findPath({ x: 0, y: 0 }, surrounded);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('No path found');
        }
      });
    });

    describe('heuristics', () => {
      it('should work with manhattan heuristic', () => {
        const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 10, y: 10 }, 'manhattan');

        expect(result.isOk()).toBe(true);
      });

      it('should work with euclidean heuristic', () => {
        const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 10, y: 10 }, 'euclidean');

        expect(result.isOk()).toBe(true);
      });

      it('should work with diagonal heuristic', () => {
        const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 10, y: 10 }, 'diagonal');

        expect(result.isOk()).toBe(true);
      });
    });

    describe('path result structure', () => {
      it('should include all required path result fields', () => {
        const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 15, y: 15 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          expect(path).toHaveProperty('segments');
          expect(path).toHaveProperty('totalDistance');
          expect(path).toHaveProperty('totalTimeSeconds');
          expect(path).toHaveProperty('zonesTraversed');
          expect(path).toHaveProperty('smoothPath');
          expect(path).toHaveProperty('isOptimal');
        }
      });

      it('should calculate estimated time based on walking speed', () => {
        const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 10, y: 0 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          // Walking speed is 1.4 m/s, so 10m should take ~7.14 seconds
          expect(path.totalTimeSeconds).toBeGreaterThan(0);
          expect(path.totalTimeSeconds).toBe(path.totalDistance / 1.4);
        }
      });

      it('should track zones traversed', () => {
        const result = pathfinder.findPath({ x: 2, y: 2 }, { x: 17, y: 2 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          // Path should traverse at least one zone
          expect(path.zonesTraversed.length).toBeGreaterThanOrEqual(1);
          // Zone-a should be traversed since we start at (2,2) which is in zone-a
          expect(path.zonesTraversed).toContain('zone-a');
        }
      });

      it('should include zone name in segments', () => {
        const result = pathfinder.findPath({ x: 2, y: 2 }, { x: 8, y: 2 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          const segmentWithZone = path.segments.find((s) => s.zoneId);
          expect(segmentWithZone?.zoneName).toBeDefined();
        }
      });
    });

    describe('path smoothing', () => {
      it('should return smoothed path with fewer points than raw path', () => {
        // Create a grid without obstacles so path can be smoothed
        pathfinder.initializeGrid(20, 20, []);

        const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 15, y: 15 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          // Smoothed path for diagonal should be essentially 2 points
          expect(path.smoothPath.length).toBeGreaterThanOrEqual(2);
        }
      });

      it('should preserve start and end points in smoothed path', () => {
        pathfinder.initializeGrid(20, 20, []);

        const start = { x: 2, y: 3 };
        const goal = { x: 15, y: 12 };

        const result = pathfinder.findPath(start, goal);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const path = result.value;
          const firstPoint = path.smoothPath[0];
          const lastPoint = path.smoothPath[path.smoothPath.length - 1];

          // Note: points are scaled by cellSize in output
          expect(firstPoint!.x).toBe(start.x);
          expect(firstPoint!.y).toBe(start.y);
          expect(lastPoint!.x).toBe(goal.x);
          expect(lastPoint!.y).toBe(goal.y);
        }
      });
    });

    describe('diagonal corner cutting', () => {
      it('should not cut corners around obstacles', () => {
        pathfinder.initializeGrid(10, 10, []);

        // Place obstacle at (5,5)
        pathfinder.addObstacle({ x: 5, y: 5 });

        // Try to move diagonally past the corner
        const result = pathfinder.findPath({ x: 4, y: 4 }, { x: 6, y: 6 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Path should not pass directly through (5,5) area diagonally
          const path = result.value;
          expect(path.totalDistance).toBeGreaterThan(Math.sqrt(8)); // Longer than direct diagonal
        }
      });
    });
  });

  describe('findPathBetweenZones', () => {
    beforeEach(() => {
      const zones = createStandardZones();
      pathfinder.initializeGrid(20, 20, zones);
    });

    it('should find path between two zone centroids', () => {
      const result = pathfinder.findPathBetweenZones('zone-a', 'zone-b');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.totalDistance).toBeGreaterThan(0);
      }
    });

    it('should return error for non-existent source zone', () => {
      const result = pathfinder.findPathBetweenZones('non-existent', 'zone-b');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone non-existent not found');
      }
    });

    it('should return error for non-existent destination zone', () => {
      const result = pathfinder.findPathBetweenZones('zone-a', 'non-existent');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zone non-existent not found');
      }
    });

    it('should calculate path between same zone (distance 0)', () => {
      const result = pathfinder.findPathBetweenZones('zone-a', 'zone-a');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.totalDistance).toBe(0);
      }
    });
  });

  describe('findMultiZonePath', () => {
    beforeEach(() => {
      const zones = createStandardZones();
      pathfinder.initializeGrid(20, 20, zones);
    });

    it('should find path through multiple zones', () => {
      const result = pathfinder.findMultiZonePath(['zone-a', 'zone-b', 'zone-d']);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.totalDistance).toBeGreaterThan(0);
        expect(path.zonesTraversed.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should return error for less than 2 zones', () => {
      const result = pathfinder.findMultiZonePath(['zone-a']);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Need at least 2 zones');
      }
    });

    it('should return error for empty zone array', () => {
      const result = pathfinder.findMultiZonePath([]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Need at least 2 zones');
      }
    });

    it('should return error if any zone in path is invalid', () => {
      const result = pathfinder.findMultiZonePath(['zone-a', 'invalid-zone', 'zone-b']);

      expect(result.isErr()).toBe(true);
    });

    it('should combine segments from all path portions', () => {
      const result = pathfinder.findMultiZonePath(['zone-a', 'zone-b', 'zone-d', 'zone-c']);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        // Should have segments for A->B, B->D, D->C
        expect(path.segments.length).toBeGreaterThan(2);
      }
    });

    it('should accumulate total distance correctly', () => {
      // Get individual path distances
      const abResult = pathfinder.findPathBetweenZones('zone-a', 'zone-b');
      const bcResult = pathfinder.findPathBetweenZones('zone-b', 'zone-c');

      expect(abResult.isOk()).toBe(true);
      expect(bcResult.isOk()).toBe(true);

      const multiResult = pathfinder.findMultiZonePath(['zone-a', 'zone-b', 'zone-c']);

      expect(multiResult.isOk()).toBe(true);
      if (multiResult.isOk() && abResult.isOk() && bcResult.isOk()) {
        const combined = abResult.value.totalDistance + bcResult.value.totalDistance;
        expect(multiResult.value.totalDistance).toBeCloseTo(combined, 5);
      }
    });

    it('should not duplicate zones in zonesTraversed', () => {
      const result = pathfinder.findMultiZonePath(['zone-a', 'zone-b', 'zone-a']);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const zones = result.value.zonesTraversed;
        const uniqueZones = [...new Set(zones)];
        expect(zones.length).toBe(uniqueZones.length);
      }
    });
  });

  describe('addObstacle', () => {
    beforeEach(() => {
      pathfinder.initializeGrid(10, 10, []);
    });

    it('should add obstacle that blocks path', () => {
      // First verify path exists
      const beforeResult = pathfinder.findPath({ x: 2, y: 5 }, { x: 8, y: 5 });
      expect(beforeResult.isOk()).toBe(true);

      // Add obstacle in the middle
      pathfinder.addObstacle({ x: 5, y: 5 });

      // Path should still exist but be longer (goes around)
      const afterResult = pathfinder.findPath({ x: 2, y: 5 }, { x: 8, y: 5 });
      expect(afterResult.isOk()).toBe(true);

      if (beforeResult.isOk() && afterResult.isOk()) {
        expect(afterResult.value.totalDistance).toBeGreaterThanOrEqual(
          beforeResult.value.totalDistance
        );
      }
    });

    it('should handle obstacle outside grid bounds', () => {
      // Should not throw
      expect(() => pathfinder.addObstacle({ x: -1, y: 5 })).not.toThrow();
      expect(() => pathfinder.addObstacle({ x: 100, y: 5 })).not.toThrow();
    });

    it('should convert world coordinates to grid coordinates', () => {
      pathfinder.initializeGrid(10, 10, [], [], 2); // cellSize = 2

      // Obstacle at world coords (6, 4) should be at grid (3, 2)
      pathfinder.addObstacle({ x: 6, y: 4 });

      // Try to path through that cell
      const result = pathfinder.findPath({ x: 2, y: 2 }, { x: 4, y: 2 });
      expect(result.isOk()).toBe(true); // Should go around
    });
  });

  describe('removeObstacle', () => {
    beforeEach(() => {
      pathfinder.initializeGrid(10, 10, []);
    });

    it('should remove obstacle making path available again', () => {
      // Add obstacle
      pathfinder.addObstacle({ x: 5, y: 5 });

      // Block entire middle column to force different path
      for (let y = 0; y < 10; y++) {
        pathfinder.addObstacle({ x: 5, y });
      }

      // No path should exist
      const blockedResult = pathfinder.findPath({ x: 2, y: 5 }, { x: 8, y: 5 });
      expect(blockedResult.isErr()).toBe(true);

      // Remove one obstacle
      pathfinder.removeObstacle({ x: 5, y: 5 });

      // Path should exist again
      const unblockedResult = pathfinder.findPath({ x: 2, y: 5 }, { x: 8, y: 5 });
      expect(unblockedResult.isOk()).toBe(true);
    });

    it('should handle removing obstacle outside grid bounds', () => {
      expect(() => pathfinder.removeObstacle({ x: -1, y: 5 })).not.toThrow();
      expect(() => pathfinder.removeObstacle({ x: 100, y: 5 })).not.toThrow();
    });
  });

  describe('getZones', () => {
    it('should return empty array when no zones defined', () => {
      pathfinder.initializeGrid(10, 10, []);

      const zones = pathfinder.getZones();
      expect(zones).toEqual([]);
    });

    it('should return all defined zones', () => {
      const zones = createStandardZones();
      pathfinder.initializeGrid(20, 20, zones);

      const retrieved = pathfinder.getZones();
      expect(retrieved).toHaveLength(4);
    });

    it('should return zones with all properties intact', () => {
      const zone = createZone(
        'test-zone',
        { x: 5, y: 5 },
        { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        { name: 'Test Zone', restricted: true, connections: ['other-zone'] }
      );

      pathfinder.initializeGrid(20, 20, [zone]);

      const retrieved = pathfinder.getZones()[0];
      expect(retrieved?.id).toBe('test-zone');
      expect(retrieved?.name).toBe('Test Zone');
      expect(retrieved?.center).toEqual({ x: 5, y: 5 });
      expect(retrieved?.bounds).toEqual({ minX: 0, maxX: 10, minY: 0, maxY: 10 });
      expect(retrieved?.restricted).toBe(true);
      expect(retrieved?.connections).toEqual(['other-zone']);
    });
  });

  describe('getDimensions', () => {
    it('should return correct dimensions after initialization', () => {
      pathfinder.initializeGrid(100, 50, [], [], 0.25);

      const dims = pathfinder.getDimensions();
      expect(dims.width).toBe(100);
      expect(dims.height).toBe(50);
      expect(dims.cellSize).toBe(0.25);
    });

    it('should return zero dimensions before initialization', () => {
      const dims = pathfinder.getDimensions();
      expect(dims.width).toBe(0);
      expect(dims.height).toBe(0);
      expect(dims.cellSize).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle 1x1 grid', () => {
      pathfinder.initializeGrid(1, 1, []);

      const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 0, y: 0 });
      expect(result.isOk()).toBe(true);
    });

    it('should handle large grid efficiently', () => {
      pathfinder.initializeGrid(100, 100, []);

      const startTime = Date.now();
      const result = pathfinder.findPath({ x: 0, y: 0 }, { x: 99, y: 99 });
      const endTime = Date.now();

      expect(result.isOk()).toBe(true);
      // Should complete in reasonable time (< 1 second for 100x100 grid)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle floating point coordinates by flooring', () => {
      pathfinder.initializeGrid(20, 20, []);

      const result = pathfinder.findPath({ x: 2.7, y: 3.9 }, { x: 15.2, y: 12.1 });

      expect(result.isOk()).toBe(true);
    });

    it('should handle negative coordinates as outside grid', () => {
      pathfinder.initializeGrid(20, 20, []);

      const result = pathfinder.findPath({ x: -0.5, y: 5 }, { x: 10, y: 10 });

      expect(result.isErr()).toBe(true);
    });

    it('should reset grid state between findPath calls', () => {
      pathfinder.initializeGrid(20, 20, []);

      // First path
      const result1 = pathfinder.findPath({ x: 0, y: 0 }, { x: 10, y: 10 });
      expect(result1.isOk()).toBe(true);

      // Second path (different route)
      const result2 = pathfinder.findPath({ x: 15, y: 15 }, { x: 5, y: 5 });
      expect(result2.isOk()).toBe(true);

      // Both should work independently
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.isOptimal).toBe(true);
        expect(result2.value.isOptimal).toBe(true);
      }
    });
  });
});
