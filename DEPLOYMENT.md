# Sentry Deployment Guide

This guide covers deploying Sentry to various cloud platforms including GCP, Azure, and AWS.

## Prerequisites

- Node.js 18+ runtime
- PostgreSQL database
- OpenAI API key
- Domain name (optional, for custom domains)

## Environment Variables

Required environment variables for all deployments:

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_secure_session_secret
PORT=5000
```

Optional environment variables:

```env
CORS_ORIGIN=https://yourdomain.com
MAX_FILE_SIZE=104857600
UPLOAD_TIMEOUT=300000
```

## Google Cloud Platform (GCP) Deployment

### Method 1: Cloud Run (Recommended)

1. **Build and containerize the application:**

```dockerfile
# Create Dockerfile in project root
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
```

2. **Deploy to Cloud Run:**

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/sentry

# Deploy to Cloud Run
gcloud run deploy sentry \
  --image gcr.io/YOUR_PROJECT_ID/sentry \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="your_database_url" \
  --set-env-vars OPENAI_API_KEY="your_openai_key" \
  --set-env-vars SESSION_SECRET="your_session_secret"
```

### Method 2: App Engine

1. **Create app.yaml:**

```yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  DATABASE_URL: your_database_url
  OPENAI_API_KEY: your_openai_key
  SESSION_SECRET: your_session_secret

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6

resources:
  cpu: 2
  memory_gb: 2
```

2. **Deploy:**

```bash
gcloud app deploy
```

### Database Setup (Cloud SQL)

```bash
# Create PostgreSQL instance
gcloud sql instances create logguard-db \
  --database-version=POSTGRES_14 \
  --region=us-central1 \
  --tier=db-f1-micro

# Create database
gcloud sql databases create logguard --instance=logguard-db

# Create user
gcloud sql users create logguard-user \
  --instance=logguard-db \
  --password=secure_password
```

## Microsoft Azure Deployment

### Method 1: Container Instances

1. **Build and push to Azure Container Registry:**

```bash
# Create resource group
az group create --name logguard-rg --location eastus

# Create container registry
az acr create --resource-group logguard-rg --name logguardacr --sku Basic

# Build and push image
az acr build --registry logguardacr --image logguard:latest .
```

2. **Deploy container instance:**

```bash
az container create \
  --resource-group logguard-rg \
  --name logguard-app \
  --image logguardacr.azurecr.io/logguard:latest \
  --dns-name-label logguard-unique \
  --ports 5000 \
  --environment-variables \
    NODE_ENV=production \
    DATABASE_URL="your_database_url" \
    OPENAI_API_KEY="your_openai_key" \
    SESSION_SECRET="your_session_secret"
```

### Method 2: App Service

1. **Create App Service plan:**

```bash
az appservice plan create \
  --name logguard-plan \
  --resource-group logguard-rg \
  --sku B1 \
  --is-linux
```

2. **Create web app:**

```bash
az webapp create \
  --resource-group logguard-rg \
  --plan logguard-plan \
  --name logguard-app \
  --deployment-container-image-name logguardacr.azurecr.io/logguard:latest
```

3. **Configure app settings:**

```bash
az webapp config appsettings set \
  --resource-group logguard-rg \
  --name logguard-app \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="your_database_url" \
    OPENAI_API_KEY="your_openai_key" \
    SESSION_SECRET="your_session_secret"
```

### Database Setup (Azure Database for PostgreSQL)

```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group logguard-rg \
  --name logguard-db-server \
  --location eastus \
  --admin-user logguardadmin \
  --admin-password SecurePassword123! \
  --sku-name GP_Gen5_2

# Create database
az postgres db create \
  --resource-group logguard-rg \
  --server-name logguard-db-server \
  --name logguard
```

## AWS Deployment

### Method 1: Elastic Beanstalk

1. **Install EB CLI and initialize:**

```bash
pip install awsebcli
eb init logguard --platform "Node.js 18 running on Amazon Linux 2023"
```

2. **Create .ebextensions/environment.config:**

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    DATABASE_URL: your_database_url
    OPENAI_API_KEY: your_openai_key
    SESSION_SECRET: your_session_secret
    PORT: 8080
```

3. **Deploy:**

```bash
eb create production
eb deploy
```

### Method 2: ECS with Fargate

1. **Create task definition:**

```json
{
  "family": "logguard-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "logguard",
      "image": "your-account.dkr.ecr.region.amazonaws.com/logguard:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DATABASE_URL", "value": "your_database_url"},
        {"name": "OPENAI_API_KEY", "value": "your_openai_key"},
        {"name": "SESSION_SECRET", "value": "your_session_secret"}
      ]
    }
  ]
}
```

2. **Create ECS service and deploy**

### Database Setup (RDS PostgreSQL)

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name logguard-subnet-group \
  --db-subnet-group-description "Subnet group for LogGuard" \
  --subnet-ids subnet-12345 subnet-67890

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier logguard-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.9 \
  --master-username logguardadmin \
  --master-user-password SecurePassword123! \
  --allocated-storage 20 \
  --db-name logguard \
  --db-subnet-group-name logguard-subnet-group
```

## Production Considerations

### Security

1. **Enable HTTPS:**
   - Use cloud provider's SSL/TLS certificates
   - Configure proper CORS origins
   - Enable security headers

2. **Database Security:**
   - Use connection pooling
   - Enable SSL connections
   - Restrict network access

3. **API Keys:**
   - Use cloud provider's secret management
   - Rotate keys regularly
   - Monitor usage

### Performance

1. **Scaling:**
   - Enable auto-scaling based on CPU/memory
   - Use load balancers for multiple instances
   - Configure proper health checks

2. **Monitoring:**
   - Set up application logging
   - Monitor API response times
   - Track OpenAI API usage and costs

3. **Caching:**
   - Consider Redis for session storage at scale
   - Implement response caching where appropriate

### Backup and Recovery

1. **Database Backups:**
   - Enable automated backups
   - Test restore procedures
   - Consider cross-region replication

2. **Application Backups:**
   - Version control all code
   - Document deployment procedures
   - Maintain rollback capabilities

## Domain and DNS Setup

### Custom Domain Configuration

1. **GCP:**
```bash
gcloud run domain-mappings create --service logguard --domain yourdomain.com
```

2. **Azure:**
```bash
az webapp config hostname add --webapp-name logguard-app --resource-group logguard-rg --hostname yourdomain.com
```

3. **AWS:**
```bash
# Configure Route 53 or use CloudFront distribution
```

### SSL Certificate

All major cloud providers offer managed SSL certificates:
- GCP: Google-managed SSL certificates
- Azure: App Service Managed Certificate
- AWS: AWS Certificate Manager

## Monitoring and Maintenance

### Health Checks

Implement health check endpoint at `/health`:

```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version 
  });
});
```

### Logging

Configure structured logging for production:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'logguard' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Cost Optimization

1. **Monitor resource usage regularly**
2. **Use appropriate instance sizes**
3. **Configure auto-scaling policies**
4. **Monitor OpenAI API costs**
5. **Implement request rate limiting**

For specific deployment questions or issues, refer to the respective cloud provider's documentation or contact support.