# Migrating Sentry from Replit to Google Cloud Platform

## Cost Comparison

**Replit Costs:**
- Replit Core: $20/month per editor
- Replit Deployments: Additional fees for hosting
- Database: Included but limited

**GCP Costs (Estimated):**
- Cloud Run: $0.000024/request + CPU/memory costs (~$5-15/month for typical usage)
- Cloud SQL (db-f1-micro): $7/month
- Container Registry: Free tier 0.5GB storage
- Total estimated: **$12-22/month** vs Replit's $20+/month

## Quick Migration Steps

### 1. Prerequisites Setup

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login
gcloud auth configure-docker

# Create or select project
gcloud projects create your-sentry-project-id
gcloud config set project your-sentry-project-id

# Enable billing at: https://console.cloud.google.com/billing
```

### 2. Database Migration

**Option A: Use Neon Database (Recommended for quick migration)**
- Keep your existing Neon database
- Update connection string in GCP secrets
- No data migration needed

**Option B: Migrate to Cloud SQL**
```bash
# Create Cloud SQL instance
gcloud sql instances create sentry-db \
  --database-version=POSTGRES_14 \
  --region=us-central1 \
  --tier=db-f1-micro

# Export from current database
pg_dump $DATABASE_URL > sentry_backup.sql

# Import to Cloud SQL
gcloud sql import sql sentry-db sentry_backup.sql
```

### 3. One-Command Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy-gcp.sh

# Deploy (replace with your project ID)
./scripts/deploy-gcp.sh your-project-id us-central1
```

### 4. Configure Secrets

```bash
# Create secrets configuration
cat > secrets.json << EOF
{
  "database-url": "your_neon_or_cloudsql_url",
  "session-secret": "$(openssl rand -base64 32)",
  "repl-id": "your-app-name",
  "deployment-token": "gcp-deployment-$(date +%s)"
}
EOF

# Update secrets in GCP
gcloud secrets versions add sentry-secrets --data-file=secrets.json
rm secrets.json
```

### 5. Domain Setup (Optional)

```bash
# Point your domain to GCP
gcloud run domain-mappings create \
  --service=sentry-log-analysis \
  --domain=sentry.yourdomain.com \
  --region=us-central1
```

## API Keys Migration

Your OpenAI and other API keys will work the same way in GCP. The application will:
- Use the same user API key management system
- Store keys in the database (encrypted)
- No changes needed to existing functionality

## Features That Work Out of Box

✅ **All Sentry Features:**
- Log file upload and analysis
- Traditional ML, Advanced ML, and AI-powered detection
- User authentication (Replit SSO will be replaced with simple login)
- Dashboard and analytics
- Risk scoring and anomaly detection
- Rate limiting and security features

✅ **Performance Benefits:**
- Better auto-scaling
- Global CDN
- Faster cold starts
- More reliable uptime

## Authentication Changes

**Current (Replit):** Uses Replit OpenID Connect
**New (GCP):** Will use email/password authentication

Users will need to:
1. Create new accounts on your GCP deployment
2. Re-upload their log files (if desired)
3. Re-configure their API keys

## Monitoring and Logs

```bash
# View application logs
gcloud logs tail --follow

# View service metrics
gcloud run services describe sentry-log-analysis --region us-central1

# Access monitoring dashboard
# Visit: https://console.cloud.google.com/run
```

## Rollback Plan

If you need to rollback to Replit:
1. Keep your Replit deployment running during migration
2. Test GCP deployment thoroughly
3. Update DNS only after confirming GCP works
4. Keep database backups before any migrations

## Cost Optimization Tips

1. **Use Cloud Run's pay-per-request model**
2. **Set appropriate memory/CPU limits** (current config: 2GB RAM, 1 CPU)
3. **Use minimum instances: 0** for lower costs (current: 1 for better performance)
4. **Monitor usage** via GCP billing dashboard
5. **Use db-f1-micro** for Cloud SQL (cheapest option)

## Next Steps After Migration

1. **Test all functionality** with sample log files
2. **Update any hardcoded URLs** in documentation
3. **Set up monitoring alerts** for uptime and errors
4. **Configure backups** for database
5. **Update DNS** to point to GCP service URL
6. **Notify users** of the migration and new URL

## Support During Migration

- **Deployment logs:** `gcloud logs tail --follow`
- **Service status:** Check Cloud Run console
- **Database issues:** Verify connection strings in secrets
- **Build failures:** Check Cloud Build logs

Your GCP deployment will be more cost-effective and provide better scalability than Replit hosting.