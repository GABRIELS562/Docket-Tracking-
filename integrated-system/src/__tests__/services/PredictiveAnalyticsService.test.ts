/**
 * Unit tests for PredictiveAnalyticsService
 */

import { PredictiveAnalyticsService } from '../../services/PredictiveAnalyticsService';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

jest.mock('../../database/connection');
jest.mock('../../utils/logger');

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = PredictiveAnalyticsService.getInstance();
  });

  describe('predictStorageOptimization', () => {
    it('should predict storage optimization opportunities', async () => {
      const mockStorageData = {
        rows: [
          {
            id: 1,
            name: 'Zone A',
            capacity: 1000,
            current_occupancy: 850,
            utilization_percent: 85,
            document_count: 500,
            avg_document_age_days: 180
          },
          {
            id: 2,
            name: 'Zone B',
            capacity: 1000,
            current_occupancy: 600,
            utilization_percent: 60,
            document_count: 350,
            avg_document_age_days: 90
          }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockStorageData);

      const result = await service.predictStorageOptimization();

      expect(result.type).toBe('storage_optimization');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.timeframe).toBe('30 days');
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const prediction = result.prediction as any;
      expect(prediction.zones_needing_attention).toBeInstanceOf(Array);
      expect(prediction.optimization_potential).toContain('%');
    });

    it('should identify zones needing immediate attention', async () => {
      const mockData = {
        rows: [
          {
            id: 1,
            name: 'Critical Zone',
            capacity: 100,
            current_occupancy: 95,
            utilization_percent: 95,
            document_count: 95,
            avg_document_age_days: 365
          }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockData);

      const result = await service.predictStorageOptimization();
      const prediction = result.prediction as any;
      
      expect(prediction.zones_needing_attention).toHaveLength(1);
      expect(prediction.zones_needing_attention[0].current_utilization).toBe(95);
    });
  });

  describe('analyzeRetrievalPatterns', () => {
    it('should analyze retrieval patterns and identify peak times', async () => {
      const mockRetrievalData = {
        rows: [
          {
            hour: '2025-01-15 09:00:00',
            retrieval_count: 25,
            avg_fulfillment_minutes: 15,
            departments: [1, 2, 3]
          },
          {
            hour: '2025-01-15 14:00:00',
            retrieval_count: 35,
            avg_fulfillment_minutes: 20,
            departments: [2, 3, 4]
          }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockRetrievalData);

      const result = await service.analyzeRetrievalPatterns();

      expect(result.type).toBe('retrieval_patterns');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.timeframe).toBe('24 hours');
      
      const prediction = result.prediction as any;
      expect(prediction).toHaveProperty('hourly_pattern');
      expect(prediction).toHaveProperty('peak_times');
      expect(prediction).toHaveProperty('tomorrow_predictions');
      expect(prediction.peak_times).toBeInstanceOf(Array);
    });
  });

  describe('forecastPeakUsage', () => {
    it('should forecast peak usage for next 7 days', async () => {
      const mockUsageData = {
        rows: [
          {
            day: '2025-01-15',
            hour: 9,
            active_users: 25,
            total_actions: 150,
            retrievals: 50,
            storage_actions: 30
          },
          {
            day: '2025-01-16',
            hour: 14,
            active_users: 30,
            total_actions: 200,
            retrievals: 70,
            storage_actions: 40
          }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockUsageData);

      const result = await service.forecastPeakUsage();

      expect(result.type).toBe('peak_usage_forecast');
      expect(result.timeframe).toBe('7 days');
      
      const prediction = result.prediction as any;
      expect(prediction.next_7_days).toBeInstanceOf(Array);
      expect(prediction.next_7_days).toHaveLength(7);
      expect(prediction.next_peak).toHaveProperty('date');
      expect(prediction.next_peak).toHaveProperty('expected_load');
      expect(prediction.capacity_requirements).toHaveProperty('staff');
    });

    it('should include weekly and monthly patterns', async () => {
      const mockData = {
        rows: Array(90).fill(null).map((_, i) => ({
          day: new Date(Date.now() - i * 86400000).toISOString(),
          hour: Math.floor(Math.random() * 24),
          active_users: Math.floor(Math.random() * 50),
          total_actions: Math.floor(Math.random() * 300),
          retrievals: Math.floor(Math.random() * 100),
          storage_actions: Math.floor(Math.random() * 50)
        }))
      };
      (query as jest.Mock).mockResolvedValue(mockData);

      const result = await service.forecastPeakUsage();
      const prediction = result.prediction as any;
      
      expect(prediction.weekly_pattern).toBeDefined();
      expect(prediction.monthly_pattern).toBeDefined();
      expect(Object.keys(prediction.weekly_pattern)).toContain('Monday');
    });
  });

  describe('optimizeResourceAllocation', () => {
    it('should calculate optimal resource allocation', async () => {
      const mockResourceData = {
        rows: [
          {
            resource_type: 'staff',
            hour: 9,
            utilization: 25,
            avg_task_duration: 1500
          },
          {
            resource_type: 'storage',
            hour: 14,
            utilization: 150,
            avg_task_duration: 0
          }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockResourceData);

      const result = await service.optimizeResourceAllocation();

      expect(result.type).toBe('resource_allocation');
      
      const prediction = result.prediction as any;
      expect(prediction.optimal_staff_schedule).toBeDefined();
      expect(prediction.expected_efficiency_gain).toContain('%');
      expect(prediction.cost_savings).toContain('$');
    });
  });

  describe('generateMaintenanceAlerts', () => {
    it('should generate maintenance alerts for system components', async () => {
      const mockHealthData = {
        rows: [
          {
            component: 'API Server',
            avg_cpu: 85,
            avg_memory: 90,
            avg_disk: 70,
            error_occurrences: 5,
            max_response_time: 5000
          }
        ]
      };
      
      const mockRFIDData = {
        rows: [
          {
            reader_id: 'R001',
            total_scans: 1000,
            avg_signal: 0.4,
            weak_signals: 150,
            last_activity: new Date()
          }
        ]
      };
      
      (query as jest.Mock)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockRFIDData);

      const result = await service.generateMaintenanceAlerts();

      expect(result.type).toBe('maintenance_alerts');
      expect(result.confidence).toBeGreaterThan(0);
      
      const prediction = result.prediction as any;
      expect(prediction.immediate_actions).toBeInstanceOf(Array);
      expect(prediction.component_health).toBeDefined();
      expect(prediction.rfid_equipment_status).toBeInstanceOf(Array);
      expect(prediction.next_maintenance_window).toBeInstanceOf(Date);
    });

    it('should prioritize alerts based on severity', async () => {
      const mockHealthData = {
        rows: [
          {
            component: 'Critical Server',
            avg_cpu: 95,
            avg_memory: 98,
            avg_disk: 90,
            error_occurrences: 20,
            max_response_time: 10000
          }
        ]
      };
      
      const mockRFIDData = {
        rows: [
          {
            reader_id: 'R002',
            total_scans: 500,
            avg_signal: 0.3,
            weak_signals: 300,
            last_activity: new Date()
          }
        ]
      };
      
      (query as jest.Mock)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockRFIDData);

      const result = await service.generateMaintenanceAlerts();
      const prediction = result.prediction as any;
      
      expect(prediction.immediate_actions.length).toBeGreaterThan(0);
      expect(prediction.immediate_actions[0].priority).toBe('high');
    });
  });

  describe('getAllPredictions', () => {
    it('should return all cached predictions', () => {
      const predictions = service.getAllPredictions();
      
      expect(predictions).toBeInstanceOf(Map);
    });
  });

  describe('getPrediction', () => {
    it('should return specific prediction by type', async () => {
      // First generate a prediction
      const mockData = {
        rows: [{
          id: 1,
          name: 'Zone A',
          capacity: 1000,
          current_occupancy: 850,
          utilization_percent: 85,
          document_count: 500,
          avg_document_age_days: 180
        }]
      };
      (query as jest.Mock).mockResolvedValue(mockData);
      
      await service.predictStorageOptimization();
      
      const prediction = service.getPrediction('storage');
      expect(prediction).toBeDefined();
      expect(prediction?.type).toBe('storage_optimization');
    });

    it('should return undefined for non-existent prediction', () => {
      const prediction = service.getPrediction('non_existent');
      expect(prediction).toBeUndefined();
    });
  });
});