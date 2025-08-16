/**
 * Unit tests for AuditService
 */

import { AuditService } from '../../services/AuditService';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../../utils/logger');

describe('AuditService', () => {
  let auditService: AuditService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    auditService = AuditService.getInstance();
  });

  describe('logEvent', () => {
    it('should log a basic event successfully', async () => {
      const mockEventId = 123;
      (query as jest.Mock).mockResolvedValue({ 
        rows: [{ id: mockEventId }] 
      });

      const event = {
        userId: 1,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: '1',
        metadata: { ip: '127.0.0.1' },
        complianceLevel: 'STANDARD' as const
      };

      const result = await auditService.logEvent(event);
      
      expect(result).toBe(mockEventId);
      expect(query).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Audit event logged',
        expect.objectContaining({ event_id: expect.any(String) })
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      (query as jest.Mock).mockRejectedValue(error);

      const event = {
        userId: 1,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: '1',
        metadata: {},
        complianceLevel: 'STANDARD' as const
      };

      await expect(auditService.logEvent(event)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Failed to log audit event:', error);
    });
  });

  describe('logDataChange', () => {
    it('should log data changes correctly', async () => {
      (query as jest.Mock).mockResolvedValue({ 
        rows: [{ id: 1 }] 
      });

      const change = {
        auditLogId: 123,
        tableName: 'dockets',
        recordId: '456',
        operation: 'UPDATE' as const,
        oldValues: { status: 'active' },
        newValues: { status: 'archived' },
        changedBy: 1
      };

      await auditService.logDataChange(change);
      
      expect(query).toHaveBeenCalledTimes(1);
      const queryCall = (query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO data_changes');
    });
  });

  describe('logDocketMovement', () => {
    it('should track docket movements', async () => {
      (query as jest.Mock).mockResolvedValue({ 
        rows: [{ id: 1 }] 
      });

      const movement = {
        auditLogId: 123,
        docketId: 'DOC-2025-0001',
        fromLocation: 'Zone A',
        toLocation: 'Zone B',
        movedBy: 1,
        reason: 'Retrieval request',
        rfidTag: 'RFID-001'
      };

      await auditService.logDocketMovement(movement);
      
      expect(query).toHaveBeenCalledTimes(1);
      const queryCall = (query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO docket_movements');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report for date range', async () => {
      const mockData = {
        rows: [
          { action_type: 'LOGIN', count: '10' },
          { action_type: 'RETRIEVAL', count: '25' }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockData);

      const report = await auditService.generateComplianceReport(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      expect(report).toHaveProperty('startDate');
      expect(report).toHaveProperty('endDate');
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('total_events');
      expect(query).toHaveBeenCalled();
    });
  });

  describe('getAuditTrail', () => {
    it('should retrieve audit trail for an entity', async () => {
      const mockTrail = {
        rows: [
          {
            id: 1,
            timestamp: new Date(),
            user_id: 1,
            action: 'CREATE',
            entity_type: 'DOCKET',
            entity_id: '123'
          }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockTrail);

      const trail = await auditService.getAuditTrail('DOCKET', '123');
      
      expect(trail).toEqual(mockTrail.rows);
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should apply date range filter when provided', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });

      await auditService.getAuditTrail(
        'DOCKET', 
        '123',
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      
      const queryCall = (query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('timestamp BETWEEN');
    });
  });

  describe('purgeOldLogs', () => {
    it('should purge logs based on retention policy', async () => {
      (query as jest.Mock).mockResolvedValue({ 
        rowCount: 100 
      });

      const result = await auditService.purgeOldLogs();
      
      expect(result).toEqual({ deleted: 100 });
      expect(logger.info).toHaveBeenCalledWith('Purged 100 audit logs');
    });
  });

  describe('getRealTimeStats', () => {
    it('should calculate real-time statistics', async () => {
      const mockStats = {
        rows: [{
          total_events: '500',
          unique_users: '25',
          compliance_violations: '2',
          average_response_time: '250'
        }]
      };
      (query as jest.Mock).mockResolvedValue(mockStats);

      const stats = await auditService.getRealTimeStats();
      
      expect(stats).toHaveProperty('totalEvents', 500);
      expect(stats).toHaveProperty('uniqueUsers', 25);
      expect(stats).toHaveProperty('complianceViolations', 2);
      expect(stats).toHaveProperty('averageResponseTime', 250);
    });
  });
});