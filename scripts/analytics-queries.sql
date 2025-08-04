-- Corrected Analytics Queries for Sentry Log Analysis System
-- Updated: August 4, 2025

-- 1. User Activity Summary (configurable time window)
-- Usage: Replace 'X hours' with desired timeframe (e.g., '24 hours', '48 hours', '7 days')
SELECT 
  'Activity Summary' as report_type,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.last_login_at > NOW() - INTERVAL 'X hours' THEN u.id END) as active_users,
  COUNT(DISTINCT CASE WHEN lf.uploaded_at > NOW() - INTERVAL 'X hours' THEN lf.user_id END) as uploading_users,
  COUNT(CASE WHEN lf.uploaded_at > NOW() - INTERVAL 'X hours' THEN 1 END) as new_uploads,
  COUNT(CASE WHEN a.created_at > NOW() - INTERVAL 'X hours' THEN 1 END) as new_anomalies,
  COUNT(CASE WHEN wi.last_triggered > NOW() - INTERVAL 'X hours' THEN 1 END) as webhook_triggers
FROM users u
LEFT JOIN log_files lf ON u.id = lf.user_id
LEFT JOIN anomalies a ON u.id = a.user_id
LEFT JOIN webhook_integrations wi ON u.id = wi.user_id;

-- 2. Recent File Uploads (last N hours)
-- Usage: Replace 'X hours' with desired timeframe
SELECT 
  lf.id,
  lf.user_id,
  u.email,
  lf.filename,
  lf.file_size,
  lf.uploaded_at,
  lf.status,
  lf.total_logs,
  EXTRACT(EPOCH FROM (NOW() - lf.uploaded_at))/3600 as hours_ago,
  EXTRACT(EPOCH FROM (NOW() - lf.uploaded_at))/60 as minutes_ago
FROM log_files lf
JOIN users u ON lf.user_id = u.id
WHERE lf.uploaded_at > NOW() - INTERVAL 'X hours'
ORDER BY lf.uploaded_at DESC;

-- 3. New User Signups (last N hours)
-- Usage: Replace 'X hours' with desired timeframe
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.created_at,
  u.last_login_at,
  EXTRACT(EPOCH FROM (NOW() - u.created_at))/3600 as hours_since_signup,
  COUNT(lf.id) as files_uploaded,
  COUNT(a.id) as anomalies_found
FROM users u
LEFT JOIN log_files lf ON u.id = lf.user_id
LEFT JOIN anomalies a ON u.id = a.user_id
WHERE u.created_at > NOW() - INTERVAL 'X hours'
GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.last_login_at
ORDER BY u.created_at DESC;

-- 4. System Activity Breakdown (hourly buckets for last N hours)
-- Usage: Replace 'X hours' with desired timeframe
SELECT 
  DATE_TRUNC('hour', activity_time) as hour_bucket,
  activity_type,
  COUNT(*) as count
FROM (
  SELECT uploaded_at as activity_time, 'file_upload' as activity_type FROM log_files
  UNION ALL
  SELECT created_at as activity_time, 'anomaly_detected' as activity_type FROM anomalies
  UNION ALL
  SELECT last_triggered as activity_time, 'webhook_triggered' as activity_type FROM webhook_integrations WHERE last_triggered IS NOT NULL
  UNION ALL
  SELECT created_at as activity_time, 'user_signup' as activity_type FROM users
) activities
WHERE activity_time > NOW() - INTERVAL 'X hours'
GROUP BY DATE_TRUNC('hour', activity_time), activity_type
ORDER BY hour_bucket DESC, activity_type;

-- 5. User Engagement Metrics (comprehensive view)
-- Usage: Replace 'X hours' with desired timeframe
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as signup_date,
  u.last_login_at,
  COUNT(DISTINCT lf.id) as total_files_uploaded,
  COUNT(DISTINCT CASE WHEN lf.uploaded_at > NOW() - INTERVAL 'X hours' THEN lf.id END) as recent_files,
  COUNT(DISTINCT a.id) as total_anomalies,
  COUNT(DISTINCT CASE WHEN a.created_at > NOW() - INTERVAL 'X hours' THEN a.id END) as recent_anomalies,
  COUNT(DISTINCT wi.id) as webhook_integrations_configured,
  COALESCE(SUM(wi.total_triggers), 0) as total_webhook_triggers,
  MAX(lf.uploaded_at) as last_file_upload,
  MAX(a.created_at) as last_anomaly_detected,
  CASE 
    WHEN u.last_login_at > NOW() - INTERVAL '1 hour' THEN 'Very Active'
    WHEN u.last_login_at > NOW() - INTERVAL '24 hours' THEN 'Active'
    WHEN u.last_login_at > NOW() - INTERVAL '7 days' THEN 'Recent'
    ELSE 'Inactive'
  END as activity_level
FROM users u
LEFT JOIN log_files lf ON u.id = lf.user_id
LEFT JOIN anomalies a ON u.id = a.user_id
LEFT JOIN webhook_integrations wi ON u.id = wi.user_id
GROUP BY u.id, u.email, u.created_at, u.last_login_at
ORDER BY u.last_login_at DESC NULLS LAST;

-- 6. Quick Status Check (all timeframes)
SELECT 
  'System Status' as metric,
  NOW() as current_time,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM log_files) as total_files,
  (SELECT COUNT(*) FROM anomalies) as total_anomalies,
  (SELECT COUNT(*) FROM webhook_integrations) as total_webhooks,
  -- Recent activity counts
  (SELECT COUNT(*) FROM log_files WHERE uploaded_at > NOW() - INTERVAL '1 hour') as files_last_1h,
  (SELECT COUNT(*) FROM log_files WHERE uploaded_at > NOW() - INTERVAL '24 hours') as files_last_24h,
  (SELECT COUNT(*) FROM log_files WHERE uploaded_at > NOW() - INTERVAL '7 days') as files_last_7d,
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as signups_last_24h,
  (SELECT COUNT(*) FROM anomalies WHERE created_at > NOW() - INTERVAL '24 hours') as anomalies_last_24h;