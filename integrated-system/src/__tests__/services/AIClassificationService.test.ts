/**
 * Unit tests for AIClassificationService
 */

import { AIClassificationService } from '../../services/AIClassificationService';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

jest.mock('../../database/connection');
jest.mock('../../utils/logger');
jest.mock('natural', () => ({
  BayesClassifier: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    train: jest.fn(),
    classify: jest.fn().mockReturnValue('Legal'),
    getClassifications: jest.fn().mockReturnValue([
      { label: 'Legal', value: 0.8 },
      { label: 'Financial', value: 0.15 },
      { label: 'HR', value: 0.05 }
    ])
  })),
  TfIdf: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    tfidfs: jest.fn((term, callback) => {
      callback(0, 0.5);
      callback(1, 0.3);
    }),
    listTerms: jest.fn().mockReturnValue([
      { term: 'contract', tfidf: 0.8 },
      { term: 'agreement', tfidf: 0.6 }
    ])
  })),
  PorterStemmer: {
    stem: jest.fn((word) => word.toLowerCase())
  },
  WordTokenizer: jest.fn().mockImplementation(() => ({
    tokenize: jest.fn((text) => text.split(' '))
  }))
}));

describe('AIClassificationService', () => {
  let service: AIClassificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = AIClassificationService.getInstance();
  });

  describe('classifyDocument', () => {
    it('should classify a document and return results', async () => {
      const mockDocument = {
        id: 'DOC-001',
        title: 'Legal Contract Agreement',
        content: 'This is a legal contract between parties for services.',
        metadata: { type: 'contract', department: 'legal' }
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Training data
      (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 }); // Save classification

      const result = await service.classifyDocument(mockDocument);

      expect(result.documentId).toBe('DOC-001');
      expect(result.category).toBe('Legal');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.tags).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should handle documents with minimal content', async () => {
      const mockDocument = {
        id: 'DOC-002',
        title: 'Short Doc',
        content: 'Brief content',
        metadata: {}
      };

      (query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await service.classifyDocument(mockDocument);

      expect(result.documentId).toBe('DOC-002');
      expect(result.category).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe('batchClassify', () => {
    it('should classify multiple documents', async () => {
      const mockDocuments = [
        {
          id: 'DOC-001',
          title: 'Legal Document',
          content: 'Legal content here',
          metadata: {}
        },
        {
          id: 'DOC-002',
          title: 'Financial Report',
          content: 'Financial data and analysis',
          metadata: {}
        }
      ];

      (query as jest.Mock).mockResolvedValue({ rows: [] });

      const results = await service.batchClassify(mockDocuments);

      expect(results).toHaveLength(2);
      expect(results[0].documentId).toBe('DOC-001');
      expect(results[1].documentId).toBe('DOC-002');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in document classification', async () => {
      const mockDocument = {
        id: 'DOC-003',
        title: 'Suspicious Document',
        content: 'Unusual content pattern that does not match typical documents',
        metadata: { flagged: true }
      };

      const mockHistoricalData = {
        rows: [
          { category: 'Legal', avg_confidence: 0.85, pattern_hash: 'abc123' },
          { category: 'Financial', avg_confidence: 0.80, pattern_hash: 'def456' }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockHistoricalData);

      const anomalies = await service.detectAnomalies(mockDocument);

      expect(anomalies).toHaveProperty('isAnomaly');
      expect(anomalies).toHaveProperty('anomalyScore');
      expect(anomalies).toHaveProperty('reasons');
      expect(anomalies.reasons).toBeInstanceOf(Array);
    });

    it('should flag high anomaly scores', async () => {
      const mockDocument = {
        id: 'DOC-004',
        title: 'Very Unusual Document',
        content: 'Random text that does not fit any category',
        metadata: {}
      };

      (query as jest.Mock).mockResolvedValue({ rows: [] });

      const anomalies = await service.detectAnomalies(mockDocument);

      if (anomalies.anomalyScore > 0.7) {
        expect(anomalies.isAnomaly).toBe(true);
      }
    });
  });

  describe('generateSmartTags', () => {
    it('should generate relevant tags for a document', async () => {
      const mockDocument = {
        id: 'DOC-005',
        title: 'Employee Contract Agreement',
        content: 'This employment contract outlines terms and conditions for the employee position.',
        metadata: { department: 'HR' }
      };

      const tags = await service.generateSmartTags(mockDocument);

      expect(tags).toBeInstanceOf(Array);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toHaveProperty('tag');
      expect(tags[0]).toHaveProperty('relevance');
      expect(tags[0]).toHaveProperty('source');
    });
  });

  describe('retrainModel', () => {
    it('should retrain the model with new data', async () => {
      const mockTrainingData = {
        rows: [
          { document_id: 'DOC-001', category: 'Legal', content: 'Legal document text' },
          { document_id: 'DOC-002', category: 'Financial', content: 'Financial report data' },
          { document_id: 'DOC-003', category: 'HR', content: 'Human resources policy' }
        ]
      };
      (query as jest.Mock).mockResolvedValue(mockTrainingData);

      await service.retrainModel();

      expect(query).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Retrained model'));
    });
  });

  describe('getClassificationStats', () => {
    it('should return classification statistics', async () => {
      const mockStats = {
        rows: [{
          total_classifications: 1000,
          unique_categories: 5,
          avg_confidence: 0.82,
          low_confidence_count: 50
        }]
      };
      (query as jest.Mock).mockResolvedValue(mockStats);

      const stats = await service.getClassificationStats();

      expect(stats).toHaveProperty('totalClassifications', 1000);
      expect(stats).toHaveProperty('uniqueCategories', 5);
      expect(stats).toHaveProperty('averageConfidence', 0.82);
      expect(stats).toHaveProperty('lowConfidenceCount', 50);
    });
  });

  describe('suggestCategory', () => {
    it('should suggest categories based on partial content', async () => {
      const partialContent = 'This document contains financial';
      
      const suggestions = await service.suggestCategory(partialContent);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions[0]).toHaveProperty('category');
      expect(suggestions[0]).toHaveProperty('confidence');
    });
  });

  describe('improveClassification', () => {
    it('should record user feedback for model improvement', async () => {
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await service.improveClassification('DOC-001', 'Legal', 'Financial');

      expect(query).toHaveBeenCalled();
      const queryCall = (query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO classification_feedback');
    });
  });

  describe('getConfidenceThreshold', () => {
    it('should return current confidence threshold', () => {
      const threshold = service.getConfidenceThreshold();
      
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(1);
    });
  });

  describe('setConfidenceThreshold', () => {
    it('should update confidence threshold', () => {
      service.setConfidenceThreshold(0.75);
      const threshold = service.getConfidenceThreshold();
      
      expect(threshold).toBe(0.75);
    });

    it('should reject invalid threshold values', () => {
      expect(() => service.setConfidenceThreshold(1.5)).toThrow();
      expect(() => service.setConfidenceThreshold(-0.1)).toThrow();
    });
  });
});