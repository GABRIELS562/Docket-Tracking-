/**
 * Analytics DTOs
 *
 * Data Transfer Objects for analytics API responses.
 * These DTOs provide structured data for dashboards, reports, and visualizations.
 */

// =============================================================================
// Dashboard Analytics
// =============================================================================

/**
 * Dashboard overview metrics
 */
export interface DashboardMetricsDTO {
  /** Time period for these metrics */
  readonly period: {
    readonly start: string;
    readonly end: string;
    readonly hours: number;
  };

  /** Overall system statistics */
  readonly summary: {
    readonly totalReads: number;
    readonly uniqueItems: number;
    readonly activeZones: number;
    readonly activeReaders: number;
    readonly avgConfidence: number;
  };

  /** Comparison with previous period */
  readonly comparison: {
    readonly readsChange: number;
    readonly itemsChange: number;
    readonly zonesChange: number;
    readonly readersChange: number;
  };

  /** Zone occupancy overview */
  readonly zoneOccupancy: ZoneOccupancyDTO[];

  /** Reader health summary */
  readonly readerHealth: ReaderHealthSummaryDTO;

  /** Recent activity timeline */
  readonly recentActivity: ActivityTimelineDTO[];
}

/**
 * Zone occupancy data point
 */
export interface ZoneOccupancyDTO {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly currentItems: number;
  readonly capacity: number;
  readonly occupancyPercentage: number;
  readonly status: 'normal' | 'warning' | 'critical' | 'full';
  readonly lastActivity: string;
}

/**
 * Reader health summary
 */
export interface ReaderHealthSummaryDTO {
  readonly total: number;
  readonly online: number;
  readonly offline: number;
  readonly degraded: number;
  readonly avgReadRate: number;
}

/**
 * Activity timeline entry
 */
export interface ActivityTimelineDTO {
  readonly timestamp: string;
  readonly eventType: 'tag_read' | 'zone_entry' | 'zone_exit' | 'movement';
  readonly itemNumber: string;
  readonly zoneName: string;
  readonly readerName: string;
}

// =============================================================================
// Zone Analytics
// =============================================================================

/**
 * Zone activity analytics request
 */
export interface GetZoneAnalyticsInput {
  readonly tenantId: string;
  readonly zoneId?: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly granularity: 'hour' | 'day' | 'week';
}

/**
 * Zone activity analytics response
 */
export interface ZoneAnalyticsDTO {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Aggregate statistics */
  readonly statistics: {
    readonly totalReads: number;
    readonly uniqueItems: number;
    readonly avgDwellTimeMinutes: number;
    readonly peakOccupancy: number;
    readonly avgOccupancy: number;
  };

  /** Time-series data for charts */
  readonly timeSeries: ZoneTimeSeriesDTO[];

  /** Top items in this zone */
  readonly topItems: ZoneTopItemDTO[];

  /** Heat map data (hourly activity) */
  readonly heatMap: ZoneHeatMapDTO[];
}

/**
 * Zone time series data point
 */
export interface ZoneTimeSeriesDTO {
  readonly timestamp: string;
  readonly readCount: number;
  readonly uniqueItems: number;
  readonly avgRssi: number;
  readonly occupancy: number;
}

/**
 * Top item in zone
 */
export interface ZoneTopItemDTO {
  readonly itemId: string;
  readonly itemNumber: string;
  readonly readCount: number;
  readonly totalDwellTimeMinutes: number;
  readonly lastSeen: string;
}

/**
 * Zone heat map data (for visualizing busy hours)
 */
export interface ZoneHeatMapDTO {
  readonly dayOfWeek: number;
  readonly hour: number;
  readonly intensity: number;
  readonly readCount: number;
}

// =============================================================================
// Item Movement Analytics
// =============================================================================

/**
 * Item movement analytics request
 */
export interface GetItemMovementInput {
  readonly tenantId: string;
  readonly itemId?: string;
  readonly itemNumber?: string;
  readonly startDate: Date;
  readonly endDate: Date;
}

/**
 * Item movement analytics response
 */
export interface ItemMovementDTO {
  readonly itemId: string;
  readonly itemNumber: string;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Movement summary */
  readonly summary: {
    readonly totalZonesVisited: number;
    readonly totalTransitions: number;
    readonly totalReadCount: number;
    readonly avgDwellTimeMinutes: number;
  };

  /** Zone visit history */
  readonly zoneVisits: ItemZoneVisitDTO[];

  /** Movement timeline */
  readonly movements: ItemMovementEventDTO[];

  /** Current location */
  readonly currentLocation: {
    readonly zoneId: string;
    readonly zoneName: string;
    readonly since: string;
    readonly confidence: number;
  } | null;
}

/**
 * Zone visit record
 */
export interface ItemZoneVisitDTO {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly entryTime: string;
  readonly exitTime: string | null;
  readonly dwellTimeMinutes: number;
  readonly readCount: number;
}

/**
 * Item movement event
 */
export interface ItemMovementEventDTO {
  readonly timestamp: string;
  readonly fromZoneId: string | null;
  readonly fromZoneName: string | null;
  readonly toZoneId: string;
  readonly toZoneName: string;
  readonly confidence: number;
}

// =============================================================================
// Reader Performance Analytics
// =============================================================================

/**
 * Reader performance analytics request
 */
export interface GetReaderAnalyticsInput {
  readonly tenantId: string;
  readonly readerId?: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly granularity: 'hour' | 'day';
}

/**
 * Reader performance analytics response
 */
export interface ReaderAnalyticsDTO {
  readonly readerId: string;
  readonly readerName: string;
  readonly zoneId: string;
  readonly zoneName: string;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Performance metrics */
  readonly performance: {
    readonly totalReads: number;
    readonly uniqueTags: number;
    readonly avgRssi: number;
    readonly minRssi: number;
    readonly maxRssi: number;
    readonly lowConfidenceReads: number;
    readonly errorRate: number;
  };

  /** Antenna performance breakdown */
  readonly antennaStats: AntennaStatsDTO[];

  /** Time-series performance data */
  readonly timeSeries: ReaderTimeSeriesDTO[];

  /** Health status */
  readonly health: {
    readonly status: 'healthy' | 'degraded' | 'offline';
    readonly uptime: number;
    readonly lastSeen: string;
    readonly issues: string[];
  };
}

/**
 * Antenna statistics
 */
export interface AntennaStatsDTO {
  readonly antennaPort: number;
  readonly readCount: number;
  readonly avgRssi: number;
  readonly uniqueTags: number;
}

/**
 * Reader time series data point
 */
export interface ReaderTimeSeriesDTO {
  readonly timestamp: string;
  readonly readCount: number;
  readonly uniqueTags: number;
  readonly avgRssi: number;
  readonly errorCount: number;
}

// =============================================================================
// System Metrics Analytics
// =============================================================================

/**
 * System metrics request
 */
export interface GetSystemMetricsInput {
  readonly tenantId: string;
  readonly hours: number;
  readonly granularity: 'minute' | 'hour';
}

/**
 * System metrics response
 */
export interface SystemMetricsDTO {
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Current system status */
  readonly current: {
    readonly totalItems: number;
    readonly activeReaders: number;
    readonly activeZones: number;
    readonly readsPerMinute: number;
    readonly avgLatencyMs: number;
  };

  /** Historical metrics */
  readonly history: SystemMetricsTimeSeriesDTO[];

  /** Resource usage */
  readonly resources: {
    readonly databaseSizeMb: number;
    readonly compressionRatio: number;
    readonly queryAvgMs: number;
    readonly cacheHitRate: number;
  };
}

/**
 * System metrics time series
 */
export interface SystemMetricsTimeSeriesDTO {
  readonly timestamp: string;
  readonly totalReads: number;
  readonly activeItems: number;
  readonly activeZones: number;
  readonly activeReaders: number;
  readonly avgConfidence: number;
}

// =============================================================================
// Trend Analytics
// =============================================================================

/**
 * Trend analysis request
 */
export interface GetTrendAnalyticsInput {
  readonly tenantId: string;
  readonly metric: 'reads' | 'items' | 'zones' | 'movements';
  readonly period: 'day' | 'week' | 'month';
  readonly comparePrevious: boolean;
}

/**
 * Trend analysis response
 */
export interface TrendAnalyticsDTO {
  readonly metric: string;
  readonly period: {
    readonly current: { start: string; end: string };
    readonly previous: { start: string; end: string } | null;
  };

  /** Trend data */
  readonly trend: {
    readonly direction: 'up' | 'down' | 'stable';
    readonly changePercent: number;
    readonly currentValue: number;
    readonly previousValue: number | null;
  };

  /** Time series for the period */
  readonly data: TrendDataPointDTO[];
}

/**
 * Trend data point
 */
export interface TrendDataPointDTO {
  readonly timestamp: string;
  readonly value: number;
  readonly previousValue: number | null;
}

// =============================================================================
// Export/Report DTOs
// =============================================================================

/**
 * Report generation request
 */
export interface GenerateReportInput {
  readonly tenantId: string;
  readonly reportType: 'dashboard' | 'zone' | 'item' | 'reader' | 'system';
  readonly format: 'json' | 'csv' | 'pdf';
  readonly startDate: Date;
  readonly endDate: Date;
  readonly filters?: {
    readonly zoneIds?: string[];
    readonly itemIds?: string[];
    readonly readerIds?: string[];
  };
}

/**
 * Report generation response
 */
export interface ReportDTO {
  readonly reportId: string;
  readonly reportType: string;
  readonly format: string;
  readonly generatedAt: string;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };
  readonly downloadUrl?: string;
  readonly data?: unknown;
}

// =============================================================================
// Anomaly Detection DTOs
// =============================================================================

/**
 * Anomaly detection request
 */
export interface GetAnomaliesInput {
  readonly tenantId: string;
  readonly hours: number;
  readonly severity?: 'low' | 'medium' | 'high';
}

/**
 * Detected anomaly
 */
export interface AnomalyDTO {
  readonly id: string;
  readonly type: 'unusual_location' | 'missing_item' | 'reader_failure' | 'unusual_pattern';
  readonly severity: 'low' | 'medium' | 'high';
  readonly detectedAt: string;
  readonly description: string;
  readonly affectedEntity: {
    readonly type: 'item' | 'zone' | 'reader';
    readonly id: string;
    readonly name: string;
  };
  readonly context: Record<string, unknown>;
  readonly resolved: boolean;
}

// =============================================================================
// Aggregated Analytics Query Types
// =============================================================================

/**
 * Time bucket for aggregation
 */
export type TimeBucket = 'minute' | 'hour' | 'day' | 'week' | 'month';

/**
 * Common analytics query parameters
 */
export interface AnalyticsQueryParams {
  readonly tenantId: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly timeBucket?: TimeBucket;
  readonly limit?: number;
  readonly offset?: number;
}

// =============================================================================
// Phase 2.2: Item Flow & Path Analysis DTOs
// =============================================================================

/**
 * Item Journey request - complete path visualization
 */
export interface GetItemJourneyInput {
  readonly tenantId: string;
  readonly itemNumber: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly includeRawReads?: boolean;
}

/**
 * Item Journey response - complete path with timeline
 */
export interface ItemJourneyDTO {
  readonly itemId: string;
  readonly itemNumber: string;
  readonly rfidEpc: string;
  readonly description: string;

  /** Time range of journey */
  readonly period: {
    readonly start: string;
    readonly end: string;
    readonly durationHours: number;
  };

  /** Journey summary statistics */
  readonly summary: {
    readonly totalZonesVisited: number;
    readonly totalTransitions: number;
    readonly totalDistanceMeters: number | null;
    readonly totalDwellTimeMinutes: number;
    readonly avgDwellTimeMinutes: number;
    readonly longestDwellZone: string | null;
    readonly longestDwellMinutes: number;
  };

  /** Ordered list of zone visits (the path) */
  readonly path: JourneyStopDTO[];

  /** Zone transitions with timing */
  readonly transitions: JourneyTransitionDTO[];

  /** Current status */
  readonly currentStatus: {
    readonly zoneId: string | null;
    readonly zoneName: string | null;
    readonly since: string | null;
    readonly dwellTimeMinutes: number;
    readonly confidence: number;
    readonly status: 'active' | 'idle' | 'missing';
  };

  /** Detected anomalies in this journey */
  readonly anomalies: JourneyAnomalyDTO[];
}

/**
 * A stop in the item's journey (zone visit)
 */
export interface JourneyStopDTO {
  readonly sequence: number;
  readonly zoneId: string;
  readonly zoneName: string;
  readonly zoneType: string;
  readonly entryTime: string;
  readonly exitTime: string | null;
  readonly dwellTimeMinutes: number;
  readonly readCount: number;
  readonly avgConfidence: number;
  readonly avgRssi: number;
  readonly status: 'completed' | 'current';
}

/**
 * A transition between zones in the journey
 */
export interface JourneyTransitionDTO {
  readonly sequence: number;
  readonly timestamp: string;
  readonly fromZoneId: string | null;
  readonly fromZoneName: string | null;
  readonly toZoneId: string;
  readonly toZoneName: string;
  readonly transitionTimeSeconds: number;
  readonly confidence: number;
  readonly readerId: string;
  readonly readerName: string;
  readonly isExpectedTransition: boolean;
}

/**
 * Anomaly detected in item journey
 */
export interface JourneyAnomalyDTO {
  readonly type: 'unexpected_zone' | 'long_dwell' | 'rapid_movement' | 'signal_loss' | 'backtrack';
  readonly severity: 'low' | 'medium' | 'high';
  readonly timestamp: string;
  readonly description: string;
  readonly zoneId: string | null;
  readonly zoneName: string | null;
  readonly details: Record<string, unknown>;
}

// =============================================================================
// Zone Flow Analytics
// =============================================================================

/**
 * Zone Flow Analytics request
 */
export interface GetZoneFlowInput {
  readonly tenantId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly zoneId?: string;
  readonly minTransitions?: number;
}

/**
 * Zone Flow Analytics response - zone-to-zone movement patterns
 */
export interface ZoneFlowAnalyticsDTO {
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Overall flow statistics */
  readonly summary: {
    readonly totalTransitions: number;
    readonly uniqueItems: number;
    readonly activeZones: number;
    readonly avgTransitionsPerItem: number;
    readonly busiestHour: number;
    readonly busiestDay: string;
  };

  /** Zone-to-zone flow matrix */
  readonly flowMatrix: ZoneFlowMatrixDTO[];

  /** Top flow corridors (most traveled paths) */
  readonly topFlows: ZoneFlowCorridorDTO[];

  /** Zone entry/exit summary */
  readonly zoneStats: ZoneFlowStatsDTO[];

  /** Hourly flow patterns */
  readonly hourlyPatterns: HourlyFlowPatternDTO[];
}

/**
 * Single cell in zone-to-zone flow matrix
 */
export interface ZoneFlowMatrixDTO {
  readonly fromZoneId: string;
  readonly fromZoneName: string;
  readonly toZoneId: string;
  readonly toZoneName: string;
  readonly transitionCount: number;
  readonly uniqueItems: number;
  readonly avgTransitionTimeSeconds: number;
  readonly percentage: number;
}

/**
 * Top flow corridor (common path between zones)
 */
export interface ZoneFlowCorridorDTO {
  readonly rank: number;
  readonly fromZoneId: string;
  readonly fromZoneName: string;
  readonly toZoneId: string;
  readonly toZoneName: string;
  readonly transitionCount: number;
  readonly percentage: number;
  readonly avgTransitionTimeSeconds: number;
  readonly peakHour: number;
  readonly isReversible: boolean;
  readonly reverseCount: number;
}

/**
 * Zone entry/exit flow statistics
 */
export interface ZoneFlowStatsDTO {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly zoneType: string;
  readonly totalEntries: number;
  readonly totalExits: number;
  readonly netFlow: number;
  readonly uniqueItemsEntered: number;
  readonly uniqueItemsExited: number;
  readonly avgDwellTimeMinutes: number;
  readonly throughput: number;
  readonly congestionIndex: number;
}

/**
 * Hourly flow pattern
 */
export interface HourlyFlowPatternDTO {
  readonly hour: number;
  readonly dayOfWeek: number;
  readonly transitionCount: number;
  readonly uniqueItems: number;
  readonly avgTransitionTime: number;
  readonly intensity: number;
}

// =============================================================================
// Bottleneck Analysis
// =============================================================================

/**
 * Bottleneck Analysis request
 */
export interface GetBottleneckAnalysisInput {
  readonly tenantId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly dwellThresholdMinutes?: number;
  readonly congestionThreshold?: number;
}

/**
 * Bottleneck Analysis response
 */
export interface BottleneckAnalysisDTO {
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Overall bottleneck summary */
  readonly summary: {
    readonly totalBottlenecks: number;
    readonly criticalBottlenecks: number;
    readonly avgCongestionIndex: number;
    readonly totalDelayMinutes: number;
    readonly affectedItems: number;
  };

  /** Identified bottleneck zones */
  readonly bottlenecks: BottleneckZoneDTO[];

  /** Congestion timeline */
  readonly congestionTimeline: CongestionTimelineDTO[];

  /** Recommendations */
  readonly recommendations: BottleneckRecommendationDTO[];
}

/**
 * Bottleneck zone details
 */
export interface BottleneckZoneDTO {
  readonly rank: number;
  readonly zoneId: string;
  readonly zoneName: string;
  readonly zoneType: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';

  /** Bottleneck metrics */
  readonly metrics: {
    readonly avgDwellTimeMinutes: number;
    readonly maxDwellTimeMinutes: number;
    readonly congestionIndex: number;
    readonly itemsAffected: number;
    readonly totalDelayMinutes: number;
    readonly throughputReduction: number;
  };

  /** When bottleneck occurs */
  readonly peakTimes: {
    readonly hour: number;
    readonly dayOfWeek: number;
    readonly frequency: number;
  }[];

  /** Upstream/downstream impact */
  readonly impact: {
    readonly upstreamZones: string[];
    readonly downstreamZones: string[];
    readonly cascadeRisk: number;
  };
}

/**
 * Congestion timeline entry
 */
export interface CongestionTimelineDTO {
  readonly timestamp: string;
  readonly zoneId: string;
  readonly zoneName: string;
  readonly congestionLevel: number;
  readonly itemCount: number;
  readonly avgWaitTimeMinutes: number;
}

/**
 * Bottleneck recommendation
 */
export interface BottleneckRecommendationDTO {
  readonly priority: 'low' | 'medium' | 'high';
  readonly type: 'capacity' | 'routing' | 'scheduling' | 'staffing';
  readonly zoneId: string;
  readonly zoneName: string;
  readonly description: string;
  readonly expectedImprovement: string;
  readonly implementationEffort: 'low' | 'medium' | 'high';
}

// =============================================================================
// Path Pattern Analytics
// =============================================================================

/**
 * Path Pattern Analysis request
 */
export interface GetPathPatternsInput {
  readonly tenantId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly minOccurrences?: number;
  readonly maxPathLength?: number;
}

/**
 * Path Pattern Analysis response
 */
export interface PathPatternsDTO {
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Pattern summary */
  readonly summary: {
    readonly totalPatternsFound: number;
    readonly uniquePathsAnalyzed: number;
    readonly avgPathLength: number;
    readonly mostCommonStartZone: string;
    readonly mostCommonEndZone: string;
  };

  /** Discovered path patterns */
  readonly patterns: PathPatternDTO[];

  /** Common subsequences */
  readonly commonSubsequences: PathSubsequenceDTO[];
}

/**
 * Discovered path pattern
 */
export interface PathPatternDTO {
  readonly patternId: string;
  readonly rank: number;
  readonly path: PathNodeDTO[];
  readonly occurrences: number;
  readonly percentage: number;
  readonly avgDurationMinutes: number;
  readonly minDurationMinutes: number;
  readonly maxDurationMinutes: number;
  readonly itemsFollowing: number;
  readonly lastOccurrence: string;
  readonly isOptimalPath: boolean;
  readonly deviationFromOptimal: number | null;
}

/**
 * Node in a path pattern
 */
export interface PathNodeDTO {
  readonly sequence: number;
  readonly zoneId: string;
  readonly zoneName: string;
  readonly zoneType: string;
  readonly avgDwellTimeMinutes: number;
  readonly transitionToNextSeconds: number | null;
}

/**
 * Common path subsequence
 */
export interface PathSubsequenceDTO {
  readonly subsequenceId: string;
  readonly zones: string[];
  readonly zoneNames: string[];
  readonly occurrences: number;
  readonly avgDurationMinutes: number;
  readonly foundInPatterns: string[];
}

// =============================================================================
// Flow Anomaly Detection
// =============================================================================

/**
 * Flow Anomaly Detection request
 */
export interface GetFlowAnomaliesInput {
  readonly tenantId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly severityFilter?: ('low' | 'medium' | 'high' | 'critical')[];
  readonly typeFilter?: FlowAnomalyType[];
  readonly limit?: number;
}

export type FlowAnomalyType =
  | 'unexpected_transition'
  | 'bypassed_zone'
  | 'unusual_dwell_time'
  | 'circular_movement'
  | 'rapid_transitions'
  | 'stalled_item'
  | 'wrong_direction';

/**
 * Flow Anomaly Detection response
 */
export interface FlowAnomaliesDTO {
  readonly period: {
    readonly start: string;
    readonly end: string;
  };

  /** Anomaly summary */
  readonly summary: {
    readonly totalAnomalies: number;
    readonly criticalCount: number;
    readonly highCount: number;
    readonly mediumCount: number;
    readonly lowCount: number;
    readonly affectedItems: number;
    readonly affectedZones: number;
  };

  /** Anomaly breakdown by type */
  readonly byType: FlowAnomalyByTypeDTO[];

  /** Detected anomalies */
  readonly anomalies: FlowAnomalyDetailDTO[];

  /** Anomaly trends */
  readonly trends: FlowAnomalyTrendDTO[];
}

/**
 * Anomaly count by type
 */
export interface FlowAnomalyByTypeDTO {
  readonly type: FlowAnomalyType;
  readonly count: number;
  readonly percentage: number;
  readonly trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Detailed flow anomaly
 */
export interface FlowAnomalyDetailDTO {
  readonly anomalyId: string;
  readonly type: FlowAnomalyType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly detectedAt: string;
  readonly itemId: string;
  readonly itemNumber: string;

  /** Anomaly context */
  readonly context: {
    readonly expectedBehavior: string;
    readonly actualBehavior: string;
    readonly deviation: number;
  };

  /** Location information */
  readonly location: {
    readonly zoneId: string;
    readonly zoneName: string;
    readonly previousZoneId: string | null;
    readonly previousZoneName: string | null;
  };

  /** Additional details */
  readonly details: Record<string, unknown>;

  /** Resolution status */
  readonly resolution: {
    readonly status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
    readonly resolvedAt: string | null;
    readonly resolvedBy: string | null;
    readonly notes: string | null;
  };
}

/**
 * Anomaly trend over time
 */
export interface FlowAnomalyTrendDTO {
  readonly timestamp: string;
  readonly totalCount: number;
  readonly byType: Record<FlowAnomalyType, number>;
  readonly bySeverity: Record<string, number>;
}
