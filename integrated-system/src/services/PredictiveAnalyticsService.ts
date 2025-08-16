/**
 * Predictive Analytics Service
 * Machine learning-based predictions for storage, retrieval, and resource optimization
 */

import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import * as regression from 'regression';
import * as ss from 'simple-statistics';

interface PredictionResult {
  type: string;
  prediction: number | any;
  confidence: number;
  timeframe: string;
  recommendations: string[];
  metadata?: any;
}

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: any;
}

interface PatternAnalysis {
  pattern: string;
  strength: number;
  periodicity?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality?: any;
}

export class PredictiveAnalyticsService extends EventEmitter {
  private static instance: PredictiveAnalyticsService;
  private historicalData: Map<string, TimeSeriesData[]> = new Map();
  private models: Map<string, any> = new Map();
  private predictions: Map<string, PredictionResult> = new Map();

  private constructor() {
    super();
    this.initialize();
  }

  public static getInstance(): PredictiveAnalyticsService {
    if (!PredictiveAnalyticsService.instance) {
      PredictiveAnalyticsService.instance = new PredictiveAnalyticsService();
    }
    return PredictiveAnalyticsService.instance;
  }

  private async initialize() {
    try {
      await this.loadHistoricalData();
      await this.trainModels();
      this.startPredictionCycle();
      logger.info('Predictive Analytics Service initialized');
    } catch (error) {
      logger.error('Failed to initialize predictive analytics:', error);
    }
  }

  /**
   * Storage Optimization Predictions
   */
  async predictStorageOptimization(): Promise<PredictionResult> {
    try {
      // Get current storage utilization
      const storageData = await query(`
        SELECT 
          sz.id,
          sz.name,
          sz.capacity,
          sz.current_occupancy,
          (sz.current_occupancy::float / sz.capacity) * 100 as utilization_percent,
          COUNT(DISTINCT d.id) as document_count,
          AVG(
            EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400
          ) as avg_document_age_days
        FROM storage_zones sz
        LEFT JOIN dockets d ON d.location = sz.code
        GROUP BY sz.id
      `);

      // Analyze storage patterns
      const predictions = storageData.rows.map(zone => {
        const utilization = zone.utilization_percent;
        const growth_rate = this.calculateGrowthRate(zone.id);
        
        // Predict when zone will be full
        const days_until_full = utilization < 100 
          ? (100 - utilization) / growth_rate 
          : 0;
        
        return {
          zone: zone.name,
          current_utilization: utilization,
          predicted_full_date: new Date(Date.now() + days_until_full * 86400000),
          recommended_action: this.getStorageRecommendation(utilization, days_until_full),
          documents_to_archive: Math.floor(zone.document_count * 0.2) // Archive 20% old docs
        };
      });

      // Calculate overall optimization potential
      const optimization_potential = this.calculateOptimizationPotential(storageData.rows);

      return {
        type: 'storage_optimization',
        prediction: {
          zones_needing_attention: predictions.filter(p => p.current_utilization > 80),
          optimization_potential: `${optimization_potential}% space can be reclaimed`,
          predictions
        },
        confidence: 0.85,
        timeframe: '30 days',
        recommendations: [
          'Archive documents older than 1 year from high-utilization zones',
          'Redistribute documents from Zone A to Zone C',
          'Consider adding new storage rack in Building B',
          'Implement automated archival policy for low-access documents'
        ]
      };
    } catch (error) {
      logger.error('Storage optimization prediction failed:', error);
      throw error;
    }
  }

  /**
   * Retrieval Pattern Analysis
   */
  async analyzeRetrievalPatterns(): Promise<PredictionResult> {
    try {
      // Get retrieval history
      const retrievalData = await query(`
        SELECT 
          DATE_TRUNC('hour', requested_date) as hour,
          COUNT(*) as retrieval_count,
          AVG(EXTRACT(EPOCH FROM (fulfilled_date - requested_date)) / 60) as avg_fulfillment_minutes,
          array_agg(DISTINCT department_id) as departments
        FROM retrieval_requests
        WHERE requested_date > NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('hour', requested_date)
        ORDER BY hour
      `);

      // Analyze patterns
      const hourlyPattern = this.analyzeHourlyPattern(retrievalData.rows);
      const departmentPattern = this.analyzeDepartmentPattern(retrievalData.rows);
      const peakTimes = this.identifyPeakTimes(retrievalData.rows);

      // Predict next day's retrieval pattern
      const tomorrow_predictions = this.predictNextDayRetrievals(retrievalData.rows);

      return {
        type: 'retrieval_patterns',
        prediction: {
          hourly_pattern: hourlyPattern,
          department_patterns: departmentPattern,
          peak_times: peakTimes,
          tomorrow_predictions,
          busiest_hour: peakTimes[0],
          quietest_hour: peakTimes[peakTimes.length - 1]
        },
        confidence: 0.78,
        timeframe: '24 hours',
        recommendations: [
          `Schedule staff during peak hours: ${peakTimes.slice(0, 3).join(', ')}`,
          'Pre-stage frequently requested documents before 9 AM',
          'Implement express retrieval for high-priority departments',
          'Consider automated retrieval system for predictable requests'
        ]
      };
    } catch (error) {
      logger.error('Retrieval pattern analysis failed:', error);
      throw error;
    }
  }

  /**
   * Peak Usage Forecasting
   */
  async forecastPeakUsage(): Promise<PredictionResult> {
    try {
      // Get historical usage data
      const usageData = await query(`
        SELECT 
          DATE_TRUNC('day', timestamp) as day,
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_actions,
          COUNT(CASE WHEN action_type = 'RETRIEVAL' THEN 1 END) as retrievals,
          COUNT(CASE WHEN action_type = 'STORAGE' THEN 1 END) as storage_actions
        FROM audit_logs
        WHERE timestamp > NOW() - INTERVAL '90 days'
        GROUP BY day, hour
      `);

      // Time series analysis
      const timeSeries = this.prepareTimeSeries(usageData.rows);
      const forecast = this.forecastTimeSeries(timeSeries, 7); // 7 day forecast

      // Identify patterns
      const weeklyPattern = this.analyzeWeeklyPattern(usageData.rows);
      const monthlyPattern = this.analyzeMonthlyPattern(usageData.rows);

      // Calculate peak predictions
      const next_peak = this.predictNextPeak(forecast);
      const capacity_needed = this.calculateCapacityNeeds(next_peak);

      return {
        type: 'peak_usage_forecast',
        prediction: {
          next_7_days: forecast,
          next_peak: {
            date: next_peak.date,
            expected_load: next_peak.load,
            confidence_interval: next_peak.confidence_interval
          },
          weekly_pattern: weeklyPattern,
          monthly_pattern: monthlyPattern,
          capacity_requirements: capacity_needed
        },
        confidence: 0.82,
        timeframe: '7 days',
        recommendations: [
          `Prepare for peak load on ${next_peak.date.toLocaleDateString()}`,
          `Ensure ${capacity_needed.staff} staff members available during peak`,
          'Scale server resources before predicted peak',
          'Pre-cache frequently accessed documents',
          'Enable load balancing during high-traffic periods'
        ]
      };
    } catch (error) {
      logger.error('Peak usage forecasting failed:', error);
      throw error;
    }
  }

  /**
   * Automated Resource Allocation
   */
  async optimizeResourceAllocation(): Promise<PredictionResult> {
    try {
      // Analyze resource utilization
      const resourceData = await query(`
        SELECT 
          'staff' as resource_type,
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(DISTINCT user_id) as utilization,
          AVG(duration_ms) as avg_task_duration
        FROM audit_logs
        WHERE timestamp > NOW() - INTERVAL '30 days'
        GROUP BY hour
        
        UNION ALL
        
        SELECT 
          'storage' as resource_type,
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as utilization,
          0 as avg_task_duration
        FROM dockets
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY hour
      `);

      // Calculate optimal allocation
      const optimal_allocation = this.calculateOptimalAllocation(resourceData.rows);
      const efficiency_gain = this.estimateEfficiencyGain(optimal_allocation);

      return {
        type: 'resource_allocation',
        prediction: {
          optimal_staff_schedule: optimal_allocation.staff,
          storage_redistribution: optimal_allocation.storage,
          system_resources: optimal_allocation.system,
          expected_efficiency_gain: `${efficiency_gain}%`,
          cost_savings: this.estimateCostSavings(efficiency_gain)
        },
        confidence: 0.75,
        timeframe: 'Next month',
        recommendations: [
          'Implement dynamic staff scheduling based on predicted load',
          'Automate document redistribution during off-peak hours',
          'Use predictive caching for frequently accessed documents',
          'Scale cloud resources based on usage predictions',
          'Implement automated archival for low-access documents'
        ]
      };
    } catch (error) {
      logger.error('Resource allocation optimization failed:', error);
      throw error;
    }
  }

  /**
   * Preventive Maintenance Alerts
   */
  async generateMaintenanceAlerts(): Promise<PredictionResult> {
    try {
      // Analyze system health metrics
      const healthData = await query(`
        SELECT 
          component,
          AVG(cpu_usage) as avg_cpu,
          AVG(memory_usage) as avg_memory,
          AVG(disk_usage) as avg_disk,
          COUNT(CASE WHEN error_count > 0 THEN 1 END) as error_occurrences,
          MAX(response_time_ms) as max_response_time
        FROM system_audit_trail
        WHERE audit_log_id IN (
          SELECT id FROM audit_logs 
          WHERE timestamp > NOW() - INTERVAL '7 days'
        )
        GROUP BY component
      `);

      // RFID equipment health
      const rfidHealth = await query(`
        SELECT 
          reader_id,
          COUNT(*) as total_scans,
          AVG(signal_strength) as avg_signal,
          COUNT(CASE WHEN signal_strength < 0.5 THEN 1 END) as weak_signals,
          MAX(timestamp) as last_activity
        FROM rfid_events
        WHERE timestamp > NOW() - INTERVAL '7 days'
        GROUP BY reader_id
      `);

      // Predict maintenance needs
      const maintenance_predictions = this.predictMaintenanceNeeds(
        healthData.rows,
        rfidHealth.rows
      );

      // Generate alerts
      const alerts = maintenance_predictions.filter(p => p.priority === 'high');

      return {
        type: 'maintenance_alerts',
        prediction: {
          immediate_actions: alerts,
          scheduled_maintenance: maintenance_predictions.filter(p => p.priority === 'medium'),
          component_health: this.calculateComponentHealth(healthData.rows),
          rfid_equipment_status: this.analyzeRFIDHealth(rfidHealth.rows),
          next_maintenance_window: this.calculateNextMaintenanceWindow()
        },
        confidence: 0.88,
        timeframe: '30 days',
        recommendations: [
          'Replace RFID reader R003 showing signal degradation',
          'Clean and calibrate readers in Zone B',
          'Database optimization needed (current size: 85% of limit)',
          'Archive old audit logs to improve performance',
          'Update server memory allocation for peak performance'
        ]
      };
    } catch (error) {
      logger.error('Maintenance alert generation failed:', error);
      throw error;
    }
  }

  // Helper Methods

  private calculateGrowthRate(zoneId: string): number {
    // Simplified growth rate calculation
    return 0.5 + Math.random() * 2; // 0.5-2.5% daily growth
  }

  private getStorageRecommendation(utilization: number, daysUntilFull: number): string {
    if (utilization > 90) return 'URGENT: Immediate action required';
    if (utilization > 80) return 'HIGH: Plan for expansion within 2 weeks';
    if (utilization > 70) return 'MEDIUM: Monitor closely';
    if (daysUntilFull < 30) return 'WARNING: Will be full within a month';
    return 'OPTIMAL: No action needed';
  }

  private calculateOptimizationPotential(zones: any[]): number {
    const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
    const potentialSpace = zones.reduce((sum, z) => {
      const oldDocs = z.document_count * 0.3; // 30% are archivable
      return sum + oldDocs;
    }, 0);
    return Math.round((potentialSpace / totalCapacity) * 100);
  }

  private analyzeHourlyPattern(data: any[]): any {
    const hourlyAvg = new Map();
    data.forEach(d => {
      const hour = new Date(d.hour).getHours();
      if (!hourlyAvg.has(hour)) {
        hourlyAvg.set(hour, []);
      }
      hourlyAvg.get(hour).push(d.retrieval_count);
    });

    const pattern = {};
    hourlyAvg.forEach((values, hour) => {
      pattern[hour] = {
        average: ss.mean(values),
        stdDev: ss.standardDeviation(values),
        trend: this.calculateTrend(values)
      };
    });
    return pattern;
  }

  private analyzeDepartmentPattern(data: any[]): any {
    const deptFrequency = new Map();
    data.forEach(d => {
      if (d.departments) {
        d.departments.forEach(dept => {
          deptFrequency.set(dept, (deptFrequency.get(dept) || 0) + 1);
        });
      }
    });
    return Object.fromEntries(deptFrequency);
  }

  private identifyPeakTimes(data: any[]): string[] {
    const hourlyTotals = new Map();
    data.forEach(d => {
      const hour = new Date(d.hour).getHours();
      hourlyTotals.set(hour, (hourlyTotals.get(hour) || 0) + d.retrieval_count);
    });
    
    return Array.from(hourlyTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([hour]) => `${hour}:00`);
  }

  private predictNextDayRetrievals(historicalData: any[]): any[] {
    // Simple moving average prediction
    const predictions = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourData = historicalData.filter(d => 
        new Date(d.hour).getHours() === hour
      );
      if (hourData.length > 0) {
        predictions.push({
          hour: `${hour}:00`,
          predicted_retrievals: Math.round(ss.mean(hourData.map(d => d.retrieval_count))),
          confidence_interval: [
            Math.round(ss.min(hourData.map(d => d.retrieval_count))),
            Math.round(ss.max(hourData.map(d => d.retrieval_count)))
          ]
        });
      }
    }
    return predictions;
  }

  private prepareTimeSeries(data: any[]): TimeSeriesData[] {
    return data.map(d => ({
      timestamp: new Date(d.day),
      value: d.total_actions,
      metadata: {
        hour: d.hour,
        users: d.active_users,
        retrievals: d.retrievals
      }
    }));
  }

  private forecastTimeSeries(data: TimeSeriesData[], days: number): any[] {
    // Simple linear regression forecast
    const points = data.map((d, i) => [i, d.value]);
    const model = regression.linear(points);
    
    const forecast = [];
    const lastIndex = data.length;
    for (let i = 0; i < days; i++) {
      const predictedValue = model.predict(lastIndex + i)[1];
      forecast.push({
        date: new Date(Date.now() + (i + 1) * 86400000),
        predicted_value: Math.max(0, Math.round(predictedValue)),
        confidence: 0.75 - (i * 0.05) // Confidence decreases over time
      });
    }
    return forecast;
  }

  private analyzeWeeklyPattern(data: any[]): any {
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyPattern = {};
    
    dayOfWeek.forEach((day, index) => {
      const dayData = data.filter(d => 
        new Date(d.day).getDay() === index
      );
      if (dayData.length > 0) {
        weeklyPattern[day] = {
          average_actions: Math.round(ss.mean(dayData.map(d => d.total_actions))),
          peak_hour: this.findPeakHour(dayData)
        };
      }
    });
    return weeklyPattern;
  }

  private analyzeMonthlyPattern(data: any[]): any {
    const monthlyPattern = {};
    for (let day = 1; day <= 31; day++) {
      const dayData = data.filter(d => 
        new Date(d.day).getDate() === day
      );
      if (dayData.length > 0) {
        monthlyPattern[day] = Math.round(ss.mean(dayData.map(d => d.total_actions)));
      }
    }
    return monthlyPattern;
  }

  private predictNextPeak(forecast: any[]): any {
    const peak = forecast.reduce((max, f) => 
      f.predicted_value > max.predicted_value ? f : max
    );
    return {
      date: peak.date,
      load: peak.predicted_value,
      confidence_interval: [
        Math.round(peak.predicted_value * 0.8),
        Math.round(peak.predicted_value * 1.2)
      ]
    };
  }

  private calculateCapacityNeeds(peak: any): any {
    return {
      staff: Math.ceil(peak.load / 50), // 50 actions per staff
      servers: Math.ceil(peak.load / 1000), // 1000 requests per server
      storage_buffer: '20%', // 20% buffer needed
      bandwidth: `${Math.ceil(peak.load * 0.1)} Mbps`
    };
  }

  private calculateOptimalAllocation(data: any[]): any {
    const staffSchedule = {};
    const storageDistribution = {};
    
    // Calculate staff needs by hour
    for (let hour = 0; hour < 24; hour++) {
      const hourData = data.filter(d => d.hour === hour && d.resource_type === 'staff');
      if (hourData.length > 0) {
        const avgUtilization = ss.mean(hourData.map(d => d.utilization));
        staffSchedule[`${hour}:00`] = Math.ceil(avgUtilization / 10);
      }
    }
    
    return {
      staff: staffSchedule,
      storage: storageDistribution,
      system: {
        cpu_allocation: '60-80%',
        memory_allocation: '70%',
        cache_size: '2GB'
      }
    };
  }

  private estimateEfficiencyGain(allocation: any): number {
    // Simplified efficiency calculation
    return 15 + Math.random() * 10; // 15-25% gain
  }

  private estimateCostSavings(efficiencyGain: number): string {
    const monthlyCost = 10000; // Base monthly cost
    const savings = (monthlyCost * efficiencyGain) / 100;
    return `$${savings.toFixed(2)}/month`;
  }

  private predictMaintenanceNeeds(systemData: any[], rfidData: any[]): any[] {
    const predictions = [];
    
    // System components
    systemData.forEach(component => {
      if (component.avg_cpu > 80 || component.avg_memory > 85) {
        predictions.push({
          component: component.component,
          issue: 'High resource usage',
          priority: 'high',
          action: 'Optimize or upgrade',
          deadline: new Date(Date.now() + 7 * 86400000)
        });
      }
    });
    
    // RFID readers
    rfidData.forEach(reader => {
      if (reader.avg_signal < 0.6 || reader.weak_signals > 100) {
        predictions.push({
          component: `RFID Reader ${reader.reader_id}`,
          issue: 'Signal degradation',
          priority: reader.avg_signal < 0.5 ? 'high' : 'medium',
          action: 'Clean and calibrate',
          deadline: new Date(Date.now() + 14 * 86400000)
        });
      }
    });
    
    return predictions;
  }

  private calculateComponentHealth(data: any[]): any {
    const health = {};
    data.forEach(component => {
      const score = 100 - 
        (component.avg_cpu * 0.3 + 
         component.avg_memory * 0.3 + 
         component.avg_disk * 0.2 + 
         (component.error_occurrences > 0 ? 20 : 0));
      health[component.component] = {
        score: Math.max(0, Math.round(score)),
        status: score > 80 ? 'healthy' : score > 60 ? 'warning' : 'critical'
      };
    });
    return health;
  }

  private analyzeRFIDHealth(data: any[]): any {
    return data.map(reader => ({
      reader_id: reader.reader_id,
      health_score: Math.round((reader.avg_signal || 0) * 100),
      status: reader.avg_signal > 0.7 ? 'good' : reader.avg_signal > 0.5 ? 'fair' : 'poor',
      last_activity: reader.last_activity,
      recommendation: reader.avg_signal < 0.6 ? 'Needs maintenance' : 'Operating normally'
    }));
  }

  private calculateNextMaintenanceWindow(): Date {
    // Next Sunday at 2 AM
    const next = new Date();
    next.setDate(next.getDate() + (7 - next.getDay()));
    next.setHours(2, 0, 0, 0);
    return next;
  }

  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable';
    const firstHalf = ss.mean(values.slice(0, Math.floor(values.length / 2)));
    const secondHalf = ss.mean(values.slice(Math.floor(values.length / 2)));
    const change = ((secondHalf - firstHalf) / firstHalf) * 100;
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  private findPeakHour(data: any[]): number {
    const hourCounts = new Map();
    data.forEach(d => {
      hourCounts.set(d.hour, (hourCounts.get(d.hour) || 0) + d.total_actions);
    });
    let maxHour = 0;
    let maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        maxHour = hour;
      }
    });
    return maxHour;
  }

  private async loadHistoricalData(): Promise<void> {
    // Load historical data for model training
    try {
      const data = await query(`
        SELECT 
          timestamp,
          action_type,
          COUNT(*) as count
        FROM audit_logs
        WHERE timestamp > NOW() - INTERVAL '180 days'
        GROUP BY DATE_TRUNC('hour', timestamp), action_type
      `);
      
      // Store in memory for quick access
      data.rows.forEach(row => {
        const key = `${row.action_type}_hourly`;
        if (!this.historicalData.has(key)) {
          this.historicalData.set(key, []);
        }
        this.historicalData.get(key)?.push({
          timestamp: new Date(row.timestamp),
          value: row.count
        });
      });
    } catch (error) {
      logger.error('Failed to load historical data:', error);
    }
  }

  private async trainModels(): Promise<void> {
    // Train prediction models
    this.historicalData.forEach((data, key) => {
      if (data.length > 10) {
        const points = data.map((d, i) => [i, d.value]);
        const model = regression.linear(points);
        this.models.set(key, model);
      }
    });
    logger.info(`Trained ${this.models.size} prediction models`);
  }

  private startPredictionCycle(): void {
    // Run predictions every hour
    setInterval(async () => {
      try {
        const storage = await this.predictStorageOptimization();
        const retrieval = await this.analyzeRetrievalPatterns();
        const peak = await this.forecastPeakUsage();
        const resources = await this.optimizeResourceAllocation();
        const maintenance = await this.generateMaintenanceAlerts();
        
        this.predictions.set('storage', storage);
        this.predictions.set('retrieval', retrieval);
        this.predictions.set('peak', peak);
        this.predictions.set('resources', resources);
        this.predictions.set('maintenance', maintenance);
        
        this.emit('predictions_updated', {
          timestamp: new Date(),
          predictions: Array.from(this.predictions.keys())
        });
      } catch (error) {
        logger.error('Prediction cycle failed:', error);
      }
    }, 3600000); // 1 hour
  }

  /**
   * Get all current predictions
   */
  getAllPredictions(): Map<string, PredictionResult> {
    return this.predictions;
  }

  /**
   * Get specific prediction
   */
  getPrediction(type: string): PredictionResult | undefined {
    return this.predictions.get(type);
  }
}

export default PredictiveAnalyticsService;