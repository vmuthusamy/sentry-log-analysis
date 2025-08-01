#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Migration Script: Replit to GCP
echo -e "${BLUE}🚀 Migrating Sentry from Replit to Google Cloud Platform${NC}"
echo -e "${BLUE}======================================================${NC}"

# Collect user input
echo -e "${YELLOW}📋 Migration Configuration${NC}"
read -p "Enter your GCP Project ID (or press Enter for auto-generation): " PROJECT_ID
read -p "Enter GCP Region (default: us-central1): " REGION
read -p "Enter your database URL (current Neon DB or new Cloud SQL): " DATABASE_URL
read -p "Would you like to create a new Cloud SQL database? (y/n): " CREATE_DB

# Set defaults
PROJECT_ID=${PROJECT_ID:-"sentry-$(date +%s)"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="sentry-log-analysis"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo -e "${BLUE}📊 Migration Summary:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME" 
echo "  Database: ${CREATE_DB,,}"
echo ""

# Verify gcloud installation
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Installing...${NC}"
    curl https://sdk.cloud.google.com | bash
    exec -l $SHELL
fi

# Create project if it doesn't exist
echo -e "${YELLOW}🏗️  Setting up GCP project...${NC}"
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo "Creating new project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID --name="Sentry Log Analysis"
else
    echo "Using existing project: $PROJECT_ID"
fi

# Set active project
gcloud config set project $PROJECT_ID

# Check billing
echo -e "${YELLOW}💳 Checking billing...${NC}"
if ! gcloud billing accounts list --format="value(name)" | head -1 &> /dev/null; then
    echo -e "${RED}❌ No billing account found. Please set up billing:${NC}"
    echo "   https://console.cloud.google.com/billing"
    exit 1
fi

# Link billing account
BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" | head -1)
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT

# Enable APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com  
gcloud services enable secretmanager.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Create Cloud SQL database if requested
if [[ "${CREATE_DB,,}" == "y" ]]; then
    echo -e "${YELLOW}🗄️  Creating Cloud SQL database...${NC}"
    
    DB_INSTANCE="sentry-db"
    DB_NAME="sentry_db"
    DB_USER="sentry_user"
    DB_PASSWORD=$(openssl rand -base64 20)
    
    # Create instance
    gcloud sql instances create $DB_INSTANCE \
        --database-version=POSTGRES_14 \
        --region=$REGION \
        --tier=db-f1-micro \
        --storage-size=10GB \
        --storage-type=SSD
    
    # Create database
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE
    
    # Create user
    gcloud sql users create $DB_USER \
        --instance=$DB_INSTANCE \
        --password=$DB_PASSWORD
    
    # Get connection name
    CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)")
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=/cloudsql/$CONNECTION_NAME"
    
    echo -e "${GREEN}✅ Database created successfully${NC}"
    echo "   Instance: $DB_INSTANCE"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
fi

# Create secrets
echo -e "${YELLOW}🔐 Setting up secrets...${NC}"
SECRET_NAME="sentry-secrets"

# Create secret if it doesn't exist
if ! gcloud secrets describe $SECRET_NAME &> /dev/null; then
    gcloud secrets create $SECRET_NAME
fi

# Create secrets JSON
cat > temp-secrets.json << EOF
{
  "database-url": "$DATABASE_URL",
  "session-secret": "$(openssl rand -base64 32)",
  "repl-id": "$SERVICE_NAME",
  "deployment-token": "gcp-$(date +%s)"
}
EOF

# Add secrets
gcloud secrets versions add $SECRET_NAME --data-file=temp-secrets.json
rm temp-secrets.json

echo -e "${GREEN}✅ Secrets configured${NC}"

# Build and deploy
echo -e "${YELLOW}🔨 Building and deploying application...${NC}"

# Build using Cloud Build
gcloud builds submit --tag $IMAGE_NAME --timeout=20m

# Deploy to Cloud Run
sed "s/PROJECT_ID/$PROJECT_ID/g" gcp-deployment.yaml > temp-deployment.yaml
gcloud run services replace temp-deployment.yaml --region $REGION
rm temp-deployment.yaml

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

# Run database migrations
echo -e "${YELLOW}📊 Running database migrations...${NC}"
if [[ -n "$DATABASE_URL" ]]; then
    # Create a temporary Cloud Run job to run migrations
    gcloud run jobs create migrate-db \
        --image $IMAGE_NAME \
        --region $REGION \
        --set-env-vars DATABASE_URL="$DATABASE_URL" \
        --command="npm,run,db:push" \
        --max-retries=1 \
        --parallelism=1 \
        --task-count=1
    
    gcloud run jobs execute migrate-db --region $REGION --wait
    gcloud run jobs delete migrate-db --region $REGION --quiet
fi

echo ""
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"
echo -e "${BLUE}📊 Monitoring: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID${NC}"
echo -e "${BLUE}🗄️  Database: https://console.cloud.google.com/sql/instances?project=$PROJECT_ID${NC}"
echo ""

# Cost estimation
echo -e "${YELLOW}💰 Estimated Monthly Costs:${NC}"
echo "   Cloud Run: ~$5-15 (based on usage)"
if [[ "${CREATE_DB,,}" == "y" ]]; then
    echo "   Cloud SQL (db-f1-micro): ~$7"
fi
echo "   Container Registry: Free (under 0.5GB)"
echo "   Secret Manager: ~$0.06 per 10K operations"
echo "   Total: ~$12-22/month (vs Replit's $20+/month)"
echo ""

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Test your deployment: $SERVICE_URL"
echo "2. Upload test log files to verify functionality"
echo "3. Configure custom domain (optional):"
echo "   gcloud run domain-mappings create --service=$SERVICE_NAME --domain=yourdomain.com --region=$REGION"
echo "4. Set up monitoring alerts"
echo "5. Update DNS to point to new URL"
echo "6. Notify users of migration"
echo ""

echo -e "${BLUE}🔍 Useful Commands:${NC}"
echo "   View logs: gcloud logs tail --follow --project=$PROJECT_ID"
echo "   Update service: gcloud run services update $SERVICE_NAME --region $REGION"
echo "   Scale service: gcloud run services update $SERVICE_NAME --min-instances=0 --max-instances=10 --region $REGION"
echo "   Delete service: gcloud run services delete $SERVICE_NAME --region $REGION"
echo ""

echo -e "${GREEN}🚀 Your Sentry application is now running on GCP!${NC}"
echo -e "${GREEN}Cost-effective, scalable, and ready for production.${NC}"