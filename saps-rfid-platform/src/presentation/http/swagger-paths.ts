/**
 * OpenAPI Path Definitions
 *
 * This file contains all API path definitions with JSDoc annotations
 * for swagger-jsdoc to generate the OpenAPI specification.
 *
 * These annotations are parsed by swagger-jsdoc and merged with
 * the base configuration in swagger.ts
 */

// =============================================================================
// HEALTH ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Simple health check
 *     description: Returns 200 if the server is running. Used by load balancers and monitoring systems.
 *     operationId: healthCheck
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Server is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

/**
 * @openapi
 * /api/health/detailed:
 *   get:
 *     tags:
 *       - Health
 *     summary: Detailed health check
 *     description: |
 *       Returns detailed health information including dependency status
 *       (database, Redis, RFID gateway) and system metrics.
 *     operationId: detailedHealthCheck
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailedHealthCheck'
 *       503:
 *         description: One or more dependencies unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailedHealthCheck'
 */

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: |
 *       Authenticates a user with email and password, returning JWT tokens.
 *
 *       The access token expires in 15 minutes and should be included in
 *       the Authorization header for authenticated requests.
 *
 *       The refresh token can be used to obtain new access tokens without
 *       re-entering credentials.
 *     operationId: login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: |
 *       Exchanges a valid refresh token for new access and refresh tokens.
 *       The old refresh token is invalidated after use.
 *     operationId: refreshToken
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                       example: "15m"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User logout
 *     description: Invalidates the current access and refresh tokens.
 *     operationId: logout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Logged out successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile and tenant information.
 *     operationId: getCurrentUser
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Change password
 *     description: Changes the authenticated user's password.
 *     operationId: changePassword
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Password changed successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

// =============================================================================
// ITEM ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/items:
 *   get:
 *     tags:
 *       - Items
 *     summary: Search items
 *     description: |
 *       Search and filter items with pagination support.
 *       Results are sorted by the specified field (default: createdAt descending).
 *     operationId: searchItems
 *     parameters:
 *       - name: q
 *         in: query
 *         description: Search query (searches item number, description, reference ID)
 *         schema:
 *           type: string
 *           maxLength: 200
 *       - name: status
 *         in: query
 *         description: Filter by item status
 *         schema:
 *           type: string
 *           enum: [registered, in_transit, in_processing, archived, disposed, missing]
 *       - name: zoneId
 *         in: query
 *         description: Filter by current zone ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: category
 *         in: query
 *         description: Filter by category
 *         schema:
 *           type: string
 *           enum: [equipment, consumable, electronic, document, material, tool, apparel, container, sample, other]
 *       - name: limit
 *         in: query
 *         description: Maximum number of results (1-100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: offset
 *         in: query
 *         description: Number of results to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - name: sortBy
 *         in: query
 *         description: Field to sort by
 *         schema:
 *           type: string
 *           enum: [itemNumber, referenceId, createdAt, lastSeenAt]
 *           default: createdAt
 *       - name: sortOrder
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Item'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *   post:
 *     tags:
 *       - Items
 *     summary: Register a new item
 *     description: |
 *       Registers a new item in the system with an RFID tag.
 *       The item number must be unique within the tenant.
 *     operationId: createItem
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateItemRequest'
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Item'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Item number or RFID EPC already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /api/items/{itemNumber}:
 *   get:
 *     tags:
 *       - Items
 *     summary: Get item details
 *     description: Returns detailed information about a specific item.
 *     operationId: getItem
 *     parameters:
 *       - name: itemNumber
 *         in: path
 *         required: true
 *         description: Item number (e.g., INV-2025-000001)
 *         schema:
 *           type: string
 *           maxLength: 50
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Item'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/items/{itemNumber}/history:
 *   get:
 *     tags:
 *       - Items
 *     summary: Get item location history
 *     description: |
 *       Returns the location history of an item, showing which zones
 *       it has visited and when. Can filter by time range or recent hours.
 *     operationId: getItemHistory
 *     parameters:
 *       - name: itemNumber
 *         in: path
 *         required: true
 *         description: Item number
 *         schema:
 *           type: string
 *       - name: hours
 *         in: query
 *         description: Return history from the last N hours (1-168)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *       - name: limit
 *         in: query
 *         description: Maximum history entries to return (1-1000)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *       - name: startTime
 *         in: query
 *         description: Start of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endTime
 *         in: query
 *         description: End of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Item location history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ItemHistory'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

// =============================================================================
// ZONE ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/zones:
 *   get:
 *     tags:
 *       - Zones
 *     summary: Get all zones
 *     description: Returns all zones with current occupancy information.
 *     operationId: getAllZones
 *     responses:
 *       200:
 *         description: List of zones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     zones:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Zone'
 */

/**
 * @openapi
 * /api/zones/{zoneId}/items:
 *   get:
 *     tags:
 *       - Zones
 *     summary: Get items in zone
 *     description: Returns all items currently located in a specific zone.
 *     operationId: getZoneItems
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         description: Zone ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: limit
 *         in: query
 *         description: Maximum items to return (1-200)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *       - name: recentOnly
 *         in: query
 *         description: Only return items seen recently
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Items in zone
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     zoneId:
 *                       type: string
 *                       format: uuid
 *                     zoneName:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Item'
 *                     totalCount:
 *                       type: integer
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

// =============================================================================
// READER ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/readers:
 *   get:
 *     tags:
 *       - Readers
 *     summary: Get all RFID readers
 *     description: Returns all RFID readers with current status and performance metrics.
 *     operationId: getAllReaders
 *     responses:
 *       200:
 *         description: List of readers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     readers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reader'
 */

// =============================================================================
// ANALYTICS ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/analytics/dashboard:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get dashboard metrics
 *     description: |
 *       Returns key metrics for the dashboard including summary statistics,
 *       zone occupancy, reader health, and recent activity.
 *     operationId: getDashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: hours
 *         in: query
 *         description: Time period to analyze (default 24 hours)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardMetrics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/analytics/zones:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get zone analytics
 *     description: Returns analytics for all zones including occupancy trends and activity.
 *     operationId: getZoneAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: granularity
 *         in: query
 *         description: Time bucket size
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *           default: hour
 *     responses:
 *       200:
 *         description: Zone analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ZoneAnalytics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/analytics/zones/{zoneId}:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get single zone analytics
 *     description: Returns detailed analytics for a specific zone.
 *     operationId: getSingleZoneAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         description: Zone ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: startDate
 *         in: query
 *         description: Start of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: granularity
 *         in: query
 *         description: Time bucket size
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *     responses:
 *       200:
 *         description: Zone analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ZoneAnalytics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/analytics/readers:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get reader analytics
 *     description: Returns performance analytics for all RFID readers.
 *     operationId: getReaderAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         description: Start of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: granularity
 *         in: query
 *         description: Time bucket size
 *         schema:
 *           type: string
 *           enum: [hour, day]
 *     responses:
 *       200:
 *         description: Reader analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReaderAnalytics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/analytics/readers/{readerId}:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get single reader analytics
 *     description: Returns detailed performance analytics for a specific reader.
 *     operationId: getSingleReaderAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: readerId
 *         in: path
 *         required: true
 *         description: Reader ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: startDate
 *         in: query
 *         description: Start of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: granularity
 *         in: query
 *         description: Time bucket size
 *         schema:
 *           type: string
 *           enum: [hour, day]
 *     responses:
 *       200:
 *         description: Reader analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ReaderAnalytics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/analytics/system:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get system metrics
 *     description: Returns system-wide performance metrics including resource usage.
 *     operationId: getSystemMetrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: hours
 *         in: query
 *         description: Time period to analyze
 *         schema:
 *           type: integer
 *           default: 24
 *       - name: granularity
 *         in: query
 *         description: Time bucket size
 *         schema:
 *           type: string
 *           enum: [minute, hour]
 *     responses:
 *       200:
 *         description: System metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SystemMetrics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/analytics/export:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Export analytics data
 *     description: Export analytics data in JSON or CSV format.
 *     operationId: exportAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         required: true
 *         description: Export type
 *         schema:
 *           type: string
 *           enum: [dashboard, zones, readers, system]
 *       - name: format
 *         in: query
 *         description: Output format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - name: startDate
 *         in: query
 *         description: Start of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End of analysis period (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Exported data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

// =============================================================================
// FLOW ANALYTICS ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/flow/journey/{itemNumber}:
 *   get:
 *     tags:
 *       - Flow Analytics
 *     summary: Get item journey
 *     description: |
 *       Returns the complete journey/path of an item through zones,
 *       including transitions and timing information.
 *     operationId: getItemJourney
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: itemNumber
 *         in: path
 *         required: true
 *         description: Item number to analyze
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         description: Start of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Item journey
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ItemJourney'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/flow/zones:
 *   get:
 *     tags:
 *       - Flow Analytics
 *     summary: Get zone flow analytics
 *     description: Returns zone-to-zone flow analytics including transition counts and patterns.
 *     operationId: getZoneFlowAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         description: Start of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         required: true
 *         description: End of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: zoneId
 *         in: query
 *         description: Filter by specific zone
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: minTransitions
 *         in: query
 *         description: Minimum transition count to include
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zone flow analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ZoneFlowAnalytics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/flow/bottlenecks:
 *   get:
 *     tags:
 *       - Flow Analytics
 *     summary: Get bottleneck analysis
 *     description: Identifies bottleneck zones with congestion and dwell time issues.
 *     operationId: getBottleneckAnalysis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         description: Start of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         required: true
 *         description: End of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: dwellThresholdMinutes
 *         in: query
 *         description: Custom dwell time threshold
 *         schema:
 *           type: integer
 *       - name: congestionThreshold
 *         in: query
 *         description: Custom congestion threshold (0-1)
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *     responses:
 *       200:
 *         description: Bottleneck analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BottleneckAnalysis'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/flow/patterns:
 *   get:
 *     tags:
 *       - Flow Analytics
 *     summary: Get path patterns
 *     description: Returns discovered path patterns showing common item routes.
 *     operationId: getPathPatterns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         description: Start of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         required: true
 *         description: End of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: minOccurrences
 *         in: query
 *         description: Minimum pattern occurrences
 *         schema:
 *           type: integer
 *       - name: maxPathLength
 *         in: query
 *         description: Maximum path length
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Path patterns
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     patterns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           path:
 *                             type: array
 *                             items:
 *                               type: string
 *                           occurrences:
 *                             type: integer
 *                           averageDurationMinutes:
 *                             type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/flow/anomalies:
 *   get:
 *     tags:
 *       - Flow Analytics
 *     summary: Get flow anomalies
 *     description: Returns detected flow anomalies and unusual patterns.
 *     operationId: getFlowAnomalies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         description: Start of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         required: true
 *         description: End of time range (ISO 8601)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: severity
 *         in: query
 *         description: Filter by severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - name: type
 *         in: query
 *         description: Filter by anomaly type
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum anomalies to return
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Flow anomalies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FlowAnomalies'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

// =============================================================================
// TENANT ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/tenants:
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Create new tenant (signup)
 *     description: |
 *       Creates a new tenant organization with an owner account.
 *       This is the signup endpoint for new organizations.
 *     operationId: createTenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTenantRequest'
 *     responses:
 *       201:
 *         description: Tenant created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 *                     owner:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Tenant slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     tags:
 *       - Tenants
 *     summary: List all tenants (platform admin only)
 *     description: Returns list of all tenants. Requires platform admin privileges.
 *     operationId: listTenants
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tenants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenants:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @openapi
 * /api/tenants/check-slug/{slug}:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: Check slug availability
 *     description: Checks if a tenant slug is available for use.
 *     operationId: checkSlugAvailability
 *     parameters:
 *       - name: slug
 *         in: path
 *         required: true
 *         description: Slug to check
 *         schema:
 *           type: string
 *           pattern: '^[a-z0-9-]+$'
 *     responses:
 *       200:
 *         description: Slug availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: boolean
 *                     slug:
 *                       type: string
 */

/**
 * @openapi
 * /api/tenants/current:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: Get current tenant
 *     description: Returns the authenticated user's tenant information.
 *     operationId: getCurrentTenant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current tenant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/tenants/current/usage:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: Get current tenant usage
 *     description: Returns usage statistics for the current tenant.
 *     operationId: getCurrentTenantUsage
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TenantUsage'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/tenants/current/branding:
 *   patch:
 *     tags:
 *       - Tenants
 *     summary: Update tenant branding
 *     description: Updates branding settings for the current tenant. Admin only.
 *     operationId: updateTenantBranding
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: uri
 *               primaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               secondaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *     responses:
 *       200:
 *         description: Branding updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @openapi
 * /api/tenants/current/settings:
 *   patch:
 *     tags:
 *       - Tenants
 *     summary: Update tenant settings
 *     description: Updates settings for the current tenant. Admin only.
 *     operationId: updateTenantSettings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @openapi
 * /api/tenants/{id}:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: Get tenant by ID (platform admin only)
 *     description: Returns a specific tenant's information. Requires platform admin privileges.
 *     operationId: getTenantById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Tenant ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tenant details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/tenants/{id}/suspend:
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Suspend tenant (platform admin only)
 *     description: Suspends a tenant account. Requires platform admin privileges.
 *     operationId: suspendTenant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Tenant ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tenant suspended
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/tenants/{id}/reactivate:
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Reactivate tenant (platform admin only)
 *     description: Reactivates a suspended tenant. Requires platform admin privileges.
 *     operationId: reactivateTenant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Tenant ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tenant reactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/tenants/{id}/upgrade:
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Upgrade tenant subscription (platform admin only)
 *     description: Upgrades a tenant's subscription plan. Requires platform admin privileges.
 *     operationId: upgradeTenant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Tenant ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [starter, professional, enterprise]
 *     responses:
 *       200:
 *         description: Tenant upgraded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

// =============================================================================
// PATHFINDING ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/pathfinding/find:
 *   post:
 *     tags:
 *       - Pathfinding
 *     summary: Find path between two points
 *     description: Finds the optimal path between two points or zones.
 *     operationId: findPath
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PathfindingRequest'
 *     responses:
 *       200:
 *         description: Path found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PathfindingResult'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: No path found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /api/pathfinding/route:
 *   post:
 *     tags:
 *       - Pathfinding
 *     summary: Find optimal route through zones
 *     description: Finds the optimal path visiting multiple zones in order.
 *     operationId: findRoute
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - zoneIds
 *             properties:
 *               zoneIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 2
 *     responses:
 *       200:
 *         description: Route found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PathfindingResult'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/pathfinding/graph:
 *   get:
 *     tags:
 *       - Pathfinding
 *     summary: Get zone connectivity graph
 *     description: Returns the zone connectivity graph for visualization.
 *     operationId: getZoneGraph
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Zone graph
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ZoneGraph'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/pathfinding/zones/{fromZoneId}/{toZoneId}:
 *   get:
 *     tags:
 *       - Pathfinding
 *     summary: Find path between zones
 *     description: Convenience endpoint to find path between two zones.
 *     operationId: findZonePath
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: fromZoneId
 *         in: path
 *         required: true
 *         description: Starting zone ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: toZoneId
 *         in: path
 *         required: true
 *         description: Destination zone ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Path found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PathfindingResult'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

// =============================================================================
// SPATIAL ANALYTICS ENDPOINTS
// =============================================================================

/**
 * @openapi
 * /api/spatial/health:
 *   get:
 *     tags:
 *       - Spatial
 *     summary: Spatial service health check
 *     description: Checks health of the spatial analytics service (Open3D integration).
 *     operationId: spatialHealthCheck
 *     responses:
 *       200:
 *         description: Spatial service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unavailable]
 *                     open3dVersion:
 *                       type: string
 *                     capabilities:
 *                       type: array
 *                       items:
 *                         type: string
 */

export {};
