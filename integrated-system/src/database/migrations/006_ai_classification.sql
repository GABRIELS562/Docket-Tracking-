-- =====================================================
-- AI Classification Tables
-- Machine learning models and classification data
-- =====================================================

-- AI models storage
CREATE TABLE IF NOT EXISTS ai_models (
    id SERIAL PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    model_data TEXT NOT NULL,
    version VARCHAR(20) NOT NULL,
    metrics JSONB,
    accuracy NUMERIC(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- AI classification results
CREATE TABLE IF NOT EXISTS ai_classifications (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES dockets(id) ON DELETE CASCADE,
    predicted_category VARCHAR(50),
    confidence NUMERIC(5,4),
    suggested_tags JSONB,
    anomaly_score NUMERIC(5,4),
    model_version VARCHAR(20),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User feedback for AI improvement
CREATE TABLE IF NOT EXISTS ai_feedback (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES dockets(id) ON DELETE CASCADE,
    classification_id INTEGER REFERENCES ai_classifications(id),
    user_id INTEGER REFERENCES users(id),
    correct_category VARCHAR(50),
    correct_tags JSONB,
    feedback_type VARCHAR(20), -- correct, incorrect, partial
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI training data
CREATE TABLE IF NOT EXISTS ai_training_data (
    id SERIAL PRIMARY KEY,
    document_text TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tags JSONB,
    source VARCHAR(50), -- manual, feedback, import
    quality_score NUMERIC(3,2),
    used_in_training BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Anomaly detection patterns
CREATE TABLE IF NOT EXISTS ai_anomaly_patterns (
    id SERIAL PRIMARY KEY,
    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50), -- category_mismatch, time_anomaly, content_anomaly
    pattern_rules JSONB NOT NULL,
    severity VARCHAR(20), -- low, medium, high, critical
    auto_flag BOOLEAN DEFAULT FALSE,
    notification_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Smart tag dictionary
CREATE TABLE IF NOT EXISTS ai_tag_dictionary (
    id SERIAL PRIMARY KEY,
    tag VARCHAR(50) UNIQUE NOT NULL,
    tag_type VARCHAR(30), -- category, priority, department, year, custom
    synonyms TEXT[],
    related_tags TEXT[],
    usage_count INTEGER DEFAULT 0,
    auto_suggest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI performance metrics
CREATE TABLE IF NOT EXISTS ai_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    model_version VARCHAR(20),
    total_classifications INTEGER DEFAULT 0,
    accurate_classifications INTEGER DEFAULT 0,
    accuracy_rate NUMERIC(5,4),
    avg_confidence NUMERIC(5,4),
    anomalies_detected INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    false_negatives INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER,
    user_corrections INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category patterns for learning
CREATE TABLE IF NOT EXISTS ai_category_patterns (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    keywords TEXT[],
    typical_tags TEXT[],
    department_associations TEXT[],
    confidence_threshold NUMERIC(3,2) DEFAULT 0.7,
    min_keyword_matches INTEGER DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add AI columns to dockets table
ALTER TABLE dockets ADD COLUMN IF NOT EXISTS ai_classified BOOLEAN DEFAULT FALSE;
ALTER TABLE dockets ADD COLUMN IF NOT EXISTS ai_tags JSONB;
ALTER TABLE dockets ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,4);
ALTER TABLE dockets ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_classifications_document ON ai_classifications(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_classifications_confidence ON ai_classifications(confidence);
CREATE INDEX IF NOT EXISTS idx_ai_classifications_anomaly ON ai_classifications(anomaly_score);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_document ON ai_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_used ON ai_training_data(used_in_training);
CREATE INDEX IF NOT EXISTS idx_ai_tag_dictionary_tag ON ai_tag_dictionary(tag);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_date ON ai_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_dockets_ai_review ON dockets(requires_review) WHERE requires_review = TRUE;

-- Create views for AI monitoring
CREATE OR REPLACE VIEW v_ai_performance AS
SELECT 
    DATE(ac.created_at) as date,
    COUNT(*) as total_classifications,
    AVG(ac.confidence) as avg_confidence,
    COUNT(CASE WHEN ac.anomaly_score > 0.7 THEN 1 END) as anomalies,
    COUNT(af.id) as user_corrections
FROM ai_classifications ac
LEFT JOIN ai_feedback af ON ac.id = af.classification_id
GROUP BY DATE(ac.created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW v_ai_anomalies AS
SELECT 
    d.docket_code,
    d.title,
    ac.predicted_category,
    ac.confidence,
    ac.anomaly_score,
    ac.suggested_tags,
    ac.created_at
FROM ai_classifications ac
JOIN dockets d ON ac.document_id = d.id
WHERE ac.anomaly_score > 0.7
ORDER BY ac.created_at DESC;

-- Insert default anomaly patterns
INSERT INTO ai_anomaly_patterns (pattern_name, pattern_type, pattern_rules, severity, auto_flag) VALUES
('Low Confidence Classification', 'category_mismatch', '{"confidence_threshold": 0.5}', 'medium', TRUE),
('After Hours Document', 'time_anomaly', '{"hours": [0, 6, 22, 24]}', 'low', FALSE),
('Unusual Document Length', 'content_anomaly', '{"std_deviations": 2}', 'low', FALSE),
('Cross-Department Category', 'category_mismatch', '{"check_historical": true}', 'medium', TRUE),
('Missing Required Tags', 'content_anomaly', '{"required_tags_by_category": true}', 'high', TRUE)
ON CONFLICT DO NOTHING;

-- Insert common tags
INSERT INTO ai_tag_dictionary (tag, tag_type, synonyms) VALUES
('urgent', 'priority', ARRAY['asap', 'immediate', 'priority']),
('confidential', 'category', ARRAY['secret', 'classified', 'sensitive']),
('financial', 'category', ARRAY['finance', 'budget', 'accounting']),
('legal', 'category', ARRAY['law', 'judicial', 'court']),
('archived', 'category', ARRAY['old', 'historical', 'past'])
ON CONFLICT DO NOTHING;

-- Insert category patterns
INSERT INTO ai_category_patterns (category, keywords, typical_tags) VALUES
('Legal', ARRAY['contract', 'agreement', 'court', 'law', 'legal', 'litigation'], ARRAY['legal', 'contract', 'compliance']),
('Financial', ARRAY['invoice', 'payment', 'budget', 'expense', 'revenue', 'cost'], ARRAY['financial', 'accounting', 'budget']),
('HR', ARRAY['employee', 'staff', 'personnel', 'recruitment', 'performance'], ARRAY['hr', 'personnel', 'confidential']),
('Technical', ARRAY['system', 'software', 'hardware', 'network', 'database'], ARRAY['technical', 'it', 'system'])
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;