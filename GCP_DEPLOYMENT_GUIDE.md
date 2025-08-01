# Deploy Sentry to Google Cloud Platform

This guide will walk you through deploying Sentry to GCP step by step.

## Prerequisites

1. **Google Cloud Account** - Sign up at https://cloud.google.com
2. **Google Cloud SDK** - Install from https://cloud.google.com/sdk/docs/install
3. **Enable Billing** - Required for Cloud Run and other services

## Step 1: Set Up Your GCP Project

### Create a New Project
```bash
# Create a new project (replace with your preferred project ID)
gcloud projects create sentry-log-analysis-123 --name="Sentry Log Analysis"

# Set as your active project
gcloud config set project sentry-log-analysis-123

# Enable billing (you'll need to do this in the console)
echo "Visit https://console.cloud.google.com/billing to enable billing"
```

### Enable Required APIs
```bash
# Enable the APIs we need
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## Step 2: Set Up Authentication

```bash
# Authenticate with Google Cloud
gcloud auth login

# Configure Docker authentication
gcloud auth configure-docker
```

## Step 3: Prepare Your Environment

### Clone and Prepare the Code
```bash
# If you haven't already, clone the repository
git clone <your-repo-url>
cd sentry

# Copy environment template
cp .env.example .env

# Edit .env with your settings (optional for basic deployment)
nano .env
```

## Step 4: Deploy Using Our Automated Script

### Option A: Quick Deployment (Recommended)
```bash
# Make the script executable
chmod +x scripts/deploy-gcp.sh

# Run the deployment script with your project ID
./scripts/deploy-gcp.sh your-project-id-here us-central1

# Example:
./scripts/deploy-gcp.sh sentry-log-analysis-123 us-central1
```

The script will:
- ✅ Build and push your container to Google Container Registry
- ✅ Create necessary secrets in Secret Manager
- ✅ Deploy to Cloud Run with proper configuration
- ✅ Set up health checks and auto-scaling
- ✅ Provide you with the service URL

### Option B: Manual Step-by-Step Deployment

If you prefer to understand each step:

#### Build and Push Container
```bash
# Build and push the container
gcloud builds submit --tag gcr.io/your-project-id/sentry-log-analysis
```

#### Create Secrets
```bash
# Create secret for sensitive data
gcloud secrets create sentry-secrets

# Add database URL (you can update this later)
echo "postgresql://user:pass@host:5432/db" | gcloud secrets versions add sentry-secrets --data-file=-
```

#### Deploy to Cloud Run
```bash
# Deploy using our YAML configuration
sed "s/PROJECT_ID/your-project-id/g" gcp-deployment.yaml > temp-deployment.yaml
gcloud run services replace temp-deployment.yaml --region us-central1
rm temp-deployment.yaml
```

## Step 5: Configure Your Deployment

### Update Secrets (Important!)
```bash
# Create a secrets file
cat > secrets.json << EOF
{
  "database-url": "postgresql://username:password@host:5432/database",
  "session-secret": "your-32-character-random-string-here",
  "repl-id": "your-repl-id",
  "deployment-token": "your-deployment-token"
}
EOF

# Update the secrets
gcloud secrets versions add sentry-secrets --data-file=secrets.json

# Clean up the secrets file
rm secrets.json
```

### Get Your Service URL
```bash
# Get the URL of your deployed service
gcloud run services describe sentry-log-analysis --region us-central1 --format 'value(status.url)'
```

## Step 6: Set Up Database (Optional)

### Create Cloud SQL Instance
```bash
# Create PostgreSQL instance
gcloud sql instances create sentry-db \
  --database-version=POSTGRES_14 \
  --region=us-central1 \
  --tier=db-f1-micro

# Create database
gcloud sql databases create sentry_db --instance=sentry-db

# Create user
gcloud sql users create sentry_user \
  --instance=sentry-db \
  --password=secure_password_here
```

### Update Database URL
```bash
# Get connection details
gcloud sql instances describe sentry-db --format="value(connectionName)"

# Update your secrets with the Cloud SQL connection string
# Format: postgresql://username:password@/database?host=/cloudsql/PROJECT:REGION:INSTANCE
```

## Step 7: Custom Domain (Optional)

```bash
# Map a custom domain
gcloud run domain-mappings create \
  --service=sentry-log-analysis \
  --domain=sentry.yourdomain.com \
  --region=us-central1
```

## Step 8: Monitor Your Deployment

### View Logs
```bash
# View real-time logs
gcloud logs tail --follow

# View service-specific logs
gcloud logs tail --follow --filter="resource.type=cloud_run_revision AND resource.labels.service_name=sentry-log-analysis"
```

### Access Monitoring
- Visit: https://console.cloud.google.com/run
- Click on your service: `sentry-log-analysis`
- View metrics, logs, and configuration

## Troubleshooting

### Common Issues

**Build Fails**
```bash
# Check build logs
gcloud builds log --region=us-central1
```

**Service Won't Start**
```bash
# Check service logs
gcloud logs tail --follow --filter="resource.type=cloud_run_revision"
```

**Authentication Issues**
```bash
# Re-authenticate
gcloud auth login
gcloud auth configure-docker
```

**Secret Access Issues**
```bash
# Grant Cloud Run access to secrets
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:your-project-number-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Useful Commands

```bash
# Update service configuration
gcloud run services update sentry-log-analysis --region us-central1

# Scale service
gcloud run services update sentry-log-analysis \
  --min-instances=1 \
  --max-instances=10 \
  --region us-central1

# Delete service (if needed)
gcloud run services delete sentry-log-analysis --region us-central1
```

## Cost Optimization

- **Cloud Run**: Pay only for requests (free tier: 2M requests/month)
- **Cloud SQL**: Use `db-f1-micro` for testing ($7/month)
- **Container Registry**: Free tier: 0.5GB storage
- **Secret Manager**: $0.06 per 10,000 operations

## Next Steps

1. **Test Your Deployment**: Visit your service URL
2. **Upload Test Logs**: Try the example files in `example-logs/`
3. **Add API Keys**: Configure OpenAI or Google AI keys for enhanced analysis
4. **Set Up Monitoring**: Configure alerts and dashboards
5. **Custom Domain**: Point your domain to the service

## Support

- **View Deployment**: https://console.cloud.google.com/run
- **Logs**: `gcloud logs tail --follow`
- **Billing**: https://console.cloud.google.com/billing
- **Documentation**: https://cloud.google.com/run/docs

Your Sentry deployment should now be live and ready to analyze security logs!