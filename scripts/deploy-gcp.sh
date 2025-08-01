#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# GCP Deployment Script for Sentry
echo -e "${BLUE}🚀 Starting Sentry deployment to Google Cloud Platform${NC}"
echo -e "${BLUE}=================================================${NC}"

# Configuration
PROJECT_ID=${1:-"808363033614"}
REGION=${2:-"us-central1"}
SERVICE_NAME="sentry-log-analysis"
IMAGE_NAME="gcr.io/$PROJECT_ID/sentry-log-analysis"

# Check required tools
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install Google Cloud SDK.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Using configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo "  Image: $IMAGE_NAME"
echo ""

# Check if project exists
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo -e "${RED}❌ Project $PROJECT_ID not found or not accessible.${NC}"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com --project $PROJECT_ID
gcloud services enable run.googleapis.com --project $PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project $PROJECT_ID

# Build and push container
echo -e "${YELLOW}🔨 Building container image...${NC}"
gcloud builds submit --tag $IMAGE_NAME --project $PROJECT_ID

# Create secrets (if they don't exist)
echo -e "${YELLOW}🔐 Setting up secrets...${NC}"
SECRET_NAME="sentry-secrets"

# Check if secret already exists
if ! gcloud secrets describe $SECRET_NAME --project $PROJECT_ID &> /dev/null; then
    echo "Creating secret manager secret..."
    gcloud secrets create $SECRET_NAME --project $PROJECT_ID
    
    # Add placeholder values (user needs to update these)
    echo "your_database_url_here" | gcloud secrets versions add $SECRET_NAME --data-file=- --project $PROJECT_ID
fi

# Deploy using YAML configuration
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
# Replace PROJECT_ID in the YAML file
sed "s/PROJECT_ID/$PROJECT_ID/g" gcp-deployment.yaml > temp-deployment.yaml
gcloud run services replace temp-deployment.yaml --region $REGION --project $PROJECT_ID
rm temp-deployment.yaml

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)' --project $PROJECT_ID)

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
echo -e "${BLUE}📊 Monitoring: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID${NC}"
echo ""
echo -e "${YELLOW}⚙️ Next steps:${NC}"
echo "1. Update secrets in Google Secret Manager:"
echo "   gcloud secrets versions add sentry-secrets --data-file=secrets.json --project $PROJECT_ID"
echo "2. Set up Cloud SQL database (optional):"
echo "   gcloud sql instances create sentry-db --database-version=POSTGRES_14 --region=$REGION --project $PROJECT_ID"
echo "3. Configure custom domain (optional):"
echo "   gcloud run domain-mappings create --service=$SERVICE_NAME --domain=yourdomain.com --region=$REGION --project $PROJECT_ID"
echo "4. View logs:"
echo "   gcloud logs tail --follow --project=$PROJECT_ID"
echo ""
echo -e "${GREEN}🎉 Sentry is now running on GCP Cloud Run!${NC}"
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