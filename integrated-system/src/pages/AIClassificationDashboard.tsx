/**
 * AI Classification Dashboard
 * Interface for AI-powered document classification and management
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface ClassificationResult {
  documentId: number;
  docketCode: string;
  title: string;
  predictedCategory: string;
  confidence: number;
  suggestedTags: string[];
  anomalyScore: number;
  isAnomaly: boolean;
  explanation: string;
}

interface AIMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalClassifications: number;
  anomaliesDetected: number;
  avgConfidence: number;
  avgProcessingTime: number;
}

interface PendingReview {
  id: number;
  docketCode: string;
  title: string;
  predictedCategory: string;
  confidence: number;
  anomalyScore: number;
  reason: string;
}

const AIClassificationDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [classificationResults, setClassificationResults] = useState<ClassificationResult[]>([]);
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [anomalyPatterns, setAnomalyPatterns] = useState<any[]>([]);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load metrics
      const metricsRes = await fetch('/api/ai/metrics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setMetrics(metricsData.data.current);
        setPerformanceData(metricsData.data.historical);
      }

      // Load pending reviews
      const reviewsRes = await fetch('/api/ai/review/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const reviewsData = await reviewsRes.json();
      if (reviewsData.success) {
        setPendingReviews(reviewsData.data);
      }

      // Load anomaly patterns
      const anomaliesRes = await fetch('/api/ai/anomalies/patterns', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const anomaliesData = await anomaliesRes.json();
      if (anomaliesData.success) {
        setAnomalyPatterns(anomaliesData.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyDocuments = async () => {
    if (selectedDocuments.length === 0) {
      alert('Please select documents to classify');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/classify/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentIds: selectedDocuments,
          autoApply: false
        })
      });

      const data = await response.json();
      if (data.success) {
        setClassificationResults(data.data.results);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Classification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProvideFeedback = async (documentId: number, correctCategory: string, correctTags: string[]) => {
    try {
      const response = await fetch(`/api/ai/feedback/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          correctCategory,
          correctTags,
          feedbackType: 'correction'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Feedback recorded successfully');
        loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  };

  const handleTrainModel = async () => {
    if (!confirm('Start model training? This may take several minutes.')) {
      return;
    }

    setIsTraining(true);
    try {
      const response = await fetch('/api/ai/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          useExistingData: true
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Training completed! Accuracy: ${(data.data.metrics.accuracy * 100).toFixed(2)}%`);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Training failed:', error);
      alert('Training failed. Please check the logs.');
    } finally {
      setIsTraining(false);
    }
  };

  const renderOverview = () => (
    <div className="overview-grid">
      {/* Key Metrics */}
      <div className="metrics-cards">
        <div className="metric-card">
          <h3>Accuracy</h3>
          <div className="metric-value">
            {metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : '-'}
          </div>
          <div className="metric-trend positive">↑ 2.3%</div>
        </div>
        <div className="metric-card">
          <h3>Classifications Today</h3>
          <div className="metric-value">{metrics?.totalClassifications || 0}</div>
          <div className="metric-subtitle">Avg confidence: {metrics ? `${(metrics.avgConfidence * 100).toFixed(1)}%` : '-'}</div>
        </div>
        <div className="metric-card">
          <h3>Anomalies Detected</h3>
          <div className="metric-value">{metrics?.anomaliesDetected || 0}</div>
          <div className="metric-subtitle">Requiring review</div>
        </div>
        <div className="metric-card">
          <h3>Processing Speed</h3>
          <div className="metric-value">{metrics?.avgProcessingTime || 0}ms</div>
          <div className="metric-subtitle">Per document</div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="chart-container">
        <h3>AI Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric_date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="accuracy_rate" stroke="#8884d8" name="Accuracy" />
            <Line type="monotone" dataKey="avg_confidence" stroke="#82ca9d" name="Confidence" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Distribution */}
      <div className="chart-container">
        <h3>Classification Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'Legal', value: 30, color: '#0088FE' },
                { name: 'Financial', value: 25, color: '#00C49F' },
                { name: 'HR', value: 20, color: '#FFBB28' },
                { name: 'Technical', value: 15, color: '#FF8042' },
                { name: 'Other', value: 10, color: '#8884D8' }
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}%`}
              outerRadius={80}
              fill="#8884d8"
            >
              {[0, 1, 2, 3, 4].map((index) => (
                <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderClassification = () => (
    <div className="classification-section">
      <div className="classification-header">
        <h3>Document Classification</h3>
        <button 
          className="btn-primary"
          onClick={handleClassifyDocuments}
          disabled={loading || selectedDocuments.length === 0}
        >
          {loading ? 'Classifying...' : `Classify ${selectedDocuments.length} Documents`}
        </button>
      </div>

      <div className="document-selector">
        <h4>Select Documents</h4>
        <div className="document-list">
          {/* In production, load actual documents */}
          {[1, 2, 3, 4, 5].map(id => (
            <label key={id} className="document-item">
              <input
                type="checkbox"
                checked={selectedDocuments.includes(id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDocuments([...selectedDocuments, id]);
                  } else {
                    setSelectedDocuments(selectedDocuments.filter(d => d !== id));
                  }
                }}
              />
              <span>DOC-2025-{String(id).padStart(4, '0')}</span>
            </label>
          ))}
        </div>
      </div>

      {classificationResults.length > 0 && (
        <div className="results-section">
          <h4>Classification Results</h4>
          <table className="results-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Predicted Category</th>
                <th>Confidence</th>
                <th>Tags</th>
                <th>Anomaly</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classificationResults.map(result => (
                <tr key={result.documentId} className={result.isAnomaly ? 'anomaly' : ''}>
                  <td>{result.docketCode}</td>
                  <td>{result.predictedCategory}</td>
                  <td>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill"
                        style={{ 
                          width: `${result.confidence * 100}%`,
                          backgroundColor: result.confidence > 0.7 ? '#4CAF50' : '#FFC107'
                        }}
                      />
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td>
                    <div className="tags">
                      {result.suggestedTags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {result.isAnomaly && (
                      <span className="anomaly-badge">⚠️ {(result.anomalyScore * 100).toFixed(0)}%</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-small">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="review-section">
      <h3>Documents Requiring Review</h3>
      <div className="review-queue">
        {pendingReviews.map(doc => (
          <div key={doc.id} className="review-card">
            <div className="review-header">
              <h4>{doc.docketCode}</h4>
              <span className="review-reason">{doc.reason}</span>
            </div>
            <p>{doc.title}</p>
            <div className="review-details">
              <div>
                <label>AI Prediction:</label>
                <span>{doc.predictedCategory}</span>
              </div>
              <div>
                <label>Confidence:</label>
                <span className={doc.confidence < 0.5 ? 'low-confidence' : ''}>
                  {(doc.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <label>Anomaly Score:</label>
                <span className={doc.anomalyScore > 0.7 ? 'high-anomaly' : ''}>
                  {(doc.anomalyScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="review-actions">
              <button className="btn-approve">Approve</button>
              <button className="btn-correct">Correct</button>
              <button className="btn-investigate">Investigate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnomalies = () => (
    <div className="anomalies-section">
      <h3>Anomaly Detection</h3>
      
      <div className="anomaly-patterns">
        <h4>Active Patterns</h4>
        <table className="patterns-table">
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Auto-Flag</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {anomalyPatterns.map(pattern => (
              <tr key={pattern.id}>
                <td>{pattern.pattern_name}</td>
                <td>{pattern.pattern_type}</td>
                <td>
                  <span className={`severity-badge severity-${pattern.severity}`}>
                    {pattern.severity}
                  </span>
                </td>
                <td>{pattern.auto_flag ? '✓' : '-'}</td>
                <td>
                  <button className="btn-small">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="anomaly-chart">
        <h4>Anomaly Trends</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric_date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="anomalies_detected" fill="#FF8042" name="Anomalies" />
            <Bar dataKey="user_corrections" fill="#8884D8" name="Corrections" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderTraining = () => (
    <div className="training-section">
      <h3>Model Training</h3>
      
      <div className="training-controls">
        <button 
          className="btn-primary"
          onClick={handleTrainModel}
          disabled={isTraining}
        >
          {isTraining ? 'Training in Progress...' : 'Start Training'}
        </button>
        <button className="btn-secondary">Import Model</button>
        <button className="btn-secondary">Export Model</button>
      </div>

      <div className="model-metrics">
        <h4>Current Model Performance</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={[
            { metric: 'Accuracy', value: metrics?.accuracy || 0 },
            { metric: 'Precision', value: metrics?.precision || 0 },
            { metric: 'Recall', value: metrics?.recall || 0 },
            { metric: 'F1 Score', value: metrics?.f1Score || 0 },
            { metric: 'Confidence', value: metrics?.avgConfidence || 0 }
          ]}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={90} domain={[0, 1]} />
            <Radar name="Performance" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="training-data">
        <h4>Training Data Management</h4>
        <div className="data-stats">
          <div className="stat">
            <label>Total Samples:</label>
            <span>1,234</span>
          </div>
          <div className="stat">
            <label>Categories:</label>
            <span>8</span>
          </div>
          <div className="stat">
            <label>Last Updated:</label>
            <span>2 hours ago</span>
          </div>
        </div>
        <button className="btn-secondary">Add Training Data</button>
      </div>
    </div>
  );

  return (
    <div className="ai-dashboard" style={{ background: theme.colors.background }}>
      <div className="dashboard-header">
        <h1>AI Classification System</h1>
        <div className="header-actions">
          <button onClick={loadDashboardData} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'classification' ? 'active' : ''}
          onClick={() => setActiveTab('classification')}
        >
          Classify
        </button>
        <button 
          className={activeTab === 'review' ? 'active' : ''}
          onClick={() => setActiveTab('review')}
        >
          Review Queue
        </button>
        <button 
          className={activeTab === 'anomalies' ? 'active' : ''}
          onClick={() => setActiveTab('anomalies')}
        >
          Anomalies
        </button>
        <button 
          className={activeTab === 'training' ? 'active' : ''}
          onClick={() => setActiveTab('training')}
        >
          Training
        </button>
      </div>

      <div className="dashboard-content">
        {loading && <div className="loading">Loading...</div>}
        {!loading && activeTab === 'overview' && renderOverview()}
        {!loading && activeTab === 'classification' && renderClassification()}
        {!loading && activeTab === 'review' && renderReview()}
        {!loading && activeTab === 'anomalies' && renderAnomalies()}
        {!loading && activeTab === 'training' && renderTraining()}
      </div>

      <style>{`
        .ai-dashboard {
          padding: 2rem;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .dashboard-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid ${theme.colors.border};
        }

        .dashboard-tabs button {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: ${theme.colors.text};
          border-bottom: 3px solid transparent;
        }

        .dashboard-tabs button.active {
          color: ${theme.colors.primary};
          border-bottom-color: ${theme.colors.primary};
        }

        .overview-grid {
          display: grid;
          gap: 2rem;
        }

        .metrics-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .metric-card {
          padding: 1.5rem;
          background: ${theme.colors.surface};
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: ${theme.colors.primary};
          margin: 0.5rem 0;
        }

        .metric-trend {
          font-size: 0.875rem;
        }

        .metric-trend.positive {
          color: #4CAF50;
        }

        .chart-container {
          background: ${theme.colors.surface};
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .classification-section {
          background: ${theme.colors.surface};
          padding: 2rem;
          border-radius: 8px;
        }

        .document-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin: 1rem 0;
        }

        .document-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: ${theme.colors.background};
          border-radius: 4px;
          cursor: pointer;
        }

        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .results-table th,
        .results-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid ${theme.colors.border};
        }

        .confidence-bar {
          position: relative;
          width: 100px;
          height: 20px;
          background: ${theme.colors.background};
          border-radius: 10px;
          overflow: hidden;
        }

        .confidence-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          transition: width 0.3s;
        }

        .tags {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .tag {
          padding: 0.25rem 0.5rem;
          background: ${theme.colors.primary}20;
          color: ${theme.colors.primary};
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .anomaly-badge {
          color: #FF8042;
          font-weight: bold;
        }

        .review-queue {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .review-card {
          padding: 1.5rem;
          background: ${theme.colors.surface};
          border-radius: 8px;
          border: 2px solid ${theme.colors.border};
        }

        .review-card:hover {
          border-color: ${theme.colors.primary};
        }

        .review-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .btn-primary,
        .btn-secondary,
        .btn-small {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .btn-primary {
          background: ${theme.colors.primary};
          color: white;
        }

        .btn-secondary {
          background: ${theme.colors.secondary};
          color: white;
        }

        .btn-approve {
          background: #4CAF50;
          color: white;
        }

        .btn-correct {
          background: #FFC107;
          color: black;
        }

        .btn-investigate {
          background: #FF5722;
          color: white;
        }

        .severity-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .severity-low {
          background: #E3F2FD;
          color: #1976D2;
        }

        .severity-medium {
          background: #FFF3E0;
          color: #F57C00;
        }

        .severity-high {
          background: #FFEBEE;
          color: #D32F2F;
        }

        .severity-critical {
          background: #D32F2F;
          color: white;
        }

        .training-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          font-size: 1.25rem;
          color: ${theme.colors.textSecondary};
        }
      `}</style>
    </div>
  );
};

export default AIClassificationDashboard;