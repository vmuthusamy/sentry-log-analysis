-- Add metrics_events table for tracking success/failure rates
CREATE TABLE IF NOT EXISTS metrics_events (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL, -- 'file_upload', 'file_analysis_view', 'anomaly_detection', 'ai_analysis'
    status VARCHAR NOT NULL, -- 'success', 'failure', 'error'
    metadata JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_metrics_user_id (user_id),
    INDEX idx_metrics_event_type (event_type),
    INDEX idx_metrics_timestamp (timestamp),
    INDEX idx_metrics_status (status)
);

-- Add GCP-specific configuration columns to existing tables
ALTER TABLE log_files ADD COLUMN IF NOT EXISTS gcp_bucket_path VARCHAR;
ALTER TABLE log_files ADD COLUMN IF NOT EXISTS processing_duration INTEGER; -- in milliseconds

-- Add AI provider tracking to anomalies
ALTER TABLE anomalies ADD COLUMN IF NOT EXISTS ai_provider VARCHAR DEFAULT 'openai';
ALTER TABLE anomalies ADD COLUMN IF NOT EXISTS processing_time INTEGER; -- in milliseconds

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_log_files_status ON log_files(status);
CREATE INDEX IF NOT EXISTS idx_log_files_user_id_status ON log_files(user_id, status);
CREATE INDEX IF NOT EXISTS idx_anomalies_risk_score ON anomalies(risk_score);
CREATE INDEX IF NOT EXISTS idx_anomalies_ai_provider ON anomalies(ai_provider);

-- Create a view for analytics dashboard
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
    u.username,
    u.id as user_id,
    COUNT(DISTINCT lf.id) as total_files_uploaded,
    COUNT(DISTINCT CASE WHEN lf.status = 'completed' THEN lf.id END) as successful_uploads,
    COUNT(DISTINCT CASE WHEN lf.status = 'failed' THEN lf.id END) as failed_uploads,
    COUNT(a.id) as total_anomalies_detected,
    AVG(CAST(a.risk_score AS DECIMAL)) as avg_risk_score,
    COUNT(DISTINCT CASE WHEN a.ai_provider = 'openai' THEN a.id END) as openai_detections,
    COUNT(DISTINCT CASE WHEN a.ai_provider = 'gcp_gemini' THEN a.id END) as gemini_detections,
    MAX(lf.uploaded_at) as last_upload,
    SUM(lf.file_size) as total_data_processed
FROM users u
LEFT JOIN log_files lf ON u.id = lf.user_id
LEFT JOIN anomalies a ON u.id = a.user_id
GROUP BY u.id, u.username;

-- Sample queries for metrics reporting
-- File upload success rate by day:
-- SELECT 
--     DATE(timestamp) as date,
--     COUNT(*) as total_uploads,
--     COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_uploads,
--     ROUND(COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
-- FROM metrics_events 
-- WHERE event_type = 'file_upload' 
-- GROUP BY DATE(timestamp)
-- ORDER BY date DESC;

-- AI provider performance comparison:
-- SELECT 
--     metadata->>'aiProvider' as provider,
--     COUNT(*) as total_analyses,
--     COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_analyses,
--     AVG(CAST(metadata->>'processingTime' AS INTEGER)) as avg_processing_time_ms
-- FROM metrics_events 
-- WHERE event_type = 'ai_analysis'
-- GROUP BY metadata->>'aiProvider';