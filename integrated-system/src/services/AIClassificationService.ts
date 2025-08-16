/**
 * AI-Powered Document Classification Service
 * Automatic categorization, smart tagging, and anomaly detection
 */

import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import * as natural from 'natural';

interface Document {
  id: number;
  title: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
}

interface ClassificationResult {
  documentId: number;
  predictedCategory: string;
  confidence: number;
  suggestedTags: string[];
  anomalyScore: number;
  isAnomaly: boolean;
  explanation: string;
}

interface TrainingData {
  text: string;
  category: string;
  tags: string[];
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
}

export class AIClassificationService extends EventEmitter {
  private static instance: AIClassificationService;
  private classifier: any;
  private tfidf: any;
  private categories: string[] = [];
  private tagVocabulary: Set<string> = new Set();
  private anomalyThreshold: number = 0.7;
  private isModelReady: boolean = false;
  private modelVersion: string = '1.0.0';

  private constructor() {
    super();
    this.initialize();
  }

  public static getInstance(): AIClassificationService {
    if (!AIClassificationService.instance) {
      AIClassificationService.instance = new AIClassificationService();
    }
    return AIClassificationService.instance;
  }

  /**
   * Initialize AI service and load models
   */
  private async initialize() {
    try {
      // Initialize NLP components
      this.classifier = new natural.BayesClassifier();
      this.tfidf = new natural.TfIdf();
      
      // Load categories from database
      await this.loadCategories();
      
      // Load existing model or train new one
      await this.loadOrTrainModel();
      
      // Start continuous learning
      this.startContinuousLearning();
      
      logger.info('AI Classification Service initialized');
    } catch (error) {
      logger.error('Failed to initialize AI service:', error);
    }
  }

  /**
   * Load document categories from database
   */
  private async loadCategories() {
    const result = await query(`
      SELECT DISTINCT category 
      FROM dockets 
      WHERE category IS NOT NULL
      ORDER BY category
    `);
    
    this.categories = result.rows.map(r => r.category);
    
    // Add default categories if none exist
    if (this.categories.length === 0) {
      this.categories = [
        'Legal',
        'Financial',
        'HR',
        'Technical',
        'Administrative',
        'Confidential',
        'Public',
        'Archive'
      ];
    }
    
    logger.info(`Loaded ${this.categories.length} categories`);
  }

  /**
   * Load existing model or train new one
   */
  private async loadOrTrainModel() {
    try {
      // Check if model exists in database
      const modelResult = await query(`
        SELECT model_data, version, metrics
        FROM ai_models
        WHERE model_type = 'document_classifier'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (modelResult.rows.length > 0) {
        // Load existing model
        const modelData = modelResult.rows[0];
        await this.loadModel(modelData.model_data);
        this.modelVersion = modelData.version;
        logger.info(`Loaded AI model version ${this.modelVersion}`);
      } else {
        // Train new model with existing data
        await this.trainModel();
      }
      
      this.isModelReady = true;
    } catch (error) {
      logger.error('Failed to load/train model:', error);
      // Use fallback rule-based classification
      this.isModelReady = false;
    }
  }

  /**
   * Classify a document
   */
  async classifyDocument(document: Document): Promise<ClassificationResult> {
    const startTime = Date.now();
    
    try {
      // Prepare text for classification
      const text = this.prepareText(document);
      
      // Get classification
      const category = this.isModelReady 
        ? await this.predictCategory(text)
        : this.ruleBasedClassification(text);
      
      // Generate smart tags
      const tags = this.generateTags(text, category);
      
      // Calculate anomaly score
      const anomalyScore = await this.calculateAnomalyScore(document, category);
      
      // Determine if anomaly
      const isAnomaly = anomalyScore > this.anomalyThreshold;
      
      // Generate explanation
      const explanation = this.generateExplanation(category, tags, anomalyScore);
      
      // Store classification result
      await this.storeClassification(document.id, category, tags, anomalyScore);
      
      // Emit event
      this.emit('document_classified', {
        documentId: document.id,
        category,
        executionTime: Date.now() - startTime
      });
      
      return {
        documentId: document.id,
        predictedCategory: category.category,
        confidence: category.confidence,
        suggestedTags: tags,
        anomalyScore,
        isAnomaly,
        explanation
      };
    } catch (error) {
      logger.error('Classification failed:', error);
      throw error;
    }
  }

  /**
   * Prepare text for classification
   */
  private prepareText(document: Document): string {
    const parts = [
      document.title || '',
      document.description || '',
      document.content || ''
    ];
    
    const text = parts.join(' ').toLowerCase();
    
    // Remove special characters and normalize
    return text
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Predict category using ML model
   */
  private async predictCategory(text: string): Promise<{ category: string; confidence: number }> {
    if (!this.isModelReady) {
      return this.ruleBasedClassification(text);
    }
    
    // Use Bayes classifier for now (TensorFlow model can be added later)
    const classifications = this.classifier.getClassifications(text);
    
    if (classifications.length === 0) {
      return { category: 'Uncategorized', confidence: 0 };
    }
    
    const topClass = classifications[0];
    
    return {
      category: topClass.label,
      confidence: topClass.value
    };
  }

  /**
   * Rule-based classification fallback
   */
  private ruleBasedClassification(text: string): { category: string; confidence: number } {
    const rules = [
      { keywords: ['contract', 'legal', 'law', 'court', 'agreement'], category: 'Legal' },
      { keywords: ['invoice', 'payment', 'budget', 'financial', 'expense'], category: 'Financial' },
      { keywords: ['employee', 'hr', 'personnel', 'staff', 'recruitment'], category: 'HR' },
      { keywords: ['technical', 'specification', 'design', 'architecture'], category: 'Technical' },
      { keywords: ['confidential', 'secret', 'classified', 'restricted'], category: 'Confidential' },
      { keywords: ['memo', 'admin', 'procedure', 'policy'], category: 'Administrative' }
    ];
    
    const textLower = text.toLowerCase();
    let bestMatch = { category: 'Uncategorized', score: 0 };
    
    for (const rule of rules) {
      const score = rule.keywords.filter(keyword => 
        textLower.includes(keyword)
      ).length;
      
      if (score > bestMatch.score) {
        bestMatch = { category: rule.category, score };
      }
    }
    
    return {
      category: bestMatch.category,
      confidence: Math.min(bestMatch.score * 0.25, 1.0)
    };
  }

  /**
   * Generate smart tags for document
   */
  private generateTags(text: string, category: any): string[] {
    const tags: Set<string> = new Set();
    
    // Add category as tag
    tags.add(category.category || category);
    
    // Extract key phrases using TF-IDF
    this.tfidf.addDocument(text);
    const terms = this.tfidf.listTerms(0);
    
    // Get top terms as tags
    terms
      .slice(0, 5)
      .forEach(term => {
        if (term.term.length > 3 && !this.isStopWord(term.term)) {
          tags.add(term.term);
        }
      });
    
    // Add contextual tags
    const contextTags = this.getContextualTags(text);
    contextTags.forEach(tag => tags.add(tag));
    
    return Array.from(tags);
  }

  /**
   * Get contextual tags based on patterns
   */
  private getContextualTags(text: string): string[] {
    const tags: string[] = [];
    
    // Date patterns
    if (/\d{4}/.test(text)) {
      const year = text.match(/\d{4}/)?.[0];
      if (year) tags.push(`year-${year}`);
    }
    
    // Priority indicators
    if (/urgent|asap|immediate|priority/i.test(text)) {
      tags.push('high-priority');
    }
    
    // Department mentions
    const departments = ['legal', 'finance', 'hr', 'it', 'operations'];
    departments.forEach(dept => {
      if (text.toLowerCase().includes(dept)) {
        tags.push(`dept-${dept}`);
      }
    });
    
    // Document types
    const docTypes = ['report', 'memo', 'policy', 'procedure', 'form'];
    docTypes.forEach(type => {
      if (text.toLowerCase().includes(type)) {
        tags.push(`type-${type}`);
      }
    });
    
    return tags;
  }

  /**
   * Calculate anomaly score
   */
  private async calculateAnomalyScore(document: Document, category: any): Promise<number> {
    let anomalyScore = 0;
    const factors: number[] = [];
    
    // Factor 1: Low confidence classification
    if (category.confidence < 0.5) {
      factors.push(0.3);
    }
    
    // Factor 2: Unusual category for department
    const deptCategoryMatch = await this.checkDepartmentCategoryMatch(document, category.category);
    if (!deptCategoryMatch) {
      factors.push(0.3);
    }
    
    // Factor 3: Unusual time of creation
    const timeAnomaly = this.checkTimeAnomaly(document);
    if (timeAnomaly) {
      factors.push(0.2);
    }
    
    // Factor 4: Content length anomaly
    const lengthAnomaly = await this.checkLengthAnomaly(document);
    if (lengthAnomaly) {
      factors.push(0.2);
    }
    
    // Calculate weighted score
    anomalyScore = factors.reduce((sum, factor) => sum + factor, 0);
    
    return Math.min(anomalyScore, 1.0);
  }

  /**
   * Check if category matches department pattern
   */
  private async checkDepartmentCategoryMatch(document: any, category: string): Promise<boolean> {
    // Query historical patterns
    const result = await query(`
      SELECT COUNT(*) as count
      FROM dockets
      WHERE department_id = (
        SELECT department_id FROM dockets WHERE id = $1
      )
      AND category = $2
    `, [document.id, category]);
    
    return result.rows[0].count > 0;
  }

  /**
   * Check for time anomalies
   */
  private checkTimeAnomaly(document: any): boolean {
    if (!document.created_at) return false;
    
    const hour = new Date(document.created_at).getHours();
    // Flag if created outside business hours
    return hour < 6 || hour > 22;
  }

  /**
   * Check for content length anomalies
   */
  private async checkLengthAnomaly(document: Document): Promise<boolean> {
    const text = this.prepareText(document);
    const length = text.length;
    
    // Get average length for category
    const result = await query(`
      SELECT 
        AVG(LENGTH(COALESCE(title, '') || ' ' || COALESCE(description, ''))) as avg_length,
        STDDEV(LENGTH(COALESCE(title, '') || ' ' || COALESCE(description, ''))) as std_dev
      FROM dockets
      WHERE category = $1
    `, [document.category]);
    
    if (result.rows.length > 0) {
      const { avg_length, std_dev } = result.rows[0];
      // Check if length is more than 2 standard deviations from mean
      return Math.abs(length - avg_length) > (2 * std_dev);
    }
    
    return false;
  }

  /**
   * Generate explanation for classification
   */
  private generateExplanation(category: any, tags: string[], anomalyScore: number): string {
    const parts: string[] = [];
    
    // Category explanation
    parts.push(`Document classified as "${category.category || category}" with ${Math.round((category.confidence || 1) * 100)}% confidence.`);
    
    // Tags explanation
    if (tags.length > 0) {
      parts.push(`Suggested tags: ${tags.slice(0, 3).join(', ')}.`);
    }
    
    // Anomaly explanation
    if (anomalyScore > this.anomalyThreshold) {
      parts.push(`⚠️ Anomaly detected (score: ${Math.round(anomalyScore * 100)}%). Manual review recommended.`);
    }
    
    return parts.join(' ');
  }

  /**
   * Store classification result
   */
  private async storeClassification(
    documentId: number,
    category: any,
    tags: string[],
    anomalyScore: number
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO ai_classifications (
          document_id, predicted_category, confidence,
          suggested_tags, anomaly_score, model_version,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        documentId,
        category.category || category,
        category.confidence || 1,
        JSON.stringify(tags),
        anomalyScore,
        this.modelVersion
      ]);
      
      // Update document with AI suggestions if confidence is high
      if ((category.confidence || 1) > 0.8) {
        await query(`
          UPDATE dockets
          SET 
            category = COALESCE(category, $1),
            ai_tags = $2,
            ai_classified = TRUE
          WHERE id = $3
        `, [category.category || category, JSON.stringify(tags), documentId]);
      }
    } catch (error) {
      logger.error('Failed to store classification:', error);
    }
  }

  /**
   * Train model with new data
   */
  async trainModel(trainingData?: TrainingData[]): Promise<ModelMetrics> {
    logger.info('Starting model training...');
    
    try {
      // Get training data from database if not provided
      if (!trainingData) {
        trainingData = await this.getTrainingData();
      }
      
      // Clear existing classifier
      this.classifier = new natural.BayesClassifier();
      
      // Train classifier
      for (const data of trainingData) {
        this.classifier.addDocument(data.text, data.category);
        
        // Update tag vocabulary
        data.tags.forEach(tag => this.tagVocabulary.add(tag));
      }
      
      this.classifier.train();
      
      // Calculate metrics
      const metrics = await this.evaluateModel(trainingData);
      
      // Save model to database
      await this.saveModel(metrics);
      
      this.isModelReady = true;
      
      logger.info('Model training completed', metrics);
      
      return metrics;
    } catch (error) {
      logger.error('Model training failed:', error);
      throw error;
    }
  }

  /**
   * Get training data from database
   */
  private async getTrainingData(): Promise<TrainingData[]> {
    const result = await query(`
      SELECT 
        docket_code,
        title,
        description,
        category,
        ai_tags
      FROM dockets
      WHERE category IS NOT NULL
      LIMIT 1000
    `);
    
    return result.rows.map(row => ({
      text: `${row.docket_code} ${row.title} ${row.description || ''}`,
      category: row.category,
      tags: row.ai_tags ? JSON.parse(row.ai_tags) : []
    }));
  }

  /**
   * Evaluate model performance
   */
  private async evaluateModel(data: TrainingData[]): Promise<ModelMetrics> {
    // Split data for evaluation (simple split, in production use proper cross-validation)
    const testSize = Math.floor(data.length * 0.2);
    const testData = data.slice(-testSize);
    
    let correct = 0;
    const predictions: string[] = [];
    const actual: string[] = [];
    
    for (const item of testData) {
      const predicted = this.classifier.classify(item.text);
      predictions.push(predicted);
      actual.push(item.category);
      
      if (predicted === item.category) {
        correct++;
      }
    }
    
    const accuracy = correct / testData.length;
    
    // Calculate confusion matrix and other metrics
    const confusionMatrix = this.calculateConfusionMatrix(actual, predictions);
    const { precision, recall, f1Score } = this.calculateMetrics(confusionMatrix);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix
    };
  }

  /**
   * Calculate confusion matrix
   */
  private calculateConfusionMatrix(actual: string[], predicted: string[]): number[][] {
    const labels = Array.from(new Set([...actual, ...predicted])).sort();
    const matrix: number[][] = labels.map(() => new Array(labels.length).fill(0));
    
    for (let i = 0; i < actual.length; i++) {
      const actualIndex = labels.indexOf(actual[i]);
      const predictedIndex = labels.indexOf(predicted[i]);
      matrix[actualIndex][predictedIndex]++;
    }
    
    return matrix;
  }

  /**
   * Calculate precision, recall, F1 score
   */
  private calculateMetrics(confusionMatrix: number[][]): {
    precision: number;
    recall: number;
    f1Score: number;
  } {
    const n = confusionMatrix.length;
    let totalPrecision = 0;
    let totalRecall = 0;
    
    for (let i = 0; i < n; i++) {
      const tp = confusionMatrix[i][i];
      const fp = confusionMatrix.reduce((sum, row, j) => 
        j !== i ? sum + row[i] : sum, 0);
      const fn = confusionMatrix[i].reduce((sum, val, j) => 
        j !== i ? sum + val : sum, 0);
      
      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      
      totalPrecision += precision;
      totalRecall += recall;
    }
    
    const avgPrecision = totalPrecision / n;
    const avgRecall = totalRecall / n;
    const f1Score = 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) || 0;
    
    return {
      precision: avgPrecision,
      recall: avgRecall,
      f1Score
    };
  }

  /**
   * Save model to database
   */
  private async saveModel(metrics: ModelMetrics): Promise<void> {
    const modelData = JSON.stringify(this.classifier);
    this.modelVersion = `1.${Date.now()}`;
    
    await query(`
      INSERT INTO ai_models (
        model_type, model_data, version, metrics, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [
      'document_classifier',
      modelData,
      this.modelVersion,
      JSON.stringify(metrics)
    ]);
  }

  /**
   * Load model from data
   */
  private async loadModel(modelData: string): Promise<void> {
    this.classifier = natural.BayesClassifier.restore(JSON.parse(modelData));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was',
      'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'just'
    ];
    
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Batch classify multiple documents
   */
  async classifyBatch(documents: Document[]): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    
    for (const doc of documents) {
      try {
        const result = await this.classifyDocument(doc);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to classify document ${doc.id}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get classification suggestions for user review
   */
  async getSuggestions(documentId: number): Promise<any> {
    const result = await query(`
      SELECT * FROM ai_classifications
      WHERE document_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [documentId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      category: result.rows[0].predicted_category,
      confidence: result.rows[0].confidence,
      tags: JSON.parse(result.rows[0].suggested_tags || '[]'),
      anomalyScore: result.rows[0].anomaly_score,
      needsReview: result.rows[0].confidence < 0.7 || result.rows[0].anomaly_score > this.anomalyThreshold
    };
  }

  /**
   * User feedback for improving model
   */
  async provideFeedback(
    documentId: number,
    correctCategory: string,
    correctTags: string[]
  ): Promise<void> {
    try {
      // Store feedback
      await query(`
        INSERT INTO ai_feedback (
          document_id, correct_category, correct_tags,
          created_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [documentId, correctCategory, JSON.stringify(correctTags)]);
      
      // Update document
      await query(`
        UPDATE dockets
        SET category = $1, ai_tags = $2
        WHERE id = $3
      `, [correctCategory, JSON.stringify(correctTags), documentId]);
      
      // Retrain if enough feedback accumulated
      const feedbackCount = await query(`
        SELECT COUNT(*) as count
        FROM ai_feedback
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
      `);
      
      if (feedbackCount.rows[0].count >= 10) {
        this.emit('retrain_needed');
      }
    } catch (error) {
      logger.error('Failed to store feedback:', error);
    }
  }

  /**
   * Start continuous learning process
   */
  private startContinuousLearning(): void {
    // Check for retraining every hour
    setInterval(async () => {
      try {
        const needsRetraining = await this.checkRetrainingNeeded();
        
        if (needsRetraining) {
          logger.info('Starting automatic model retraining...');
          await this.trainModel();
        }
      } catch (error) {
        logger.error('Continuous learning check failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Check if model needs retraining
   */
  private async checkRetrainingNeeded(): Promise<boolean> {
    // Check feedback count
    const result = await query(`
      SELECT COUNT(*) as count
      FROM ai_feedback
      WHERE created_at > (
        SELECT MAX(created_at) 
        FROM ai_models 
        WHERE model_type = 'document_classifier'
      )
    `);
    
    return result.rows[0].count >= 50;
  }

  /**
   * Export model for backup
   */
  async exportModel(): Promise<any> {
    return {
      version: this.modelVersion,
      classifier: JSON.stringify(this.classifier),
      categories: this.categories,
      tagVocabulary: Array.from(this.tagVocabulary),
      anomalyThreshold: this.anomalyThreshold,
      exportDate: new Date()
    };
  }

  /**
   * Import model from backup
   */
  async importModel(modelData: any): Promise<void> {
    try {
      this.modelVersion = modelData.version;
      this.classifier = natural.BayesClassifier.restore(JSON.parse(modelData.classifier));
      this.categories = modelData.categories;
      this.tagVocabulary = new Set(modelData.tagVocabulary);
      this.anomalyThreshold = modelData.anomalyThreshold;
      this.isModelReady = true;
      
      logger.info(`Model imported successfully: version ${this.modelVersion}`);
    } catch (error) {
      logger.error('Failed to import model:', error);
      throw error;
    }
  }
}

export default AIClassificationService;