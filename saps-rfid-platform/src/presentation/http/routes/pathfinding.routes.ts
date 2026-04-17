import { Router } from 'express';
import { container } from 'tsyringe';
import { PathfindingController } from '../controllers/PathfindingController';
import { AuthMiddlewareFactory } from '../middleware/authMiddleware';

/**
 * Pathfinding Routes
 *
 * All routes require authentication.
 * Base path: /api/v1/pathfinding
 */
export function createPathfindingRoutes(): Router {
  const router = Router();
  const controller = container.resolve(PathfindingController);
  const authFactory = container.resolve(AuthMiddlewareFactory);

  // All pathfinding routes require authentication
  router.use(authFactory.requireAuth());

  /**
   * @route POST /api/v1/pathfinding/find
   * @desc Find path between two points or zones
   * @access Private
   * @body {
   *   from: { x: number, y: number } | { zoneId: string },
   *   to: { x: number, y: number } | { zoneId: string },
   *   avoidZones?: string[]
   * }
   */
  router.post('/find', (req, res, next) => controller.findPath(req, res, next));

  /**
   * @route POST /api/v1/pathfinding/route
   * @desc Find optimal path through multiple zones
   * @access Private
   * @body { zoneIds: string[] }
   */
  router.post('/route', (req, res, next) => controller.findRoute(req, res, next));

  /**
   * @route GET /api/v1/pathfinding/graph
   * @desc Get zone connectivity graph for visualization
   * @access Private
   */
  router.get('/graph', (req, res, next) => controller.getGraph(req, res, next));

  /**
   * @route GET /api/v1/pathfinding/zones/:fromZoneId/:toZoneId
   * @desc Find path between two zones (convenience endpoint)
   * @access Private
   */
  router.get('/zones/:fromZoneId/:toZoneId', (req, res, next) =>
    controller.findZonePath(req, res, next)
  );

  return router;
}
