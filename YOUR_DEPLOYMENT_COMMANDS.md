# Deploy Sentry to Your GCP Project

Project ID: `808363033614`

## Prerequisites
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Ensure billing is enabled for your project

## Step-by-Step Commands

### 1. Authenticate and Set Project
```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project 808363033614

# Configure Docker authentication
gcloud auth configure-docker
```

### 2. Enable Required APIs
```bash
gcloud services enable cloudbuild.googleapis.com --project 808363033614
gcloud services enable run.googleapis.com --project 808363033614
gcloud services enable secretmanager.googleapis.com --project 808363033614
```

### 3. Quick Deploy (Recommended)
```bash
# Make deploy script executable
chmod +x scripts/deploy-gcp.sh

# Deploy Sentry to your project
./scripts/deploy-gcp.sh 808363033614 us-central1
```

### 4. Manual Commands (Alternative)
If you prefer step-by-step:

```bash
# Build and push container
gcloud builds submit --tag gcr.io/808363033614/sentry-log-analysis --project 808363033614

# Create secrets
gcloud secrets create sentry-secrets --project 808363033614
echo "postgresql://user:pass@host:5432/db" | gcloud secrets versions add sentry-secrets --data-file=- --project 808363033614

# Deploy to Cloud Run
sed 's/PROJECT_ID/808363033614/g' gcp-deployment.yaml > temp-deployment.yaml
gcloud run services replace temp-deployment.yaml --region us-central1 --project 808363033614
rm temp-deployment.yaml

# Get your service URL
gcloud run services describe sentry-log-analysis --region us-central1 --format 'value(status.url)' --project 808363033614
```

## After Deployment

### Update Secrets (Optional)
```bash
# Create secrets file with real values
cat > secrets.json << 'EOF'
{
  "database-url": "postgresql://your_db_user:your_password@your_host:5432/your_database",
  "session-secret": "your-32-character-random-string-for-sessions",
  "repl-id": "your-repl-id-if-needed",
  "deployment-token": "your-deployment-token-if-needed"
}
EOF

# Update secrets
gcloud secrets versions add sentry-secrets --data-file=secrets.json --project 808363033614

# Clean up
rm secrets.json
```

### Monitor Your Deployment
```bash
# View logs
gcloud logs tail --follow --project 808363033614

# Check service status
gcloud run services describe sentry-log-analysis --region us-central1 --project 808363033614
```

## Expected Results

After successful deployment:
- Service URL: `https://sentry-log-analysis-[hash]-uc.a.run.app`
- Auto-scaling: 1-10 instances
- Health checks: Configured
- Secrets: Managed securely

## Troubleshooting

If build fails:
```bash
gcloud builds log --region=us-central1 --project 808363033614
```

If service won't start:
```bash
gcloud logs tail --follow --filter="resource.type=cloud_run_revision" --project 808363033614
```

## Access Your Deployment

1. Visit: https://console.cloud.google.com/run?project=808363033614
2. Click on `sentry-log-analysis`
3. View metrics, logs, and get the live URL

Your Sentry application will be live and ready to analyze security logs!