#!/bin/bash
set -e

# GCP Deployment Script for LogGuard
echo "🚀 Starting LogGuard deployment to GCP..."

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"your-project-id"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="logguard-app"
IMAGE_NAME="gcr.io/$PROJECT_ID/logguard"

# Check required tools
command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud CLI is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }

echo "📋 Using configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo "  Image: $IMAGE_NAME"

# Authenticate with GCP
echo "🔐 Authenticating with GCP..."
gcloud auth configure-docker

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sql-component.googleapis.com \
    secretmanager.googleapis.com \
    monitoring.googleapis.com

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
docker build -f Dockerfile.gcp -t $IMAGE_NAME:latest .
docker push $IMAGE_NAME:latest

# Create secrets in Secret Manager
echo "🔑 Creating secrets..."
echo -n "$OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=- --replication-policy="automatic" || echo "Secret already exists"
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --replication-policy="automatic" || echo "Secret already exists"
echo -n "$(openssl rand -base64 32)" | gcloud secrets create session-secret --data-file=- --replication-policy="automatic" || echo "Secret already exists"

# Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --concurrency 80 \
    --max-instances 10 \
    --set-env-vars NODE_ENV=production \
    --set-secrets OPENAI_API_KEY=openai-api-key:latest \
    --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
    --set-secrets SESSION_SECRET=session-secret:latest

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: $SERVICE_URL"
echo "📊 Monitoring: https://console.cloud.google.com/monitoring"
echo "🗄️ Cloud SQL: https://console.cloud.google.com/sql"

# Create monitoring dashboard
echo "📊 Setting up monitoring dashboard..."
cat > monitoring-dashboard.json << EOF
{
  "displayName": "LogGuard Application Metrics",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Count",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Response Latency",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_DELTA"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.json

echo "🎉 LogGuard is now running on GCP!"
echo "📖 View logs: gcloud logs tail --follow"
echo "🔍 Debug: gcloud run services describe $SERVICE_NAME --region $REGION"