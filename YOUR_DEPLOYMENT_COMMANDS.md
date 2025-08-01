# Deploy Sentry to Google Cloud Platform

## Prerequisites
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Have a GCP project ready (or create one)
3. Enable billing on your project

## Quick Deployment

### Option 1: Interactive Migration (Recommended)
```bash
# Run the interactive migration script
./scripts/migrate-to-gcp.sh
```
This will guide you through the entire process step by step.

### Option 2: Manual Deployment
```bash
# Set your project ID
export PROJECT_ID="your-project-id-here"
export REGION="us-central1"

# Authenticate
gcloud auth login
gcloud auth configure-docker

# Set project
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com

# Deploy
./scripts/deploy-gcp.sh $PROJECT_ID $REGION
```

## After Deployment

1. **Get your service URL:**
```bash
gcloud run services describe sentry-log-analysis --region us-central1 --format 'value(status.url)'
```

2. **Update secrets with your database:**
```bash
# Create secrets file
cat > secrets.json << EOF
{
  "database-url": "your_neon_database_url_here",
  "session-secret": "$(openssl rand -base64 32)",
  "repl-id": "sentry-gcp",
  "deployment-token": "gcp-$(date +%s)"
}
EOF

# Update secrets
gcloud secrets versions add sentry-secrets --data-file=secrets.json
rm secrets.json
```

3. **Test your deployment:**
Visit your service URL and verify all features work.

## Cost Estimate
- Cloud Run: $5-15/month (based on usage)
- Container Registry: Free (under 0.5GB)
- Secret Manager: ~$0.06 per 10K operations
- **Total: ~$5-15/month** (vs Replit's $20+/month)

## Monitoring
- Logs: `gcloud logs tail --follow`
- Console: https://console.cloud.google.com/run
- Metrics: Available in Cloud Run console

Your Sentry application will be deployed with all features intact:
- Log file upload and processing
- AI-powered anomaly detection
- Dashboard and analytics
- User authentication
- Rate limiting and security