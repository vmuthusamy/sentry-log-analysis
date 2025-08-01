#!/bin/bash

# Quick Deployment Commands for Sentry on GCP
# Copy and paste these commands one by one

echo "=== Sentry GCP Deployment Commands ==="
echo ""

# Step 1: Set your project ID (CHANGE THIS!)
PROJECT_ID="sentry-log-analysis-$(date +%s)"
echo "1. Create and set project:"
echo "gcloud projects create $PROJECT_ID --name='Sentry Log Analysis'"
echo "gcloud config set project $PROJECT_ID"
echo ""

# Step 2: Enable APIs
echo "2. Enable required APIs:"
echo "gcloud services enable cloudbuild.googleapis.com"
echo "gcloud services enable run.googleapis.com" 
echo "gcloud services enable secretmanager.googleapis.com"
echo ""

# Step 3: Build and deploy
echo "3. Build and deploy:"
echo "gcloud builds submit --tag gcr.io/$PROJECT_ID/sentry-log-analysis"
echo ""

# Step 4: Create secrets
echo "4. Create secrets:"
echo "gcloud secrets create sentry-secrets"
echo "echo 'postgresql://user:pass@host:5432/db' | gcloud secrets versions add sentry-secrets --data-file=-"
echo ""

# Step 5: Deploy service
echo "5. Deploy to Cloud Run:"
echo "sed 's/PROJECT_ID/$PROJECT_ID/g' gcp-deployment.yaml > temp-deployment.yaml"
echo "gcloud run services replace temp-deployment.yaml --region us-central1"
echo "rm temp-deployment.yaml"
echo ""

# Step 6: Get URL
echo "6. Get your service URL:"
echo "gcloud run services describe sentry-log-analysis --region us-central1 --format 'value(status.url)'"
echo ""

echo "=== OR Use Our Automated Script ==="
echo "./scripts/deploy-gcp.sh $PROJECT_ID us-central1"
echo ""

echo "Note: Replace $PROJECT_ID with your preferred project ID"
echo "Enable billing at: https://console.cloud.google.com/billing"